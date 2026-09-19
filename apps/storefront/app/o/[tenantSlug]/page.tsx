import { StorefrontHome } from "@nomera/storefront-themes/renderer";
import { getLocale } from "next-intl/server";
import {
  publishedStorefront,
  storefrontLabels,
} from "@/lib/published-storefront";
export default async function Page({
  params,
}: {
  params: Promise<{ tenantSlug: string }>;
}) {
  const store = await publishedStorefront((await params).tenantSlug);
  return (
    <>
      {store.data.seo.structuredData && (
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "TravelAgency",
            name: store.data.storeName,
            ...(store.data.email ? { email: store.data.email } : {}),
            ...(store.data.phone ? { telephone: store.data.phone } : {}),
            ...(store.data.logo ? { logo: store.data.logo } : {}),
            ...(store.data.seo.canonicalUrl
              ? { url: store.data.seo.canonicalUrl }
              : {}),
          }).replace(/</g, "\\u003c")}
        </script>
      )}
      <StorefrontHome
        data={store.data}
        tours={store.tours}
        base={`/o/${store.slug}`}
        labels={await storefrontLabels()}
        locale={await getLocale()}
      />
    </>
  );
}
