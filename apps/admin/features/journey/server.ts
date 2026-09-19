import "server-only";
import { assertCapability, rolesForCapability } from "@nomera/domain/tenancy";
import { createTenantRepository } from "@nomera/postgres/server/tenant";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { readSession, tenantCookie } from "@/lib/auth";

export async function journeyContext() {
  const secret = await readSession();
  if (!secret) redirect("/sign-in");
  const tenantId = (await cookies()).get(tenantCookie)?.value;
  if (!tenantId) redirect("/workspaces");
  const repository = await createTenantRepository(secret, tenantId);
  assertCapability(repository.context, "journey:read");
  return {
    secret,
    tenantId,
    workspace: await repository.getSummary(),
    canDashboard: repository.context.roles.some((role) =>
      rolesForCapability("dashboard:read").includes(role),
    ),
    canManage: repository.context.roles.some((role) =>
      rolesForCapability("journey:manage").includes(role),
    ),
  };
}
