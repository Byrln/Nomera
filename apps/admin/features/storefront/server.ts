import "server-only";
import { assertCapability, rolesForCapability } from "@nomera/domain/tenancy";
import { createTenantRepository } from "@nomera/postgres/server/tenant";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { readSession, tenantCookie } from "@/lib/auth";
export async function storefrontContext() {
  const secret = await readSession();
  if (!secret) redirect("/sign-in");
  const tenantId = (await cookies()).get(tenantCookie)?.value;
  if (!tenantId) redirect("/workspaces");
  const repo = await createTenantRepository(secret, tenantId);
  assertCapability(repo.context, "storefront:read");
  return {
    secret,
    tenantId,
    workspace: await repo.getSummary(),
    canManage: repo.context.roles.some((r) =>
      rolesForCapability("storefront:manage").includes(r),
    ),
    canPublish: repo.context.roles.some((r) =>
      rolesForCapability("storefront:publish").includes(r),
    ),
    canDashboard: repo.context.roles.some((r) =>
      rolesForCapability("dashboard:read").includes(r),
    ),
  };
}
