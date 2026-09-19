import type { ReactNode } from "react";
import { AdminShell } from "@/components/admin-shell";
import { journeyContext } from "@/features/journey/server";

export default async function Layout({ children }: { children: ReactNode }) {
  const { workspace, canDashboard } = await journeyContext();
  return (
    <AdminShell workspace={workspace} canDashboard={canDashboard}>
      <div className="w-full min-w-0">{children}</div>
    </AdminShell>
  );
}
