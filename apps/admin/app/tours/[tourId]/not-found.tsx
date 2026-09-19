import { Button } from "@nomera/ui/components/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@nomera/ui/components/empty";
import Link from "next/link";
import { getTranslations } from "next-intl/server";

export default async function MissingTour() {
  const t = await getTranslations("Tours");
  return (
    <Empty>
      <EmptyHeader>
        <EmptyTitle>{t("notFound")}</EmptyTitle>
        <EmptyDescription>{t("notFoundDescription")}</EmptyDescription>
      </EmptyHeader>
      <Button asChild variant="outline">
        <Link href="/tours">{t("backToTours")}</Link>
      </Button>
    </Empty>
  );
}
