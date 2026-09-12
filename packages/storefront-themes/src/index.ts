// Reserved identifiers only. No theme renderer or default tenant theme exists yet.
export type StorefrontThemeId =
  | "atlas"
  | "nomad"
  | "horizon"
  | "editorial"
  | "minimal";
export interface StorefrontThemeDefinition {
  id: StorefrontThemeId;
  name: string;
}
