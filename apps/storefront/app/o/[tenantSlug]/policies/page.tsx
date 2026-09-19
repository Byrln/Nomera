import { policyKinds } from "@nomera/schemas/storefront";
import { StorefrontPolicies } from "@nomera/storefront-themes/renderer";
import { getTranslations } from "next-intl/server";
import { publishedStorefront } from "@/lib/published-storefront";
export default async function Page({
  params,
}: {
  params: Promise<{ tenantSlug: string }>;
}) {
  const store = await publishedStorefront((await params).tenantSlug);
  const t = await getTranslations("PublicStorefront");
  return (
    <StorefrontPolicies
      policies={store.data.policies}
      titles={
        Object.fromEntries(
          policyKinds.map((key) => [key, t(`policyKinds.${key}`)]),
        ) as Record<(typeof policyKinds)[number], string>
      }
      title={t("policies")}
      empty={t("noPolicies")}
      base={`/o/${store.slug}`}
      back={t("allTours")}
    />
  );
}
