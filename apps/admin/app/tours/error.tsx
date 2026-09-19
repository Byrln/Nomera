"use client";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@nomera/ui/components/alert";
import { Button } from "@nomera/ui/components/button";
import Link from "next/link";
import { useTranslations } from "next-intl";

export default function ToursError({ reset }: { reset: () => void }) {
  const t = useTranslations("Tours");
  return (
    <div className="mx-auto flex max-w-[68rem] flex-col gap-4">
      <Alert variant="destructive">
        <AlertTitle>{t("errorTitle")}</AlertTitle>
        <AlertDescription>{t("errorDescription")}</AlertDescription>
      </Alert>
      <div className="flex flex-wrap gap-2">
        <Button onClick={reset}>{t("retry")}</Button>
        <Button asChild variant="outline">
          <Link href="/tours">{t("clearFilters")}</Link>
        </Button>
        <Button asChild variant="ghost">
          <Link href="/workspaces">{t("switchWorkspace")}</Link>
        </Button>
      </div>
    </div>
  );
}
