"use client";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@nomera/ui/components/alert";
import { Button } from "@nomera/ui/components/button";
import { useTranslations } from "next-intl";
export default function ErrorPage({ reset }: { reset: () => void }) {
  const t = useTranslations("Finance");
  return (
    <div className="mx-auto flex max-w-[68rem] flex-col gap-4">
      <Alert variant="destructive">
        <AlertTitle>{t("errorTitle")}</AlertTitle>
        <AlertDescription>{t("errorDescription")}</AlertDescription>
      </Alert>
      <Button className="w-fit" onClick={reset}>
        {t("retry")}
      </Button>
    </div>
  );
}
