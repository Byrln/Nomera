// Development-only visual harness. Reads published snapshots, never admin drafts.

import { themeDefinition } from "@nomera/storefront-themes";
import {
  StorefrontFooter,
  StorefrontFrame,
  StorefrontHeader,
  StorefrontHome,
} from "@nomera/storefront-themes/renderer";
import { notFound } from "next/navigation";
import { getLocale } from "next-intl/server";
import {
  publishedStorefront,
  storefrontLabels,
} from "@/lib/published-storefront";
import Success from "../o/[tenantSlug]/booking-success/page";
import Checkout from "../o/[tenantSlug]/checkout/page";
import Policies from "../o/[tenantSlug]/policies/page";
import Detail from "../o/[tenantSlug]/tours/[tourId]/page";
import Tours from "../o/[tenantSlug]/tours/page";
import "@nomera/storefront-themes/styles.css";
export const metadata = { robots: { index: false, follow: false } };
export default async function ThemeQa({
  searchParams,
}: {
  searchParams: Promise<{ slug?: string; theme?: string; view?: string }>;
}) {
  if (process.env.NODE_ENV !== "development") notFound();
  const query = await searchParams;
  if (!query.slug) notFound();
  const store = await publishedStorefront(query.slug);
  const data = {
    ...store.data,
    theme: themeDefinition(query.theme ?? "atlas").id,
  };
  const labels = await storefrontLabels();
  const base = `/o/${store.slug}`;
  const params = Promise.resolve({ tenantSlug: store.slug });
  let content: React.ReactNode;
  switch (query.view) {
    case "tours":
      content = <Tours params={params} searchParams={Promise.resolve({})} />;
      break;
    case "detail":
      if (!store.tours[0]) notFound();
      content = (
        <Detail
          params={Promise.resolve({
            tenantSlug: store.slug,
            tourId: store.tours[0].id,
          })}
        />
      );
      break;
    case "checkout":
      content = <Checkout params={params} searchParams={Promise.resolve({})} />;
      break;
    case "policies":
      content = <Policies params={params} />;
      break;
    case "success":
      content = <Success params={params} />;
      break;
    default:
      content = (
        <StorefrontHome
          data={data}
          tours={store.tours}
          base={base}
          labels={labels}
          locale={await getLocale()}
        />
      );
  }
  return (
    <StorefrontFrame data={data}>
      <StorefrontHeader data={data} base={base} labels={labels} />
      <main id="main">{content}</main>
      <StorefrontFooter data={data} base={base} labels={labels} />
    </StorefrontFrame>
  );
}
