"use client";
import { SelectContent } from "@nomera/ui/components/select";
import type { ComponentProps } from "react";
import { useThemeDialog } from "./theme-context";
export function StorefrontSelectContent({
  className = "",
  ...props
}: ComponentProps<typeof SelectContent>) {
  const theme = useThemeDialog();
  return (
    <SelectContent
      {...props}
      style={theme.style}
      className={`${theme.className} ${className}`}
    />
  );
}
