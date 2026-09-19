import { getMarketing } from "@nomera/postgres/server/finance";
import { defaultDashboardFilter } from "@nomera/schemas/dashboard";
import { getTranslations } from "next-intl/server";
import { MarketingView } from "@/features/finance/marketing";
import { operationPageContext } from "@/features/finance/server";
export async function generateMetadata() {
  const t = await getTranslations("Marketing");
  return { title: `${t("title")} · NOMERA` };
}
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = await searchParams;
  const { secret, tenantId, canManage } =
    await operationPageContext("marketing:read");
  return (
    <MarketingView
      data={
        await getMarketing(secret, tenantId, undefined, {
          ...defaultDashboardFilter(),
          ...(query.from ? { from: query.from } : {}),
          ...(query.to ? { to: query.to } : {}),
        })
      }
      canManage={canManage}
    />
  );
}
