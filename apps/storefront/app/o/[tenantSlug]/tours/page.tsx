import { filterTours } from "@nomera/storefront-themes/filter";
import { TourFilters, type TourQuery } from "@nomera/storefront-themes/filters";
import { TourCollection } from "@nomera/storefront-themes/renderer";
import { Button } from "@nomera/ui/components/button";
import { getLocale } from "next-intl/server";
import {
  publishedStorefront,
  storefrontLabels,
} from "@/lib/published-storefront";
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ tenantSlug: string }>;
  searchParams: Promise<TourQuery>;
}) {
  const store = await publishedStorefront((await params).tenantSlug);
  const query = await searchParams;
  const labels = await storefrontLabels();
  const base = `/o/${store.slug}`;
  const filtered = filterTours(store.tours, query);
  const page = Math.max(
    1,
    Math.min(
      Math.ceil(filtered.length / 12) || 1,
      Number.parseInt(query.page ?? "1", 10) || 1,
    ),
  );
  const pageLink = (next: number) => {
    const search = new URLSearchParams();
    for (const [key, value] of Object.entries(query))
      if (typeof value === "string") search.set(key, value);
    search.set("page", String(next));
    return `${base}/tours?${search}`;
  };
  return (
    <section className="sf-section">
      <header className="sf-listing-header">
        <h1 className="sf-page-title">{labels.tours}</h1>
        {store.data.tagline && <p>{store.data.tagline}</p>}
      </header>
      <TourFilters
        tours={store.tours}
        query={query}
        base={base}
        labels={labels}
      />
      <p className="sf-result-count" role="status">
        {labels.ui.results}: {filtered.length}
      </p>
      <TourCollection
        tours={filtered.slice((page - 1) * 12, page * 12)}
        base={base}
        labels={labels}
        locale={await getLocale()}
      />
      {filtered.length > 12 && (
        <nav className="sf-pagination" aria-label={labels.tours}>
          {page > 1 && (
            <Button asChild variant="outline">
              <a href={pageLink(page - 1)}>{labels.ui.previous}</a>
            </Button>
          )}
          <span>
            {page} / {Math.ceil(filtered.length / 12)}
          </span>
          {page * 12 < filtered.length && (
            <Button asChild variant="outline">
              <a href={pageLink(page + 1)}>{labels.ui.next}</a>
            </Button>
          )}
        </nav>
      )}
    </section>
  );
}
