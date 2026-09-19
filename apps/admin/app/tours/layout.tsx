import type { ReactNode } from "react";
import { AdminShell } from "@/components/admin-shell";
import { tourPageContext } from "@/features/tours/server";

export default async function ToursLayout({
  children,
}: {
  children: ReactNode;
}) {
  const { workspace, canDashboard } = await tourPageContext();
  return (
    <AdminShell workspace={workspace} canDashboard={canDashboard}>
      <div className="min-w-0 w-full">{children}</div>
    </AdminShell>
  );
}
