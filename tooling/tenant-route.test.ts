import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const boundary = vi.hoisted(() => ({
  session: "",
  getSummary: vi.fn(),
  createTenantRepository: vi.fn(),
}));
vi.mock("../apps/admin/node_modules/next/headers", () => ({
  cookies: async () => ({ get: () => ({ value: boundary.session }) }),
}));
vi.mock("../packages/postgres/src/server/tenant", () => ({
  createTenantRepository: boundary.createTenantRepository,
}));

import { GET } from "../apps/admin/app/api/tenant/route";

beforeEach(() => {
  vi.clearAllMocks();
  boundary.session = "";
  boundary.createTenantRepository.mockResolvedValue({
    getSummary: boundary.getSummary,
  });
  boundary.getSummary.mockResolvedValue({
    id: "tenant-a",
    name: "Operator A",
    roles: ["owner"],
  });
});
describe("tenant HTTP boundary", () => {
  it("returns 401 without contacting PostgreSQL when no session cookie exists", async () => {
    const response = await GET(
      new Request("https://admin.example/api/tenant?tenantId=not-a-uuid"),
    );
    expect(response.status).toBe(401);
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(boundary.createTenantRepository).not.toHaveBeenCalled();
  });
  it("passes only session and selected tenant to the server repository, ignoring forged roles", async () => {
    boundary.session = "session-a";
    const response = await GET(
      new Request(
        "https://admin.example/api/tenant?tenantId=33333333-3333-4333-8333-333333333333&role=owner&userId=attacker",
      ),
    );
    expect(response.status).toBe(200);
    expect(boundary.createTenantRepository).toHaveBeenCalledWith(
      "session-a",
      "33333333-3333-4333-8333-333333333333",
    );
    expect(await response.json()).toEqual({
      data: { id: "tenant-a", name: "Operator A", roles: ["owner"] },
    });
    expect(response.headers.get("cache-control")).toContain("no-store");
  });
  it("sanitizes unexpected provider failures", async () => {
    boundary.session = "session-a";
    boundary.createTenantRepository.mockRejectedValue(
      new Error("secret-backend-detail"),
    );
    const response = await GET(
      new Request("https://admin.example/api/tenant?tenantId=tenant-a"),
    );
    expect(response.status).toBe(500);
    expect(await response.text()).not.toContain("secret-backend-detail");
  });
});
