import { OperationsPage } from "@/features/operations/page";
export default async function Page({
  params,
}: {
  params: Promise<{ customerId: string }>;
}) {
  return (
    <OperationsPage mode="customers" customerId={(await params).customerId} />
  );
}
