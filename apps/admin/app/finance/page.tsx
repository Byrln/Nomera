import { getFinance } from "@nomera/postgres/server/finance";
import { defaultDashboardFilter } from "@nomera/schemas/dashboard";
import { getTranslations } from "next-intl/server";
import { FinanceView } from "@/features/finance/finance";
import { operationPageContext } from "@/features/finance/server";
export async function generateMetadata() {
  const t = await getTranslations("Finance");
  return { title: `${t("title")} · NOMERA` };
}
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { secret, tenantId, canManage } =
    await operationPageContext("finance:read");
  const query = await searchParams;
  const data = await getFinance(secret, tenantId, {
    ...defaultDashboardFilter(),
    currency: query.currency ?? "MNT",
    ...(query.from ? { from: query.from } : {}),
    ...(query.to ? { to: query.to } : {}),
  });
  return <FinanceView data={data} canManage={canManage} />;
}
