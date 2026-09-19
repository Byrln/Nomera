export const themeIds = [
  "atlas",
  "nomad",
  "horizon",
  "editorial",
  "minimal",
] as const;
export type StorefrontThemeId = (typeof themeIds)[number];
export interface StorefrontThemeDefinition {
  id: StorefrontThemeId;
  name: string;
  hero: "split" | "cinematic" | "immersive" | "journal" | "panorama";
  heading: "sans" | "serif";
}
export const themeRegistry: Record<
  StorefrontThemeId,
  StorefrontThemeDefinition
> = {
  atlas: { id: "atlas", name: "Atlas", hero: "split", heading: "sans" },
  nomad: { id: "nomad", name: "Nomad", hero: "cinematic", heading: "serif" },
  horizon: {
    id: "horizon",
    name: "Horizon",
    hero: "immersive",
    heading: "serif",
  },
  editorial: {
    id: "editorial",
    name: "Editorial",
    hero: "journal",
    heading: "serif",
  },
  minimal: {
    id: "minimal",
    name: "Minimal",
    hero: "panorama",
    heading: "serif",
  },
};
export function themeDefinition(id: string) {
  return themeRegistry[themeIds.find((key) => key === id) ?? "atlas"];
}
