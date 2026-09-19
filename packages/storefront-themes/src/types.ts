import type { PublicTour, StorefrontInput } from "@nomera/schemas/storefront";
export const interfaceKeys = [
  "search",
  "destination",
  "allTours",
  "clear",
  "menu",
  "close",
  "language",
  "anyDestination",
  "category",
  "anyCategory",
  "duration",
  "durationDay",
  "anyDuration",
  "departureDate",
  "sort",
  "recommended",
  "priceLow",
  "durationShort",
  "filters",
  "applyFilters",
  "results",
  "nextDeparture",
  "exploreDestination",
  "previewEmpty",
  "promotion",
  "promotionHelp",
  "continue",
  "overview",
  "related",
  "gallery",
  "previous",
  "next",
] as const;
export interface StorefrontLabels {
  tours: string;
  viewTour: string;
  empty: string;
  days: string;
  from: string;
  contact: string;
  policies: string;
  destinations: string;
  availableTours: string;
  ui: Record<(typeof interfaceKeys)[number], string>;
  sections: Record<StorefrontInput["sections"][number]["kind"], string>;
}
export interface HomeProps {
  data: StorefrontInput;
  tours: PublicTour[];
  base: string;
  labels: StorefrontLabels;
  locale: string;
  preview?: boolean;
}
export type HomeSection = StorefrontInput["sections"][number];
