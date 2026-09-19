import { DomainError } from "@nomera/domain/errors";
import { getTravelerJourney } from "@nomera/postgres/server/journey";
import { getPublishedStorefront } from "@nomera/postgres/server/storefront";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@nomera/ui/components/alert";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { readTraveler } from "@/features/traveler/access";
import { TravelerPortal } from "@/features/traveler/portal";

export const metadata = {
  robots: { index: false, follow: false },
  referrer: "no-referrer" as const,
};
export default async function TravelerPage({
  params,
}: {
  params: Promise<{ tenantSlug: string }>;
}) {
  const { tenantSlug } = await params;
  const t = await getTranslations("Traveler");
  const storefront = await getPublishedStorefront(tenantSlug);
  if (!storefront) notFound();
  const access = await readTraveler(tenantSlug).catch((error: unknown) => {
    if (
      error instanceof DomainError &&
      ["UNAUTHENTICATED", "FORBIDDEN", "NOT_FOUND"].includes(error.code)
    )
      return null;
    throw error;
  });
  if (!access)
    return (
      <section className="mx-auto max-w-xl px-4 py-12">
        <Alert>
          <AlertTitle>{t("accessTitle")}</AlertTitle>
          <AlertDescription>{t("accessDescription")}</AlertDescription>
        </Alert>
      </section>
    );
  const steps = await getTravelerJourney(tenantSlug, access.token);
  return (
    <TravelerPortal
      slug={tenantSlug}
      booking={access.booking}
      steps={steps}
      support={{ email: storefront.data.email, phone: storefront.data.phone }}
    />
  );
}
