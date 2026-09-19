"use client";

import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@nomera/ui/components/alert";
import { Button } from "@nomera/ui/components/button";
import { useTranslations } from "next-intl";

export default function ApplicationError({ reset }: { reset: () => void }) {
  const t = useTranslations("Common");
  return (
    <main
      id="main"
      className="mx-auto flex min-h-svh w-full max-w-xl flex-col justify-center gap-4 p-6"
    >
      <Alert variant="destructive">
        <AlertTitle>{t("errorTitle")}</AlertTitle>
        <AlertDescription>{t("errorDescription")}</AlertDescription>
      </Alert>
      <Button className="self-start" onClick={reset}>
        {t("retry")}
      </Button>
    </main>
  );
}
