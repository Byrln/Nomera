import {
  defaultStorefront,
  type PublicTour,
  policyKinds,
} from "@nomera/schemas/storefront";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { featuredTours, heroImage } from "./data";
import { storefrontDate } from "./date";
import { filterTours } from "./filter";
import { themeDefinition, themeIds } from "./registry";
import {
  StorefrontFooter,
  StorefrontFrame,
  StorefrontHome,
  StorefrontPolicies,
} from "./renderer";
import { luminance, readableInk, safeColor } from "./tokens";
import { interfaceKeys, type StorefrontLabels } from "./types";

const data = defaultStorefront("Test operator", "tenant-test");
const labels: StorefrontLabels = {
  tours: "Tours",
  viewTour: "View tour",
  empty: "Empty",
  days: "days",
  from: "From",
  contact: "Contact",
  policies: "Policies",
  destinations: "Destinations",
  availableTours: "Tours",
  ui: Object.fromEntries(
    interfaceKeys.map((key) => [key, key]),
  ) as StorefrontLabels["ui"],
  sections: {
    hero: "Explore the landscape",
    featured: "Featured tours",
    about: "About",
    destinations: "Destinations",
    testimonials: "Stories",
    stats: "Stats",
    faq: "FAQ",
    contact: "Contact",
  },
};
const tour = (id: string): PublicTour => ({
  id,
  data: {
    code: id,
    title: `Tour ${id}`,
    destination: "Terelj",
    category: "Nature",
    durationDays: 3,
    description: "Published description",
    basePriceMinor: 24500050,
    currency: "MNT",
    itinerary: [],
    media: [],
  },
  departures: [],
});
const render = (tours: PublicTour[], theme = data.theme, preview = false) =>
  renderToStaticMarkup(
    <StorefrontFrame data={{ ...data, theme }}>
      <StorefrontHome
        data={{ ...data, theme }}
        tours={tours}
        base="/o/test"
        labels={labels}
        locale="mn"
        preview={preview}
      />
    </StorefrontFrame>,
  );
