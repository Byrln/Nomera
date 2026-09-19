import type { ReactNode } from "react";
import { AdminShell } from "@/components/admin-shell";
import { storefrontContext } from "@/features/storefront/server";
export default async function Layout({ children }: { children: ReactNode }) {
  const { workspace, canDashboard } = await storefrontContext();
  return (
    <AdminShell workspace={workspace} canDashboard={canDashboard}>
      {children}
    </AdminShell>
  );
}
