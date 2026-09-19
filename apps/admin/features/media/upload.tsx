"use client";
import { maxUploadBytes } from "@nomera/schemas/media";
import { Alert, AlertDescription } from "@nomera/ui/components/alert";
import { Button } from "@nomera/ui/components/button";
import { Field, FieldLabel } from "@nomera/ui/components/field";
import { Input } from "@nomera/ui/components/input";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useId, useRef, useState, useTransition } from "react";
export function MediaUpload({ customerId }: { customerId: string }) {
  const t = useTranslations("Finance"),
    errors = useTranslations("Finance.errors"),
    router = useRouter(),
    id = useId();
  const operation = useRef<string | null>(null),
    [pending, start] = useTransition(),
    [error, setError] = useState<string | null>(null),
    [saved, setSaved] = useState(false);
  return (
    <form
      className="flex flex-col gap-3 border-t pt-4"
      onSubmit={(event) => {
        event.preventDefault();
        const form = event.currentTarget,
          body = new FormData(form),
          file = body.get("file");
        if (
          !(file instanceof File) ||
          file.size === 0 ||
          file.size > maxUploadBytes
        ) {
          setError(t("uploadLimit"));
          return;
        }
        operation.current ??= crypto.randomUUID();
        body.set("customerId", customerId);
        body.set("operationId", operation.current);
        start(async () => {
          setError(null);
          setSaved(false);
          try {
            const response = await fetch("/api/media", {
              method: "POST",
              body,
            });
            const result: unknown = await response.json();
            if (
              !response.ok ||
              typeof result !== "object" ||
              result === null ||
              !("ok" in result) ||
              result.ok !== true
            ) {
              const code =
                typeof result === "object" &&
                result !== null &&
                "code" in result
                  ? String(result.code)
                  : "UNAVAILABLE";
              setError(errors.has(code) ? errors(code) : errors("UNAVAILABLE"));
              return;
            }
            setSaved(true);
            operation.current = null;
            form.reset();
            router.refresh();
          } catch {
            setError(errors("UNAVAILABLE"));
          }
        });
      }}
    >
      <Field>
        <FieldLabel htmlFor={id}>{t("uploadDocument")}</FieldLabel>
        <Input
          id={id}
          name="file"
          type="file"
          accept="application/pdf,image/jpeg,image/png,image/webp"
          required
          disabled={pending}
          onChange={() => {
            operation.current = null;
            setSaved(false);
          }}
        />
        <p className="text-xs text-muted-foreground">{t("uploadLimit")}</p>
      </Field>
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {saved && (
        <p role="status" className="text-sm">
          {t("saved")}
        </p>
      )}
      <Button className="w-fit" type="submit" disabled={pending}>
        {pending ? t("saving") : t("uploadDocument")}
      </Button>
    </form>
  );
}
