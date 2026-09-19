import "server-only";
import { getPublishedStorefront } from "@nomera/postgres/server/storefront";
import { sectionKinds } from "@nomera/schemas/storefront";
import {
  interfaceKeys,
  type StorefrontLabels,
} from "@nomera/storefront-themes/renderer";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { cache } from "react";
export const publishedStorefront = cache(async (slug: string) => {
  const store = await getPublishedStorefront(slug);
  if (!store) notFound();
  return store;
});
export async function storefrontLabels(): Promise<StorefrontLabels> {
  const t = await getTranslations("PublicStorefront");
  return {
    ui: Object.fromEntries(
      interfaceKeys.map((key) => [key, t(key)]),
    ) as StorefrontLabels["ui"],
    tours: t("tours"),
    viewTour: t("viewTour"),
    empty: t("empty"),
    days: t("days"),
    from: t("from"),
    contact: t("contact"),
    policies: t("policies"),
    destinations: t("destinations"),
    availableTours: t("availableTours"),
    sections: Object.fromEntries(
      sectionKinds.map((k) => [k, t(`sections.${k}`)]),
    ) as StorefrontLabels["sections"],
  };
}
