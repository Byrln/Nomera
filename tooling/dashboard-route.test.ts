import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const boundary = vi.hoisted(() => ({ session: "", tenant: "", read: vi.fn() }));
vi.mock("../apps/admin/node_modules/next/headers", () => ({
  cookies: async () => ({
    get: (key: string) => ({
      value: key === "nomera_session" ? boundary.session : boundary.tenant,
    }),
  }),
}));
vi.mock("../packages/postgres/src/server/dashboard", () => ({
  getDashboard: boundary.read,
}));

import { GET } from "../apps/admin/app/api/dashboard/route";
import { DomainError } from "../packages/domain/src/errors";

beforeEach(() => {
  vi.clearAllMocks();
  boundary.session = "session";
  boundary.tenant = "verified-selection";
  boundary.read.mockResolvedValue({ tenantId: "verified-selection" });
});
describe("dashboard HTTP authorization boundary", () => {
  it("uses the HttpOnly selection, never a forged query tenant or role", async () => {
    const response = await GET(
      new Request(
        "https://nomera.example/api/dashboard?from=2026-09-01&to=2026-09-12&currency=USD&tenantId=foreign&role=owner",
      ),
    );
    expect(boundary.read).toHaveBeenCalledWith(
      "session",
      "verified-selection",
      { from: "2026-09-01", to: "2026-09-12", currency: "USD" },
    );
    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    expect(response.headers.get("Vary")).toBe("Cookie");
  });
  it("does not contact the repository without a session or tenant selection", async () => {
    boundary.session = "";
    expect(
      (await GET(new Request("https://nomera.example/api/dashboard"))).status,
    ).toBe(401);
    boundary.session = "session";
    boundary.tenant = "";
    expect(
      (await GET(new Request("https://nomera.example/api/dashboard"))).status,
    ).toBe(403);
    expect(boundary.read).not.toHaveBeenCalled();
  });
  it.each([
    ["UNAUTHENTICATED", 401],
    ["FORBIDDEN", 403],
    ["VALIDATION_ERROR", 400],
    ["UNAVAILABLE", 503],
  ] as const)(
    "maps %s without data or cacheable errors",
    async (code, status) => {
      boundary.read.mockRejectedValue(new DomainError(code));
      const response = await GET(
        new Request("https://nomera.example/api/dashboard"),
      );
      expect(response.status).toBe(status);
      expect(response.headers.get("Cache-Control")).toContain("no-store");
      expect(await response.json()).toEqual({
        error: { code, message: expect.any(String) },
      });
    },
  );
  it("sanitizes unexpected database failures", async () => {
    boundary.read.mockRejectedValue(
      new Error("postgres://private-secret@host/database"),
    );
    const response = await GET(
      new Request("https://nomera.example/api/dashboard"),
    );
    expect(response.status).toBe(500);
    expect(await response.text()).not.toContain("private-secret");
  });
});
