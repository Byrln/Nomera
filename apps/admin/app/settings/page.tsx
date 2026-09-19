import { getSettings } from "@nomera/postgres/server/finance";
import { getTranslations } from "next-intl/server";
import { operationPageContext } from "@/features/finance/server";
import { SettingsView } from "@/features/finance/settings";
export async function generateMetadata() {
  const t = await getTranslations("Settings");
  return { title: `${t("title")} · NOMERA` };
}
export default async function Page() {
  const { secret, tenantId } = await operationPageContext("settings:manage");
  return <SettingsView data={await getSettings(secret, tenantId)} />;
}
