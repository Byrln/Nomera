/* biome-ignore-all lint/performance/noImgElement: tenant-owned HTTPS media is rendered without a remote image proxy. */

import { policyKinds } from "@nomera/schemas/storefront";
import { storefrontMoney } from "@nomera/storefront-themes/money";
import {
  TourCollection,
  TourGallery,
} from "@nomera/storefront-themes/renderer";
import { Button } from "@nomera/ui/components/button";
import { Card, CardContent } from "@nomera/ui/components/card";
import { Input } from "@nomera/ui/components/input";
import { Label } from "@nomera/ui/components/label";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import {
  publishedStorefront,
  storefrontLabels,
} from "@/lib/published-storefront";

type Props = { params: Promise<{ tenantSlug: string; tourId: string }> };
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { tenantSlug, tourId } = await params;
  const store = await publishedStorefront(tenantSlug);
  const tour = store.tours.find((t) => t.id === tourId);
  if (!tour) notFound();
  return {
    title: `${tour.data.title} · ${store.data.storeName}`,
    description: tour.data.description.slice(0, 300),
    alternates: store.data.seo.canonicalUrl
      ? {
          canonical: `${store.data.seo.canonicalUrl.replace(/\/$/, "")}/tours/${tourId}`,
        }
      : { canonical: null },
    openGraph: {
      title: tour.data.title,
      images: tour.data.media.map((m) => m.url),
    },
  };
}
export default async function Page({ params }: Props) {
  const { tenantSlug, tourId } = await params;
  const store = await publishedStorefront(tenantSlug);
  const tour = store.tours.find((t) => t.id === tourId);
  if (!tour) notFound();
  const t = await getTranslations("PublicStorefront");
  const locale = await getLocale();
  const labels = await storefrontLabels();
  const money = (value: number, currency: string) =>
    storefrontMoney(value, currency, locale);
  return (
    <article className="sf-section">
      <Button asChild variant="link" className="mb-6 px-0">
        <a href={`/o/${store.slug}/tours`}>{t("allTours")}</a>
      </Button>
      <p className="mb-3 text-sm text-muted-foreground">
        {tour.data.destination} · {tour.data.durationDays}{" "}
        {t(tour.data.durationDays === 1 ? "durationDay" : "days")}
      </p>
      <h1 className="sf-page-title">{tour.data.title}</h1>
      {tour.data.category && (
        <p className="sf-tour-meta">{tour.data.category}</p>
      )}
      <TourGallery media={tour.data.media} labels={labels} />
      <nav className="sf-detail-nav" aria-label={tour.data.title}>
        <a href="#overview">{labels.ui.overview}</a>
        {tour.data.itinerary.length > 0 && (
          <a href="#itinerary">{t("itinerary")}</a>
        )}
        <a href="#departures">{t("departures")}</a>
        {Object.values(store.data.policies).some(Boolean) && (
          <a href="#tour-policies">{t("policies")}</a>
        )}
      </nav>
      <div className="sf-detail-columns">
        <div>
          <section id="overview">
            <h2>{labels.ui.overview}</h2>
            <p className="sf-copy mt-0">{tour.data.description}</p>
          </section>
          {tour.data.itinerary.length > 0 && (
            <section className="mt-10" id="itinerary">
              <h2>{t("itinerary")}</h2>
              <ol className="mt-6 space-y-6">
                {tour.data.itinerary.map((day) => (
                  <li key={day.day} className="border-t pt-5">
                    <p className="mb-2 text-sm text-muted-foreground">
                      {t("day", { day: day.day })}
                    </p>
                    <h3 className="text-xl">{day.title}</h3>
                    <p className="sf-copy">{day.description}</p>
                  </li>
                ))}
              </ol>
            </section>
          )}
          {Object.values(store.data.policies).some(Boolean) && (
            <section id="tour-policies" className="sf-detail-section">
              <h2>{t("policies")}</h2>
              {policyKinds
                .filter((key) => store.data.policies[key])
                .map((key) => (
                  <section key={key} className="sf-detail-section">
                    <h3>{t(`policyKinds.${key}`)}</h3>
                    <p className="sf-copy">{store.data.policies[key]}</p>
                  </section>
                ))}
            </section>
          )}
        </div>
        <aside className="sf-booking-panel" id="departures">
          <p className="sf-copy">
            {t("from")}{" "}
            <strong>
              {money(tour.data.basePriceMinor, tour.data.currency)}
            </strong>
          </p>
          <h2 className="mb-6">{t("departures")}</h2>
          {tour.departures.length ? (
            <div className="space-y-4">
              {tour.departures.map((departure) => (
                <Card key={departure.id}>
                  <CardContent className="space-y-4">
                    <p className="font-medium">
                      {new Intl.DateTimeFormat(locale, {
                        dateStyle: "medium",
                        timeZone: "UTC",
                      }).format(new Date(departure.startsOn))}{" "}
                      –{" "}
                      {new Intl.DateTimeFormat(locale, {
                        dateStyle: "medium",
                        timeZone: "UTC",
                      }).format(new Date(departure.endsOn))}
                    </p>
                    <div className="flex flex-wrap justify-between gap-2">
                      <strong>
                        {money(departure.priceMinor, departure.currency)}
                      </strong>
                      <span className="text-sm text-muted-foreground">
                        {t("spaces", { count: departure.available })}
                      </span>
                    </div>
                    {departure.available > 0 ? (
                      <form
                        action={`/o/${store.slug}/checkout`}
                        className="grid gap-3"
                      >
                        <input
                          type="hidden"
                          name="departureId"
                          value={departure.id}
                        />
                        <Label htmlFor={`travelers-${departure.id}`}>
                          {t("travelers")}
                        </Label>
                        <Input
                          id={`travelers-${departure.id}`}
                          name="travelers"
                          type="number"
                          min={1}
                          max={Math.min(100, departure.available)}
                          defaultValue={1}
                          required
                        />
                        <Button type="submit" className="w-full">
                          {t("book")}
                        </Button>
                      </form>
                    ) : (
                      <Button disabled className="w-full">
                        {t("soldOut")}
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground">{t("noDepartures")}</p>
          )}
          <Button asChild variant="link" className="mt-4">
            <a href={`/o/${store.slug}/policies`}>{t("policies")}</a>
          </Button>
        </aside>
      </div>
      {store.tours.some((item) => item.id !== tour.id) && (
        <section className="sf-detail-section">
          <h2 className="mb-6">{labels.ui.related}</h2>
          <TourCollection
            tours={store.tours
              .filter((item) => item.id !== tour.id)
              .slice(0, 3)}
            base={`/o/${store.slug}`}
            labels={labels}
            locale={locale}
          />
        </section>
      )}
      {tour.departures.some((departure) => departure.available > 0) && (
        <div className="sf-mobile-booking">
          <span>
            {t("from")}
            <br />
            <strong>
              {money(tour.data.basePriceMinor, tour.data.currency)}
            </strong>
          </span>
          <Button asChild>
            <a href="#departures">{t("departures")}</a>
          </Button>
        </div>
      )}
    </article>
  );
}
