import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { defaultStorefront } from "@nomera/schemas/storefront";
import { authorizeStorefrontMutation } from "./storefront";
import { resolveTenantContext } from "./tenancy";

const id = "33333333-3333-4333-8333-333333333333";
async function context(role: string) {
  return resolveTenantContext(
    {
      getCurrentUser: async () => ({ id, status: true, emailVerified: true }),
      findMemberships: async () => [
        { id, tenantId: id, userId: id, active: true, roles: [role] },
      ],
      getTeam: async () => ({ id, name: "Operator" }),
    },
    id,
  );
}
describe("storefront authority and schedule", () => {
  it("allows verified owner changes and rejects viewer writes", async () => {
    const owner = await context("owner"),
      viewer = await context("viewer");
    const input = {
      type: "save",
      version: 0,
      data: defaultStorefront("Operator", id),
    };
    expect(authorizeStorefrontMutation(owner, input).type).toBe("save");
    expect(() => authorizeStorefrontMutation(viewer, input)).toThrowError(
      expect.objectContaining({ code: "FORBIDDEN" }),
    );
    expect(() =>
      authorizeStorefrontMutation(
        { ...owner },
        { type: "publish", version: 0 },
      ),
    ).toThrowError(expect.objectContaining({ code: "FORBIDDEN" }));
  });
  it("bounds schedules and rejects past publication", async () => {
    const owner = await context("owner");
    const now = new Date("2026-09-12T00:00:00Z");
    expect(() =>
      authorizeStorefrontMutation(
        owner,
        { type: "publish", version: 1, scheduledAt: "2026-09-11T00:00:00Z" },
        now,
      ),
    ).toThrow();
    expect(() =>
      authorizeStorefrontMutation(
        owner,
        { type: "publish", version: 1, scheduledAt: "2030-01-01T00:00:00Z" },
        now,
      ),
    ).toThrow();
    expect(
      authorizeStorefrontMutation(
        owner,
        { type: "publish", version: 1, scheduledAt: "2026-09-13T00:00:00Z" },
        now,
      ).type,
    ).toBe("publish");
  });
});