describe("published storefront compositions", () => {
  it("renders only nonempty, allowed policies as visible anchored sections", () => {
    const policies = {
      ...data.policies,
      booking: "Published booking restriction",
      cancellation: " ",
      internalNotes: "PRIVATE NEVER RENDER",
    };
    const html = renderToStaticMarkup(
      <StorefrontPolicies
        policies={policies}
        titles={
          Object.fromEntries(policyKinds.map((key) => [key, key])) as Record<
            (typeof policyKinds)[number],
            string
          >
        }
        title="Policies"
        empty="No policies"
        base="/o/test"
        back="Tours"
      />,
    );
    expect(html).toContain('href="#booking"');
    expect(html).toContain("Published booking restriction");
    expect(html).not.toContain('id="cancellation"');
    expect(html).not.toContain("PRIVATE");
    expect(html).not.toContain('role="dialog"');
  });
  it("keeps promotions behind a non-submitting dialog trigger without a public promotions route", () => {
    const html = renderToStaticMarkup(
      <StorefrontFooter data={data} base="/o/test" labels={labels} />,
    );
    expect(html).toContain('type="button"');
    expect(html).toContain('aria-haspopup="dialog"');
    expect(html).not.toContain("/promotions");
  });
  it.each(themeIds)("renders the %s registry recipe", (theme) => {
    const html = render([tour("one")], theme);
    expect(html).toContain(`sf-${theme}`);
    expect(html).toContain(`sf-hero-${themeDefinition(theme).hero}`);
    expect(html).toContain("/o/test/tours/one");
  });
  it("uses a safe registry fallback", () =>
    expect(themeDefinition("unknown").id).toBe("atlas"));
  it.each([1, 2, 3, 4, 8])(
    "balances %i tours without empty grid cells",
    (count) => {
      const html = render(
        Array.from({ length: count }, (_, i) => tour(String(i))),
      );
      expect(html).toContain(`data-count="${Math.min(count, 4)}"`);
      expect(html.includes("sf-tour-feature")).toBe(count === 1);
    },
  );
  it("omits empty public sections but explains readiness in preview", () => {
    expect(render([])).not.toContain("sf-featured");
    expect(render([])).not.toContain("previewEmpty");
    expect(render([], "atlas", true)).toContain("previewEmpty");
    expect(render([])).not.toContain('id="contact"');
  });
  it("does not turn internal branding guidance into public copy", () => {
    const html = renderToStaticMarkup(
      <StorefrontHome
        data={{ ...data, brandVoice: "INTERNAL NOTE NEVER PUBLISH" }}
        tours={[]}
        base="/o/test"
        labels={labels}
        locale="en"
      />,
    );
    expect(html).not.toContain("INTERNAL NOTE");
  });
  it("preserves configured section visibility and order", () => {
    const hidden = {
      ...data,
      sections: data.sections.map((section) => ({
        ...section,
        visible: false,
      })),
    };
    expect(
      renderToStaticMarkup(
        <StorefrontHome
          data={hidden}
          tours={[tour("one")]}
          base="/o/test"
          labels={labels}
          locale="en"
        />,
      ),
    ).not.toContain("<section");
  });
  it("selects only published supplied tours in configured order", () =>
    expect(
      featuredTours({ ...data, featuredTourIds: ["b", "missing", "a"] }, [
        tour("a"),
        tour("b"),
      ]).map((item) => item.id),
    ).toEqual(["b", "a"]));
  it("uses configured hero, then featured cover, then published cover", () => {
    const a = tour("a");
    a.data.media = [{ url: "https://example.test/a.jpg", alt: "A" }];
    const b = tour("b");
    b.data.media = [{ url: "https://example.test/b.jpg", alt: "B" }];
    const selected = { ...data, featuredTourIds: ["b"] };
    expect(heroImage(selected, [a, b])?.url).toBe(b.data.media[0]?.url);
    expect(
      heroImage(
        {
          ...selected,
          sections: selected.sections.map((s) =>
            s.kind === "hero"
              ? { ...s, image: "https://example.test/hero.jpg" }
              : s,
          ),
        },
        [a, b],
      )?.url,
    ).toBe("https://example.test/hero.jpg");
    expect(heroImage(selected, [a])?.url).toBe(a.data.media[0]?.url);
    expect(heroImage(data, [])).toBeNull();
  });
  it("keeps preview and public copy identical for the same nonempty snapshot", () =>
    expect(render([tour("a")], "atlas", true)).toBe(
      render([tour("a")], "atlas", false),
    ));
  it("uses Cyrillic dates consistently in server and client runtimes", () => {
    expect(storefrontDate("2026-10-10", "mn")).toBe("2026 оны 10-р сарын 10");
    expect(storefrontDate("2026-10-10", "en")).toBe("Oct 10, 2026");
  });
});
describe("brand color safety", () => {
  it.each(["#ffffff", "#000000", "#ffff00", "#777777", "#ff00ff", "#24483d"])(
    "guarantees AA button ink for %s",
    (color) => {
      const ink = readableInk(color);
      const a = luminance(color);
      const b = luminance(ink);
      expect(
        (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05),
      ).toBeGreaterThanOrEqual(4.5);
    },
  );
  it("rejects unsafe or malformed CSS color values", () => {
    expect(safeColor("url(https://invalid.test)", "#24483d")).toBe("#24483d");
    expect(safeColor("#fff", "#24483d")).toBe("#24483d");
  });
});
describe("tour discovery", () => {
  it("combines filters and handles no results", () => {
    const a = tour("a");
    const b = tour("b");
    b.data.category = "Culture";
    expect(
      filterTours([a, b], {
        category: "Nature",
        destination: "Terelj",
        duration: "3",
      }).map((t) => t.id),
    ).toEqual(["a"]);
    expect(filterTours([a, b], { search: "missing" })).toEqual([]);
  });
  it("never counts sold-out departures as date availability", () => {
    const a = tour("a");
    a.departures = [
      {
        id: "d",
        startsOn: "2026-10-10",
        endsOn: "2026-10-12",
        priceMinor: 100,
        currency: "MNT",
        available: 0,
      },
    ];
    expect(filterTours([a], { date: "2026-10-01" })).toEqual([]);
  });
});
