import { toPublicError } from "@nomera/domain/errors";
import { assertCapability } from "@nomera/domain/tenancy";
import { createTenantRepository } from "@nomera/postgres/server/tenant";
import {
  dashboardFilterSchema,
  defaultDashboardFilter,
} from "@nomera/schemas/dashboard";
import { Button } from "@nomera/ui";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@nomera/ui/components/alert";
import { ArrowLeft } from "lucide-react";
import { cookies } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { AdminShell } from "@/components/admin-shell";
import { Dashboard } from "@/features/dashboard/dashboard";
import { readSession, tenantCookie } from "@/lib/auth";

export async function generateMetadata() {
  const t = await getTranslations("Dashboard");
  return { title: `${t("title")} · NOMERA` };
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const t = await getTranslations("Dashboard");
  const secret = await readSession();
  if (!secret) redirect("/sign-in");
  const tenantId = (await cookies()).get(tenantCookie)?.value;
  if (!tenantId) redirect("/workspaces");
  let workspace: { id: string; name: string } | undefined;
  let errorCode: string | undefined;
  try {
    const repo = await createTenantRepository(secret, tenantId);
    assertCapability(repo.context, "dashboard:read");
    workspace = await repo.getSummary();
  } catch (error) {
    errorCode = toPublicError(error).code;
  }
  if (errorCode === "UNAUTHENTICATED") redirect("/sign-in");
  const query = await searchParams;
  const defaults = defaultDashboardFilter();
  const requested = dashboardFilterSchema.safeParse({
    from: query.from ?? defaults.from,
    to: query.to ?? defaults.to,
    currency: query.currency ?? defaults.currency,
  });
  return (
    <AdminShell
      workspace={workspace ?? { id: tenantId, name: t("workspace") }}
      variant="dashboard"
    >
      {workspace ? (
        <Dashboard
          tenantId={workspace.id}
          workspaceName={workspace.name}
          initialFilter={requested.success ? requested.data : defaults}
        />
      ) : (
        <Alert className="dashboard-error mx-auto my-8 max-w-xl">
          <AlertTitle>
            {t(errorCode === "FORBIDDEN" ? "accessTitle" : "errorTitle")}
          </AlertTitle>
          <AlertDescription>
            {t(
              errorCode === "FORBIDDEN"
                ? "accessDescription"
                : "errorDescription",
            )}
          </AlertDescription>
          <Button asChild variant="outline">
            <Link href="/workspaces">
              <ArrowLeft aria-hidden="true" />
              {t("switchWorkspace")}
            </Link>
          </Button>
        </Alert>
      )}
    </AdminShell>
  );
}
