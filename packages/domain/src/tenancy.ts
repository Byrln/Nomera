import "server-only";
import {
  accountIdentitySchema,
  membershipsSchema,
  resourceIdSchema,
  type TenantRole,
  teamIdentitySchema,
  tenantRoleSchema,
} from "@nomera/schemas";
import { DomainError, parseInput } from "./errors";

// Trusted server adapters implement this port. Database rows stay unknown until validated.
export interface IdentityGateway {
  getCurrentUser(): Promise<unknown>;
  findMemberships(tenantId: string, userId: string): Promise<unknown>;
  getTeam(tenantId: string): Promise<unknown>;
}

const capabilities = {
  "tenant:read": ["owner", "admin", "operations", "sales", "finance", "viewer"],
  "dashboard:read": ["owner", "admin"],
  "audit:read": ["owner", "admin"],
  "assets:read": ["owner", "admin", "operations"],
  "assets:manage": ["owner", "admin"],
} as const satisfies Record<string, readonly TenantRole[]>;
export type Capability = keyof typeof capabilities;

declare const verifiedTenant: unique symbol;
export type TenantContext = Readonly<{
  tenantId: string;
  userId: string;
  membershipId: string;
  roles: readonly TenantRole[];
  [verifiedTenant]: true;
}>;
// A copied/serialized object is not authority. Weak references do not cache user sessions.
const verifiedContexts = new WeakSet<object>();

export async function resolveTenantContext(
  gateway: IdentityGateway,
  selectedTenant: unknown,
): Promise<TenantContext> {
  const tenantId = parseInput(resourceIdSchema, selectedTenant);
  const account = accountIdentitySchema.safeParse(
    await gateway.getCurrentUser(),
  );
  if (!account.success || !account.data.status)
    throw new DomainError("UNAUTHENTICATED");
  if (!account.data.emailVerified) throw new DomainError("FORBIDDEN");
  const memberships = membershipsSchema.safeParse(
    await gateway.findMemberships(tenantId, account.data.id),
  );
  if (!memberships.success || memberships.data.length !== 1)
    throw new DomainError("FORBIDDEN");
  const membership = memberships.data[0];
  if (
    !membership?.active ||
    membership.tenantId !== tenantId ||
    membership.userId !== account.data.id
  ) {
    throw new DomainError("FORBIDDEN");
  }
  const roles = [
    ...new Set(
      membership.roles.flatMap((role) => {
        const parsed = tenantRoleSchema.safeParse(role);
        return parsed.success ? [parsed.data] : [];
      }),
    ),
  ];
  if (roles.length === 0) throw new DomainError("FORBIDDEN");
  // Only this resolver brands contexts, after validating server responses.
  const context = Object.freeze({
    tenantId,
    userId: account.data.id,
    membershipId: membership.id,
    roles: Object.freeze(roles),
  }) as TenantContext;
  verifiedContexts.add(context);
  return context;
}

export function rolesForCapability(
  capability: Capability,
): readonly TenantRole[] {
  return [...capabilities[capability]];
}

export function assertCapability(
  context: TenantContext,
  capability: Capability,
): void {
  if (
    !verifiedContexts.has(context) ||
    !context.roles.some((role) => rolesForCapability(capability).includes(role))
  ) {
    throw new DomainError("FORBIDDEN");
  }
}

export function assertTenantOwnership(
  context: TenantContext,
  tenantId: string,
): void {
  assertCapability(context, "tenant:read");
  // Avoid disclosing whether a foreign resource exists.
  if (context.tenantId !== tenantId) throw new DomainError("NOT_FOUND");
}

export type TenantSummary = Readonly<{
  id: string;
  name: string;
  roles: readonly TenantRole[];
}>;
export async function getTenantSummary(
  context: TenantContext,
  gateway: IdentityGateway,
): Promise<TenantSummary> {
  assertCapability(context, "tenant:read");
  const result = teamIdentitySchema.safeParse(
    await gateway.getTeam(context.tenantId),
  );
  if (!result.success) throw new DomainError("UNAVAILABLE");
  assertTenantOwnership(context, result.data.id);
  return { id: result.data.id, name: result.data.name, roles: context.roles };
}
