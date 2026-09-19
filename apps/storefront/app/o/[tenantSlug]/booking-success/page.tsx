import { DomainError } from "@nomera/domain/errors";
import { storefrontMoney } from "@nomera/storefront-themes/money";
import { Badge } from "@nomera/ui/components/badge";
import { Button } from "@nomera/ui/components/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@nomera/ui/components/card";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { readTraveler } from "@/features/traveler/access";

export const metadata = {
  robots: { index: false, follow: false },
  referrer: "no-referrer" as const,
};
export default async function BookingSuccess({
  params,
}: {
  params: Promise<{ tenantSlug: string }>;
}) {
  const { tenantSlug } = await params;
  const t = await getTranslations("Checkout");
  const locale = await getLocale();
  const access = await readTraveler(tenantSlug).catch((error: unknown) => {
    if (
      error instanceof DomainError &&
      ["UNAUTHENTICATED", "FORBIDDEN", "NOT_FOUND"].includes(error.code)
    )
      return null;
    throw error;
  });
  if (!access) redirect(`/o/${tenantSlug}/traveler`);
  const booking = access.booking;
  return (
    <section className="sf-section sf-success">
      <Badge variant="outline" className="mb-4">
        {t("requestReceived")}
      </Badge>
      <h1 className="font-serif text-3xl md:text-4xl">{t("successTitle")}</h1>
      <p className="mb-8 mt-4 leading-relaxed text-muted-foreground">
        {t("paymentNotice")}
      </p>
      <Card>
        <CardHeader>
          <CardTitle>{booking.tour.title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p>
            {t("customer")}: <strong>{booking.customerName}</strong>
          </p>
          <p>
            {t("travelers")}: <strong>{booking.travelers}</strong>
          </p>
          <p>
            {t("reference")}: <strong>{booking.reference}</strong>
          </p>
          <div className="flex flex-wrap justify-between gap-3 border-t pt-4">
            <span>{t("finalTotal")}</span>
            <strong>
              {storefrontMoney(booking.totalMinor, booking.currency, locale)}
            </strong>
          </div>
        </CardContent>
      </Card>
      <Button asChild className="mt-6 h-12">
        <Link href={`/o/${tenantSlug}/traveler`}>{t("openTrip")}</Link>
      </Button>
      <p className="mt-4 text-xs text-muted-foreground">{t("accessNotice")}</p>
    </section>
  );
}
