"use client";
import { Alert, AlertDescription } from "@nomera/ui/components/alert";
import { Button } from "@nomera/ui/components/button";
import { useTranslations } from "next-intl";
export default function ErrorView({ reset }: { reset: () => void }) {
  const t = useTranslations("Storefront");
  return (
    <Alert variant="destructive">
      <AlertDescription>
        {t("errors.UNAVAILABLE")}
        <Button variant="outline" onClick={reset}>
          {t("retry")}
        </Button>
      </AlertDescription>
    </Alert>
  );
}
