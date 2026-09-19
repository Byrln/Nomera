"use client";
import { Field, FieldError, FieldLabel } from "@nomera/ui/components/field";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@nomera/ui/components/select";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";

export function EditorField({
  id,
  label,
  invalid,
  children,
}: {
  id: string;
  label: string;
  invalid?: boolean;
  children: ReactNode;
}) {
  const t = useTranslations("Tours");
  return (
    <Field data-invalid={invalid || undefined}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      {children}
      {invalid && (
        <FieldError id={`${id}-error`}>{t("invalidField")}</FieldError>
      )}
    </Field>
  );
}

export function CurrencySelect({
  id,
  value,
  onChange,
  disabled,
}: {
  id: string;
  value: "MNT" | "USD";
  onChange: (value: "MNT" | "USD") => void;
  disabled?: boolean;
}) {
  return (
    <Select
      value={value}
      disabled={disabled}
      onValueChange={(next) => {
        if (next === "MNT" || next === "USD") onChange(next);
      }}
    >
      <SelectTrigger id={id} className="w-full">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          <SelectItem value="MNT">MNT · ₮</SelectItem>
          <SelectItem value="USD">USD · $</SelectItem>
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}

export function minorToMajor(value: number): string {
  const amount = BigInt(value);
  return `${amount / 100n}.${String(amount % 100n).padStart(2, "0")}`;
}
