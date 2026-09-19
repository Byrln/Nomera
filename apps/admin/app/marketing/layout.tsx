import type { ReactNode } from "react";
import { AdminShell } from "@/components/admin-shell";
import { operationPageContext } from "@/features/finance/server";
export default async function Layout({ children }: { children: ReactNode }) {
  const { workspace, canDashboard } =
    await operationPageContext("marketing:read");
  return (
    <AdminShell workspace={workspace} canDashboard={canDashboard}>
      <div className="min-w-0 w-full">{children}</div>
    </AdminShell>
  );
}
