import { getPublishedStorefront } from "@nomera/postgres/server/storefront";
import { policyKinds } from "@nomera/schemas/storefront";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { CheckoutForm } from "@/features/checkout/form";

export const metadata = { robots: { index: false, follow: false } };
export default async function CheckoutPage({
  params,
  searchParams,
}: {
  params: Promise<{ tenantSlug: string }>;
  searchParams: Promise<{
    departureId?: string;
    departure?: string;
    promotionCode?: string;
    travelers?: string;
  }>;
}) {
  const { tenantSlug } = await params;
  const storefront = await getPublishedStorefront(tenantSlug);
  if (!storefront) notFound();
  const t = await getTranslations("Checkout");
  const p = await getTranslations("PublicStorefront");
  const query = await searchParams;
  const options = storefront.tours.flatMap((tour) =>
    tour.departures
      .filter((departure) => departure.available > 0)
      .map((departure) => ({
        ...departure,
        title: tour.data.title,
        image: tour.data.media[0],
      })),
  );
  return (
    <section className="sf-section sf-checkout">
      <h1 className="mb-2 font-serif text-3xl md:text-4xl">{t("title")}</h1>
      <p className="mb-8 text-muted-foreground">{t("description")}</p>
      <CheckoutForm
        slug={tenantSlug}
        options={options}
        initialDeparture={query.departureId ?? query.departure}
        initialTravelers={Number(query.travelers)}
        initialPromotion={
          typeof query.promotionCode === "string" ? query.promotionCode : ""
        }
        policies={policyKinds
          .filter((key) => storefront.data.policies[key])
          .map((key) => ({
            title: p(`policyKinds.${key}`),
            body: storefront.data.policies[key],
          }))}
      />
    </section>
  );
}
