import "server-only";
import {
  type DashboardFilter,
  type DashboardResponse,
  dashboardFilterSchema,
  dashboardResponseSchema,
} from "@nomera/schemas/dashboard";
import { DomainError, parseInput } from "./errors";
import {
  assertCapability,
  assertTenantOwnership,
  type TenantContext,
} from "./tenancy";

export interface DashboardReader {
  read(tenantId: string, filter: DashboardFilter): Promise<unknown>;
}

// The adapter must resolve the context and execute this service inside one snapshot.
export async function readDashboard(
  context: TenantContext,
  input: unknown,
  reader: DashboardReader,
): Promise<DashboardResponse> {
  assertCapability(context, "dashboard:read");
  const filter = parseInput(dashboardFilterSchema, input);
  const result = dashboardResponseSchema.safeParse(
    await reader.read(context.tenantId, filter),
  );
  if (!result.success) throw new DomainError("UNAVAILABLE");
  assertTenantOwnership(context, result.data.tenantId);
  if (
    result.data.filter.from !== filter.from ||
    result.data.filter.to !== filter.to ||
    result.data.filter.currency !== filter.currency
  ) {
    throw new DomainError("UNAVAILABLE");
  }
  return result.data;
}
