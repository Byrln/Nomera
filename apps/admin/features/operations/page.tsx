import { DomainError } from "@nomera/domain/errors";
import { rolesForCapability } from "@nomera/domain/tenancy";
import {
  getCustomerDetail,
  getOperations,
} from "@nomera/postgres/server/operations";
import { notFound } from "next/navigation";
import { AdminShell } from "@/components/admin-shell";
import { tourPageContext } from "@/features/tours/server";
import { OperationsWorkspace } from "./workspace";
export async function OperationsPage({
  mode,
  customerId,
}: {
  mode: "customers" | "sales" | "bookings";
  customerId?: string;
}) {
  const context = await tourPageContext();
  const data = await getOperations(context.secret, context.tenantId);
  const selectedCustomerId =
    customerId ??
    (mode === "customers"
      ? data.customers.find((customer) => !customer.archived)?.id
      : undefined);
  const detail = selectedCustomerId
    ? await getCustomerDetail(
        context.secret,
        context.tenantId,
        selectedCustomerId,
      ).catch((error: unknown) => {
        if (error instanceof DomainError && error.code === "NOT_FOUND")
          notFound();
        throw error;
      })
    : undefined;
  const canManage = context.workspace.roles.some((role) =>
    rolesForCapability(`${mode}:manage`).includes(role),
  );
  return (
    <AdminShell
      workspace={context.workspace}
      canDashboard={context.canDashboard}
    >
      <div className="admin-page">
        <OperationsWorkspace
          data={data}
          mode={mode}
          detail={detail}
          canManage={canManage}
        />
      </div>
    </AdminShell>
  );
}
