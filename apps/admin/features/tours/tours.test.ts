import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const boundary = vi.hoisted(() => ({
  session: "",
  tenant: "",
  catalog: vi.fn(),
  detail: vi.fn(),
  mutate: vi.fn(),
  revalidate: vi.fn(),
}));
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => ({
      value: name === "nomera_session" ? boundary.session : boundary.tenant,
    }),
  }),
}));
vi.mock("next/cache", () => ({ revalidatePath: boundary.revalidate }));
vi.mock("@nomera/postgres/server/tours", () => ({
  getTourCatalog: boundary.catalog,
  getTourDetail: boundary.detail,
  mutateTour: boundary.mutate,
}));

import { DomainError } from "@nomera/domain/errors";
import { formatMoney } from "@/lib/format-money";
import { GET as detailGET } from "../../app/api/tours/[tourId]/route";
import { GET as catalogGET } from "../../app/api/tours/route";
import { submitTourMutation } from "./actions";
import { clearTourDrafts, readStoredTourDraft } from "./draft";
import { catalogFilter, majorToMinor } from "./request";

const id = "11111111-1111-4111-8111-111111111111";
const create = {
  type: "create",
  operationId: id,
  data: {
    code: "GOBI",
    title: "Gobi route",
    destination: "Gobi",
    category: "Nature",
    durationDays: 1,
    description: "",
    basePriceMinor: 1050,
    currency: "MNT",
    itinerary: [],
    media: [],
  },
};
beforeEach(() => {
  vi.resetAllMocks();
  boundary.session = "session";
  boundary.tenant = id;
  boundary.catalog.mockResolvedValue({ tenantId: id });
  boundary.detail.mockResolvedValue({ id });
  boundary.mutate.mockResolvedValue({ id });
});

