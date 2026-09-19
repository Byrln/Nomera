import "server-only";
import {
  assertCapability,
  type Capability,
  rolesForCapability,
} from "@nomera/domain/tenancy";
import { createTenantRepository } from "@nomera/postgres/server/tenant";
import { tourPageContext } from "@/features/tours/server";

export async function operationPageContext(capability: Capability) {
  const context = await tourPageContext();
  const repository = await createTenantRepository(
    context.secret,
    context.tenantId,
  );
  assertCapability(repository.context, capability);
  return {
    ...context,
    canManage: repository.context.roles.some((role) =>
      rolesForCapability(
        capability === "finance:read"
          ? "finance:manage"
          : capability === "marketing:read"
            ? "marketing:manage"
            : "settings:manage",
      ).includes(role),
    ),
  };
}
