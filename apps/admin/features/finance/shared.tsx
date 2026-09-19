"use client";
import "./finance.css";
import { Card, CardContent } from "@nomera/ui/components/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@nomera/ui/components/empty";
import { Field, FieldLabel } from "@nomera/ui/components/field";
import { Input } from "@nomera/ui/components/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@nomera/ui/components/select";
import { ChartNoAxesColumn } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import type { ComponentProps, ReactNode } from "react";

export function MoneyFilter({
  currency,
  path,
}: {
  currency: string;
  path: string;
}) {
  const router = useRouter();
  const query = useSearchParams();
  const t = useTranslations("Finance");
  return (
    <Select
      value={currency}
      onValueChange={(value) => {
        const params = new URLSearchParams(query.toString());
        params.set("currency", value);
        router.push(`${path}?${params}`);
      }}
    >
      <SelectTrigger aria-label={t("currency")} className="w-28">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="MNT">MNT</SelectItem>
        <SelectItem value="USD">USD</SelectItem>
      </SelectContent>
    </Select>
  );
}
export function Metric({
  label,
  value,
  icon,
  note,
}: {
  label: string;
  value: string | number;
  icon?: ReactNode;
  note?: string;
}) {
  return (
    <Card className="admin-metric gap-0 py-5">
      <CardContent className="flex items-start gap-5">
        <span className="admin-metric-icon">
          {icon ?? <ChartNoAxesColumn aria-hidden="true" />}
        </span>
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="mt-2 text-2xl font-semibold tracking-tight tabular-nums">
            {value}
          </p>
          {note && <p className="mt-2 text-xs text-muted-foreground">{note}</p>}
        </div>
      </CardContent>
    </Card>
  );
}
export function NoRecords() {
  const t = useTranslations("Finance");
  return (
    <Empty>
      <EmptyHeader>
        <EmptyTitle>{t("empty")}</EmptyTitle>
        <EmptyDescription>{t("emptyDescription")}</EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}
export function FormInput({
  label,
  ...props
}: ComponentProps<typeof Input> & { label: string }) {
  return (
    <Field>
      <FieldLabel htmlFor={props.id ?? props.name}>{label}</FieldLabel>
      <Input id={props.id ?? props.name} {...props} />
    </Field>
  );
}
export function Choice({
  label,
  name,
  value,
  onChange,
  options,
}: {
  label: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <Field>
      <FieldLabel htmlFor={name}>{label}</FieldLabel>
      <Select name={name} value={value} onValueChange={onChange}>
        <SelectTrigger id={name} className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </Field>
  );
}
