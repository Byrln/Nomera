import { getTourCatalog } from "@nomera/postgres/server/tours";
import { getTranslations } from "next-intl/server";
import { TourCatalogView } from "@/features/tours/catalog";
import { catalogFilter } from "@/features/tours/request";
import { tourPageContext } from "@/features/tours/server";

export async function generateMetadata() {
  const t = await getTranslations("Tours");
  return { title: `${t("title")} · NOMERA` };
}
export default async function ToursPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { secret, tenantId, canManage } = await tourPageContext();
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(await searchParams))
    if (value !== undefined)
      for (const item of Array.isArray(value) ? value : [value])
        query.append(key, item);
  const filter = catalogFilter(query);
  const catalog = await getTourCatalog(secret, tenantId, filter);
  return (
    <TourCatalogView
      key={query.toString()}
      catalog={catalog}
      canManage={canManage}
    />
  );
}
