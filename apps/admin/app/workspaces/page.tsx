import { toPublicError } from "@nomera/domain/errors";
import { listWorkspaces } from "@nomera/postgres/server/auth";
import { createTenantRepository } from "@nomera/postgres/server/tenant";
import { Button } from "@nomera/ui";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { AuthShell } from "@/components/auth-shell";
import { WorkspaceAction } from "@/components/workspace-action";
import { readSession, tenantCookie } from "@/lib/auth";

export async function generateMetadata() {
  const t = await getTranslations("Auth");
  return { title: `${t("workspaces")} · NOMERA` };
}
export default async function WorkspacesPage({
  searchParams,
}: {
  searchParams: Promise<{ after?: string }>;
}) {
  const t = await getTranslations("Auth");
  const secret = await readSession();
  if (!secret) redirect("/sign-in");
  let page: Awaited<ReturnType<typeof listWorkspaces>> | undefined;
  let selected: string | undefined;
  let errorCode: string | undefined;
  try {
    page = await listWorkspaces(secret, (await searchParams).after);
    const selectedId = (await cookies()).get(tenantCookie)?.value;
    if (selectedId) {
      try {
        selected = (
          await (await createTenantRepository(secret, selectedId)).getSummary()
        ).name;
      } catch {
        /* Stale tenant selection is never trusted; offer verified choices below. */
      }
    }
  } catch (error) {
    errorCode = toPublicError(error).code;
  }
  if (errorCode === "UNAUTHENTICATED") redirect("/sign-in");
  return (
    <AuthShell>
      <h1>{t("workspaces")}</h1>
      <p className="auth-intro">{t("workspaceDescription")}</p>
      {selected && (
        <div className="workspace-current" role="status">
          <strong>{t("selected", { name: selected })}</strong>
          <p>{t("workspaceReady")}</p>
        </div>
      )}
      {errorCode && (
        <div className="mt-6">
          <p className="auth-error" role="alert">
            {t(
              errorCode === "FORBIDDEN" ? "verifyEmail" : `errors.${errorCode}`,
            )}
          </p>
          <Button asChild variant="link">
            <a href="/workspaces">{t("retry")}</a>
          </Button>
        </div>
      )}
      {page && (
        <div className="workspace-list">
          {page.workspaces.map((workspace) => (
            <WorkspaceAction key={workspace.id} workspace={workspace} />
          ))}
          {page.workspaces.length === 0 && (
            <p className="auth-intro">
              {t(page.nextCursor ? "emptyPage" : "noWorkspaces")}
            </p>
          )}
          {page.nextCursor && (
            <Button asChild variant="outline">
              <a
                href={`/workspaces?after=${encodeURIComponent(page.nextCursor)}`}
              >
                {t("next")}
              </a>
            </Button>
          )}
        </div>
      )}
      <div className="workspace-footer">
        <WorkspaceAction />
      </div>
    </AuthShell>
  );
}
