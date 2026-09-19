import {
  StorefrontFooter,
  StorefrontFrame,
  StorefrontHeader,
} from "@nomera/storefront-themes/renderer";
import type { Metadata } from "next";
import { connection } from "next/server";
import type { ReactNode } from "react";
import {
  publishedStorefront,
  storefrontLabels,
} from "@/lib/published-storefront";
import "@nomera/storefront-themes/styles.css";
import { Button } from "@nomera/ui/components/button";
import { getLocale, getTranslations } from "next-intl/server";
import { setLocale } from "@/app/actions";
export async function generateMetadata({
  params,
}: {
  params: Promise<{ tenantSlug: string }>;
}): Promise<Metadata> {
  const store = await publishedStorefront((await params).tenantSlug);
  const { seo } = store.data;
  return {
    title: seo.metaTitle || seo.siteTitle || store.data.storeName,
    description: seo.description || store.data.tagline,
    keywords: seo.keywords
      .split(",")
      .map((k) => k.trim())
      .filter(Boolean),
    robots: { index: seo.indexing, follow: seo.indexing },
    ...(seo.canonicalUrl
      ? { alternates: { canonical: seo.canonicalUrl } }
      : {}),
    ...(seo.ogImage
      ? {
          openGraph: {
            title: seo.metaTitle || store.data.storeName,
            description: seo.description,
            images: [seo.ogImage],
          },
        }
      : {}),
    ...(seo.favicon ? { icons: { icon: seo.favicon } } : {}),
  };
}
export default async function Layout({
  params,
  children,
}: {
  params: Promise<{ tenantSlug: string }>;
  children: ReactNode;
}) {
  await connection();
  const store = await publishedStorefront((await params).tenantSlug);
  const labels = await storefrontLabels();
  const base = `/o/${store.slug}`;
  const locale = await getLocale();
  const common = await getTranslations("Common");
  return (
    <StorefrontFrame data={store.data}>
      <StorefrontHeader
        data={store.data}
        base={base}
        labels={labels}
        language={
          <form action={setLocale}>
            <Button
              type="submit"
              variant="ghost"
              name="locale"
              value={locale === "mn" ? "en" : "mn"}
              aria-label={common("language")}
            >
              {locale === "mn" ? "EN" : "МН"}
            </Button>
          </form>
        }
      />
      <main id="main" className="min-w-0">
        {children}
      </main>
      <StorefrontFooter data={store.data} base={base} labels={labels} />
    </StorefrontFrame>
  );
}
