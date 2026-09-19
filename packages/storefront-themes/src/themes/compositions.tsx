import { sectionKinds } from "@nomera/schemas/storefront";
import type { StorefrontThemeId } from "../registry";
import { Hero } from "../shared/hero";
import { HomeContent } from "../shared/sections";
import type { HomeProps, HomeSection } from "../types";

const recipes: Record<StorefrontThemeId, readonly HomeSection["kind"][]> = {
  atlas: [
    "hero",
    "destinations",
    "featured",
    "about",
    "testimonials",
    "stats",
    "faq",
    "contact",
  ],
  nomad: [
    "hero",
    "destinations",
    "stats",
    "about",
    "featured",
    "testimonials",
    "faq",
    "contact",
  ],
  horizon: [
    "hero",
    "featured",
    "destinations",
    "about",
    "testimonials",
    "stats",
    "faq",
    "contact",
  ],
  editorial: [
    "hero",
    "featured",
    "destinations",
    "about",
    "testimonials",
    "stats",
    "faq",
    "contact",
  ],
  minimal: [
    "hero",
    "featured",
    "destinations",
    "about",
    "testimonials",
    "faq",
    "stats",
    "contact",
  ],
};
export function ThemeComposition(props: HomeProps) {
  // A tenant's deliberate reordering still wins over the theme's default recipe.
  const defaultOrder = props.data.sections.every(
    (section, index) => section.kind === sectionKinds[index],
  );
  const sections = defaultOrder
    ? recipes[props.data.theme].flatMap((kind) =>
        props.data.sections.filter((section) => section.kind === kind),
      )
    : props.data.sections;
  return (
    <div className={`sf-home sf-composition-${props.data.theme}`}>
      {sections
        .filter((section) => section.visible)
        .map((section) =>
          section.kind === "hero" ? (
            <Hero key={section.kind} {...props} section={section} />
          ) : (
            <HomeContent key={section.kind} {...props} section={section} />
          ),
        )}
    </div>
  );
}
