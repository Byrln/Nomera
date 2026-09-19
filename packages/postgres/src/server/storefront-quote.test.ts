import {
  defaultStorefront,
  type PublishedStorefront,
} from "@nomera/schemas/storefront";
import { beforeEach, expect, it, vi } from "vitest";

const { query } = vi.hoisted(() => ({ query: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("../server", () => ({ getDatabase: () => query }));
vi.mock("./storefront", () => ({ getPublishedStorefront: vi.fn() }));

import { getPublishedStorefront } from "./storefront";
import { quoteStorefront } from "./storefront-quote";

const departureId = "00000000-0000-4000-8000-000000000001";
const store: PublishedStorefront = {
  tenantId: "tenant-from-publication",
  slug: "operator",
  version: 1,
  data: defaultStorefront("Operator", "tenant"),
  tours: [
    {
      id: "tour",
      data: {
        code: "tour",
        title: "Published tour",
        destination: "Terelj",
        category: "Nature",
        durationDays: 1,
        description: "",
        basePriceMinor: 999,
        currency: "MNT",
        media: [],
        itinerary: [],
      },
      departures: [
        {
          id: departureId,
          startsOn: "2027-01-01",
          endsOn: "2027-01-01",
          priceMinor: 10000,
          currency: "MNT",
          available: 3,
        },
      ],
    },
  ],
};
const input = { departureId, travelers: 2, promotionCode: "SAVE" };
beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getPublishedStorefront).mockResolvedValue(store);
  query.mockResolvedValue([
    {
      kind: "percent",
      value: "10",
      currency: "MNT",
      active: true,
      starts_at: new Date("2020-01-01"),
      ends_at: null,
      max_uses: null,
      uses: 0,
    },
  ]);
});
it("uses published departure prices and scopes a read-only promotion lookup to its tenant", async () => {
  expect(await quoteStorefront("operator", input)).toEqual({
    subtotalMinor: 20000,
    discountMinor: 2000,
    totalMinor: 18000,
    currency: "MNT",
  });
  expect(query).toHaveBeenCalledTimes(1);
  const [sql, ...parameters] = query.mock.calls[0] ?? [];
  expect(Array.from(sql).join("?")).toMatch(/^SELECT /);
  expect(parameters).toEqual([store.tenantId, "SAVE"]);
});
it("rejects browser prices and tenant overrides before querying", async () => {
  await expect(
    quoteStorefront("operator", { ...input, tenantId: "other", totalMinor: 1 }),
  ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
  expect(getPublishedStorefront).not.toHaveBeenCalled();
});
it("does not quote unpublished stores or another tenant's departure", async () => {
  vi.mocked(getPublishedStorefront).mockResolvedValueOnce(null);
  await expect(quoteStorefront("operator", input)).rejects.toMatchObject({
    code: "NOT_FOUND",
  });
  await expect(
    quoteStorefront("operator", {
      ...input,
      departureId: "00000000-0000-4000-8000-000000000002",
    }),
  ).rejects.toMatchObject({ code: "NOT_FOUND" });
  expect(query).not.toHaveBeenCalled();
});
it("rejects insufficient capacity and expired promotions", async () => {
  await expect(
    quoteStorefront("operator", { ...input, travelers: 4 }),
  ).rejects.toMatchObject({ code: "CONFLICT" });
  query.mockResolvedValue([
    {
      kind: "percent",
      value: "10",
      currency: "MNT",
      active: true,
      starts_at: new Date("2020-01-01"),
      ends_at: new Date("2020-01-02"),
      max_uses: null,
      uses: 0,
    },
  ]);
  await expect(quoteStorefront("operator", input)).rejects.toMatchObject({
    code: "CONFLICT",
  });
});
it("quotes guest checkout without a promotion lookup", async () => {
  expect(
    await quoteStorefront("operator", { ...input, promotionCode: "" }),
  ).toMatchObject({ discountMinor: 0, totalMinor: 20000 });
  expect(query).not.toHaveBeenCalled();
});
