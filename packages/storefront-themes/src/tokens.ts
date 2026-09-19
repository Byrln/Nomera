import type { StorefrontInput } from "@nomera/schemas/storefront";
import type { CSSProperties } from "react";
export function safeColor(value: string, fallback: string) {
  return /^#[\da-f]{6}$/i.test(value) ? value : fallback;
}
export function luminance(color: string) {
  const rgb = [1, 3, 5].map((start) => {
    const n = Number.parseInt(color.slice(start, start + 2), 16) / 255;
    return n <= 0.04045 ? n / 12.92 : ((n + 0.055) / 1.055) ** 2.4;
  });
  return (
    0.2126 * (rgb[0] ?? 0) + 0.7152 * (rgb[1] ?? 0) + 0.0722 * (rgb[2] ?? 0)
  );
}
export function readableInk(color: string) {
  return luminance(safeColor(color, "#24483d")) > 0.179 ? "#000000" : "#ffffff";
}
export function themeTokens(
  data: Pick<StorefrontInput, "primaryColor" | "accentColor" | "font">,
): CSSProperties {
  const primary = safeColor(data.primaryColor, "#24483d");
  const accent = safeColor(data.accentColor, "#e5ecdf");
  return {
    "--sf-primary": primary,
    "--sf-primary-foreground": readableInk(primary),
    "--sf-accent": accent,
    "--sf-accent-foreground": readableInk(accent),
    "--sf-brand-heading-font":
      data.font === "sans"
        ? "var(--font-nomera-sans)"
        : "var(--font-nomera-serif)",
  } as CSSProperties;
}
