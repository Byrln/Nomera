import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { createAuditEvent } from "./audit";
import { DomainError, toPublicError } from "./errors";
import {
  assertCapability,
  assertTenantOwnership,
  getTenantSummary,
  type IdentityGateway,
  resolveTenantContext,
} from "./tenancy";

const ids = {
  user: "11111111-1111-4111-8111-111111111111",
  membership: "22222222-2222-4222-8222-222222222222",
  tenant: "33333333-3333-4333-8333-333333333333",
  otherTenant: "44444444-4444-4444-8444-444444444444",
  event: "55555555-5555-4555-8555-555555555555",
  operation: "66666666-6666-4666-8666-666666666666",
  resource: "77777777-7777-4777-8777-777777777777",
};
const user = { id: ids.user, status: true, emailVerified: true };
const membership = {
  id: ids.membership,
  tenantId: ids.tenant,
  userId: ids.user,
  active: true,
  roles: ["owner"],
};
const gateway = (
  overrides: Partial<IdentityGateway> = {},
): IdentityGateway => ({
  getCurrentUser: async () => user,
  findMemberships: async () => [membership],
  getTeam: async () => ({ id: ids.tenant, name: "Operator A" }),
  ...overrides,
});

describe("authenticated tenant context", () => {
  it("derives identity and roles from an active membership", async () => {
    const context = await resolveTenantContext(gateway(), ids.tenant);
    expect(context.userId).toBe(ids.user);
    expect(context.tenantId).toBe(ids.tenant);
    expect(context.roles).toEqual(["owner"]);
    expect(Object.isFrozen(context)).toBe(true);
    expect(() => assertCapability(context, "dashboard:read")).not.toThrow();
  });

  it("rejects invalid tenant input before contacting the gateway", async () => {
    const getCurrentUser = vi.fn();
    await expect(
      resolveTenantContext(gateway({ getCurrentUser }), "not-a-uuid"),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
    expect(getCurrentUser).not.toHaveBeenCalled();
  });

  it.each([
    { memberships: [] },
    { memberships: [{ ...membership, active: false }] },
    { memberships: [{ ...membership, tenantId: ids.otherTenant }] },
    { memberships: [{ ...membership, userId: ids.otherTenant }] },
    { memberships: [{ ...membership, roles: ["superadmin"] }] },
    { memberships: [membership, { ...membership, id: ids.otherTenant }] },
  ])("denies invalid or ambiguous membership: %j", async ({ memberships }) => {
    await expect(
      resolveTenantContext(
        gateway({
          findMemberships: async (): Promise<unknown> => memberships,
        }),
        ids.tenant,
      ),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("rejects a serialized context and foreign tenant ownership", async () => {
    const context = await resolveTenantContext(gateway(), ids.tenant);
    const forged = JSON.parse(JSON.stringify(context));
    expect(() => assertCapability(forged, "tenant:read")).toThrow(DomainError);
    expect(() => assertTenantOwnership(context, ids.otherTenant)).toThrow(
      DomainError,
    );
  });

  it("returns a narrow tenant summary", async () => {
    const context = await resolveTenantContext(gateway(), ids.tenant);
    await expect(getTenantSummary(context, gateway())).resolves.toEqual({
      id: ids.tenant,
      name: "Operator A",
      roles: ["owner"],
    });
  });
});

describe("safe application errors and audit records", () => {
  it("never serializes arbitrary exception messages", () => {
    expect(toPublicError(new Error("DATABASE_URL=secret"))).toEqual({
      code: "INTERNAL_ERROR",
      message: "An unexpected error occurred.",
      status: 500,
    });
  });

  it("binds audit identity to the verified tenant context", async () => {
    const context = await resolveTenantContext(gateway(), ids.tenant);
    const event = createAuditEvent(context, {
      eventId: ids.event,
      operationId: ids.operation,
      action: "asset.created",
      resourceId: ids.resource,
    });
    expect(event.tenantId).toBe(ids.tenant);
    expect(event.actorId).toBe(ids.user);
  });
});
