import { getAdminHeader } from "@nomera/postgres/server/admin";
import { type ReactNode, Suspense } from "react";
import { AdminHeader } from "@/components/admin-header";
import { AdminPrimaryNavigation } from "@/components/admin-navigation";
import { Preferences } from "@/components/preferences";
import { WorkspaceAction } from "@/components/workspace-action";
import { readSession } from "@/lib/auth";
import "@/components/admin-shell.css";

export async function AdminShell({
  workspace,
  canDashboard = true,
  children,
}: {
  workspace: { id: string; name: string };
  canDashboard?: boolean;
  variant?: "default" | "dashboard";
  children: ReactNode;
}) {
  const secret = await readSession();
  const header = secret
    ? await getAdminHeader(secret, workspace.id).catch(() => null)
    : null;
  const headerProps = {
    workspace: workspace.name,
    email: header?.email ?? "",
    pending: header?.pending ?? null,
    preferences: <Preferences />,
    signOut: <WorkspaceAction />,
    canDashboard,
  };

  return (
    <div className="admin-shell dashboard-shell">
      <Suspense fallback={<header className="admin-topbar dashboard-topbar" />}>
        <AdminHeader {...headerProps} variant="dashboard" />
      </Suspense>
      <main id="main" className="dashboard-main">
        {children}
      </main>
      <AdminPrimaryNavigation canDashboard={canDashboard} variant="bottom" />
    </div>
  );
}
