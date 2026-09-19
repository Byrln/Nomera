import { getReports } from "@nomera/postgres/server/finance";
import { defaultDashboardFilter } from "@nomera/schemas/dashboard";
import { getTranslations } from "next-intl/server";
import { ReportsView } from "@/features/finance/reports";
import { operationPageContext } from "@/features/finance/server";
export async function generateMetadata() {
  const t = await getTranslations("Reports");
  return { title: `${t("title")} · NOMERA` };
}
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { secret, tenantId } = await operationPageContext("reports:read");
  const query = await searchParams;
  return (
    <ReportsView
      data={
        await getReports(secret, tenantId, {
          ...defaultDashboardFilter(),
          currency: query.currency ?? "MNT",
          destination: query.destination,
          channel: query.channel,
          ...(query.from ? { from: query.from } : {}),
          ...(query.to ? { to: query.to } : {}),
        })
      }
    />
  );
}
