"use client";
import { Checkbox } from "@nomera/ui/components/checkbox";
import { Field, FieldLabel } from "@nomera/ui/components/field";
import { Input } from "@nomera/ui/components/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@nomera/ui/components/select";
import { type ComponentProps, type ReactNode, useId } from "react";
export function EditorField({
  label,
  id,
  hint,
  children,
  count,
}: {
  label: string;
  id?: string;
  hint?: string;
  children: ReactNode;
  count?: string;
}) {
  return (
    <Field className="sfe-field">
      <div className="sfe-field-label">
        <FieldLabel htmlFor={id}>{label}</FieldLabel>
        {count && <span>{count}</span>}
      </div>
      {children}
      {hint && <p className="sfe-help">{hint}</p>}
    </Field>
  );
}
export function EditorInput({
  label,
  hint,
  ...props
}: ComponentProps<typeof Input> & { label: string; hint?: string }) {
  const generatedId = useId();
  const id = props.id ?? generatedId;
  return (
    <EditorField label={label} id={id} hint={hint}>
      <Input {...props} id={id} />
    </EditorField>
  );
}
export function EditorSelect({
  label,
  value,
  onChange,
  options,
  disabled,
  id,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
  disabled?: boolean;
  id?: string;
}) {
  return (
    <Select value={value} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger id={id} className="w-full" aria-label={label}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
export function EditorSwitch(props: ComponentProps<typeof Checkbox>) {
  return (
    <Checkbox
      {...props}
      className={`sfe-switch ${props.className ?? ""}`}
      role="switch"
    />
  );
}
export function EditorSection({
  title,
  description,
  children,
  action,
  icon,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  action?: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <section className="sfe-section">
      <div className="sfe-section-heading">
        <div>
          {icon && <span className="sfe-section-icon">{icon}</span>}
          <h2>{title}</h2>
          {description && <p>{description}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}
