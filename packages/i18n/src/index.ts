export const locales = ["mn", "en"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "mn";
export const localeCookie = "NOMERA_LOCALE";
export function isLocale(value: unknown): value is Locale {
  return value === "mn" || value === "en";
}
export function resolveLocale(value: unknown): Locale {
  return isLocale(value) ? value : defaultLocale;
}