describe("Tours HTTP and Server Action authority", () => {
  it("reads only the cookie-selected tenant and makes responses private", async () => {
    boundary.catalog.mockImplementation(
      async (session: string, tenant: string) => {
        if (session !== "session" || tenant !== id)
          throw new DomainError("FORBIDDEN");
        return { tenantId: tenant, total: 1 };
      },
    );
    const response = await catalogGET(
      new Request("https://nomera.example/api/tours?status=draft&page=2"),
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ data: { tenantId: id, total: 1 } });
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    expect(response.headers.get("Vary")).toBe("Cookie");
  });
  it.each([
    "tenantId=foreign",
    "role=owner",
    "page=0",
    "page=1&page=2",
    "page=NaN",
    "pageSize=51",
    "currency=USD",
  ])("rejects invalid or forged catalog query %s", async (query) => {
    const response = await catalogGET(
      new Request(`https://nomera.example/api/tours?${query}`),
    );
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({
      error: { code: "VALIDATION_ERROR" },
    });
  });
  it("rejects reads and writes without cookie authority", async () => {
    boundary.session = "";
    expect(
      (await catalogGET(new Request("https://nomera.example/api/tours")))
        .status,
    ).toBe(401);
    expect(
      (
        await detailGET(new Request("https://nomera.example/api/tours/one"), {
          params: Promise.resolve({ tourId: id }),
        })
      ).status,
    ).toBe(401);
    expect(await submitTourMutation(create)).toMatchObject({
      ok: false,
      code: "UNAUTHENTICATED",
    });
    boundary.session = "session";
    boundary.tenant = "";
    expect(await submitTourMutation(create)).toMatchObject({
      ok: false,
      code: "FORBIDDEN",
    });
    expect(boundary.mutate).not.toHaveBeenCalled();
  });
  it("rejects injected tenant and role fields in mutation commands", async () => {
    expect(
      await submitTourMutation({
        ...create,
        tenantId: "foreign",
        role: "owner",
      }),
    ).toMatchObject({ ok: false, code: "VALIDATION_ERROR" });
    expect(boundary.mutate).not.toHaveBeenCalled();
  });
  it("reports validation paths without echoing submitted values", async () => {
    expect(
      await submitTourMutation({
        ...create,
        data: { ...create.data, code: "unsafe secret !" },
      }),
    ).toEqual({ ok: false, code: "VALIDATION_ERROR", fields: ["data.code"] });
  });
  it("binds writes to the cookie identity and revalidates saved routes", async () => {
    boundary.mutate.mockImplementation(
      async (session: string, tenant: string, command: unknown) => {
        if (
          session !== "session" ||
          tenant !== id ||
          JSON.stringify(command) !== JSON.stringify(create)
        )
          throw new DomainError("FORBIDDEN");
        return { id, version: 1 };
      },
    );
    expect(await submitTourMutation(create)).toEqual({
      ok: true,
      data: { id, version: 1 },
    });
    expect(boundary.revalidate.mock.calls).toEqual([
      ["/tours"],
      [`/tours/${id}`],
    ]);
  });
  it.each(["FORBIDDEN", "CONFLICT", "NOT_FOUND"] as const)(
    "preserves the server %s result without returned data",
    async (code) => {
      boundary.mutate.mockRejectedValue(new DomainError(code));
      expect(await submitTourMutation(create)).toEqual({
        ok: false,
        code,
        fields: [],
      });
      expect(boundary.revalidate).not.toHaveBeenCalled();
    },
  );
  it("never sends database exception text to readers or editors", async () => {
    boundary.detail.mockRejectedValue(new Error("DATABASE_URL=private-secret"));
    boundary.mutate.mockRejectedValue(new Error("DATABASE_URL=private-secret"));
    const response = await detailGET(
      new Request("https://nomera.example/api/tours/one"),
      { params: Promise.resolve({ tourId: id }) },
    );
    expect(response.status).toBe(500);
    expect(await response.text()).not.toContain("private-secret");
    expect(await submitTourMutation(create)).toEqual({
      ok: false,
      code: "INTERNAL_ERROR",
      fields: [],
    });
  });
});
describe("Tour filter and money parsing", () => {
  it("clears every user's tour drafts on auth changes while preserving unrelated storage", () => {
    const entries = new Map([
      ["nomera:tour-draft:user-a:tenant-a:new", "draft a"],
      ["nomera:tour-draft:user-b:tenant-b:tour", "draft b"],
      ["nomera:locale", "mn"],
    ]);
    clearTourDrafts({
      get length() {
        return entries.size;
      },
      key: (index) => [...entries.keys()][index] ?? null,
      removeItem: (key) => {
        entries.delete(key);
      },
    });
    expect([...entries]).toEqual([["nomera:locale", "mn"]]);
  });
  it("does not block authentication when browser storage is unavailable", () => {
    expect(() =>
      clearTourDrafts({
        get length(): number {
          throw new Error("Storage blocked");
        },
        key: () => null,
        removeItem: () => {},
      }),
    ).not.toThrow();
  });
  it("recovers unfinished form text after back navigation without treating it as saved data", () => {
    const restored = readStoredTourDraft(
      JSON.stringify({
        data: {
          ...create.data,
          code: "",
          title: "Unfinished draft",
          durationDays: null,
        },
        price: "10.",
        version: null,
      }),
    );
    expect(restored?.data.title).toBe("Unfinished draft");
    expect(restored?.data.code).toBe("");
    expect(restored?.data.durationDays).toBeNaN();
    expect(restored?.price).toBe("10.");
  });
  it("rejects corrupt recovery storage and unsafe image references", () => {
    expect(readStoredTourDraft("not-json")).toBeNull();
    expect(
      readStoredTourDraft(
        JSON.stringify({
          data: {
            ...create.data,
            media: [{ url: "javascript:alert(1)", alt: "Unsafe" }],
          },
          price: "10.50",
          version: 1,
        }),
      ),
    ).toBeNull();
  });
  it("keeps every minor unit visible at the safe integer limit", () => {
    expect(formatMoney(Number.MAX_SAFE_INTEGER, "USD", "en-US")).toBe(
      "$90,071,992,547,409.91",
    );
  });
  it("keeps narrow currency spacing identical across server and browser ICU versions", () => {
    const parts = vi.spyOn(Intl.NumberFormat.prototype, "formatToParts");
    try {
      for (const spacing of ["\u00a0", ""]) {
        parts.mockReturnValue([
          { type: "currency", value: "₮" },
          ...(spacing ? [{ type: "literal" as const, value: spacing }] : []),
          { type: "integer", value: "245" },
          { type: "group", value: "," },
          { type: "integer", value: "000" },
          { type: "decimal", value: "." },
          { type: "fraction", value: "00" },
        ]);
        expect(formatMoney(24500050, "MNT", "mn")).toBe("₮245,000.50");
      }
    } finally {
      parts.mockRestore();
    }
  });
  it("preserves actual all destination values independently of status", () => {
    expect(
      catalogFilter(new URLSearchParams("destination=all&category=all")),
    ).toMatchObject({ destination: "all", category: "all", status: "all" });
  });
  it.each([
    ["0", 0],
    ["10.05", 1005],
    ["0.29", 29],
    ["90071992547409.91", Number.MAX_SAFE_INTEGER],
  ] as const)("converts %s to exact minor units", (value, expected) => {
    expect(majorToMinor(value)).toBe(expected);
  });
  it.each(["", "-1", "1.001", "1e8", "NaN", "90071992547409.92"])(
    "rejects invalid or unsafe money %s",
    (value) => {
      expect(majorToMinor(value)).toBeNaN();
    },
  );
});
