import "server-only";
import { DomainError } from "@nomera/domain/errors";
import { assertCapability, rolesForCapability } from "@nomera/domain/tenancy";
import { createTenantRepository } from "@nomera/postgres/server/tenant";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { readSession, tenantCookie } from "@/lib/auth";

export async function tourPageContext() {
  const secret = await readSession();
  if (!secret?.trim()) redirect("/sign-in");
  const tenantId = (await cookies()).get(tenantCookie)?.value;
  if (!tenantId) redirect("/workspaces");
  const repository = await createTenantRepository(secret, tenantId).catch(
    (error: unknown) => {
      if (error instanceof DomainError && error.code === "UNAUTHENTICATED")
        redirect("/sign-in");
      if (error instanceof DomainError && error.code === "FORBIDDEN")
        redirect("/workspaces");
      throw error;
    },
  );
  assertCapability(repository.context, "tours:read");
  const roles = repository.context.roles;
  return {
    userId: repository.context.userId,
    secret,
    tenantId,
    workspace: await repository.getSummary(),
    canManage: roles.some((role) =>
      rolesForCapability("tours:manage").includes(role),
    ),
    canPublish: roles.some((role) =>
      rolesForCapability("tours:publish").includes(role),
    ),
    canDashboard: roles.some((role) =>
      rolesForCapability("dashboard:read").includes(role),
    ),
  };
}
