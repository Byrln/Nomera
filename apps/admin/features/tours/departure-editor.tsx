"use client";
import {
  type DepartureInput,
  departureInputSchema,
  type TourDeparture,
} from "@nomera/schemas/tours";
import { Alert, AlertDescription } from "@nomera/ui/components/alert";
import { Button } from "@nomera/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@nomera/ui/components/dialog";
import { Input } from "@nomera/ui/components/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@nomera/ui/components/select";
import { useTranslations } from "next-intl";
import { useState } from "react";
import type { TourActionResult } from "./actions";
import { CurrencySelect, EditorField, minorToMajor } from "./fields";
import { majorToMinor } from "./request";

const transitions: Record<
  TourDeparture["status"],
  readonly TourDeparture["status"][]
> = {
  scheduled: ["scheduled", "confirmed", "cancelled"],
  confirmed: ["confirmed", "in_progress", "cancelled"],
  in_progress: ["in_progress", "completed"],
  completed: [],
  cancelled: [],
};

export function DepartureEditor({
  existing,
  currency,
  basePrice,
  pending,
  close,
  save,
}: {
  existing?: TourDeparture;
  currency: "MNT" | "USD";
  basePrice: number;
  pending: boolean;
  close: () => void;
  save: (departure: DepartureInput) => Promise<TourActionResult>;
}) {
  const t = useTranslations("Tours");
  const [startsOn, setStartsOn] = useState(existing?.startsOn ?? "");
  const [endsOn, setEndsOn] = useState(existing?.endsOn ?? "");
  const [capacity, setCapacity] = useState(String(existing?.capacity ?? ""));
  const [price, setPrice] = useState(
    minorToMajor(existing?.priceMinor ?? basePrice),
  );
  const [selectedCurrency, setCurrency] = useState(
    existing?.currency ?? currency,
  );
  const [status, setStatus] = useState<TourDeparture["status"]>(
    existing?.status ?? "scheduled",
  );
  const [error, setError] = useState<string>();
  const [fields, setFields] = useState<string[]>([]);
  const reserved = existing?.reserved ?? 0;
  const availableStatuses = (
    existing ? transitions[existing.status] : (["scheduled"] as const)
  ).filter((value) => !reserved || value !== "cancelled");
  async function submit() {
    const candidate = {
      startsOn,
      endsOn,
      capacity: capacity === "" ? Number.NaN : Number(capacity),
      priceMinor: majorToMinor(price),
      currency: selectedCurrency,
      status,
      ...(existing ? { id: existing.id, version: existing.version } : {}),
    };
    const parsed = departureInputSchema.safeParse(candidate);
    if (!parsed.success) {
      setError("VALIDATION_ERROR");
      setFields(parsed.error.issues.map((issue) => String(issue.path[0])));
      return;
    }
    const result = await save(parsed.data);
    if (result.ok) close();
    else {
      setError(result.code);
      setFields(result.fields.map((path) => path.replace("departure.", "")));
    }
  }
  const inputProps = (key: string) => ({
    "aria-invalid": fields.includes(key),
    "aria-describedby": fields.includes(key)
      ? `departure-${key}-error`
      : undefined,
  });
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !pending) close();
      }}
    >
      <DialogContent
        closeLabel={t("close")}
        className="max-h-[90svh] overflow-y-auto sm:max-w-xl"
        showCloseButton={!pending}
      >
        <DialogHeader>
          <DialogTitle>
            {t(existing ? "editDeparture" : "addDeparture")}
          </DialogTitle>
          <DialogDescription>
            {t(reserved ? "reservedDepartureHint" : "departureHint", {
              count: reserved,
            })}
          </DialogDescription>
        </DialogHeader>
        <form
          id="departure-form"
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            void submit();
          }}
          className="grid gap-4 sm:grid-cols-2"
        >
          {error && (
            <Alert variant="destructive" className="sm:col-span-2">
              <AlertDescription>{t(`errors.${error}`)}</AlertDescription>
            </Alert>
          )}
          <EditorField
            id="departure-startsOn"
            label={t("startsOn")}
            invalid={fields.includes("startsOn")}
          >
            <Input
              id="departure-startsOn"
              type="date"
              value={startsOn}
              disabled={pending || reserved > 0}
              onChange={(event) => setStartsOn(event.target.value)}
              {...inputProps("startsOn")}
            />
          </EditorField>
          <EditorField
            id="departure-endsOn"
            label={t("endsOn")}
            invalid={fields.includes("endsOn")}
          >
            <Input
              id="departure-endsOn"
              type="date"
              value={endsOn}
              min={startsOn || undefined}
              disabled={pending || reserved > 0}
              onChange={(event) => setEndsOn(event.target.value)}
              {...inputProps("endsOn")}
            />
          </EditorField>
          <EditorField
            id="departure-capacity"
            label={t("capacity")}
            invalid={fields.includes("capacity")}
          >
            <Input
              id="departure-capacity"
              type="number"
              min={reserved}
              max={2147483647}
              step={1}
              value={capacity}
              disabled={pending}
              onChange={(event) => setCapacity(event.target.value)}
              {...inputProps("capacity")}
            />
          </EditorField>
          <EditorField id="departure-status" label={t("statusLabel")}>
            <Select
              value={status}
              disabled={pending}
              onValueChange={(value) => {
                const selected = availableStatuses.find(
                  (entry) => entry === value,
                );
                if (selected) setStatus(selected);
              }}
            >
              <SelectTrigger id="departure-status" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {availableStatuses.map((value) => (
                    <SelectItem key={value} value={value}>
                      {t(`departureStatus.${value}`)}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </EditorField>
          <EditorField
            id="departure-priceMinor"
            label={t("price")}
            invalid={fields.includes("priceMinor")}
          >
            <Input
              id="departure-priceMinor"
              inputMode="decimal"
              value={price}
              disabled={pending}
              onChange={(event) => setPrice(event.target.value)}
              {...inputProps("priceMinor")}
            />
          </EditorField>
          <EditorField id="departure-currency" label={t("currency")}>
            <CurrencySelect
              id="departure-currency"
              value={selectedCurrency}
              disabled={pending || reserved > 0}
              onChange={setCurrency}
            />
          </EditorField>
        </form>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            disabled={pending}
            onClick={close}
          >
            {t("cancel")}
          </Button>
          <Button type="submit" form="departure-form" disabled={pending}>
            {t(pending ? "saving" : "saveDeparture")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
