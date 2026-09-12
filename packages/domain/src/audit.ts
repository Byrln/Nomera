import "server-only";
import { auditInputSchema } from "@nomera/schemas";
import { parseInput } from "./errors";
import { assertCapability, type TenantContext } from "./tenancy";

// Event construction is not persistence. A mutation must append it atomically through
// its domain repository before reporting success; no log or in-memory sink counts.
export function createAuditEvent(context: TenantContext, input: unknown) {
  assertCapability(context, "tenant:read");
  const event = parseInput(auditInputSchema, input);
  return Object.freeze({
    ...event,
    tenantId: context.tenantId,
    actorId: context.userId,
    occurredAt: new Date().toISOString(),
  });
}
