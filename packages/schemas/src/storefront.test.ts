import { describe, expect, it } from "vitest";
import {
  defaultStorefront,
  storefrontInputSchema,
  storefrontMutationSchema,
} from "./storefront";

const draft = defaultStorefront(
  "Operator",
  "33333333-3333-4333-8333-333333333333",
);
describe("controlled storefront content", () => {
  it("rejects script URLs, credentials, raw style values and duplicate section kinds", () => {
    for (const change of [
      { logo: "javascript:alert(1)" },
      { logo: "https://user:password@example.com/a.png" },
      { primaryColor: "red;display:none" },
      { sections: draft.sections.map(() => draft.sections[0]) },
      { seo: { ...draft.seo, slug: "../other" } },
    ])
      expect(
        storefrontInputSchema.safeParse({ ...draft, ...change }).success,
      ).toBe(false);
  });
  it("accepts predefined themes and valid tenant content without arbitrary DOM", () => {
    expect(storefrontInputSchema.parse(draft).sections).toHaveLength(8);
    expect(
      storefrontInputSchema.safeParse({ ...draft, html: "<script/>" }).success,
    ).toBe(false);
    expect(
      storefrontInputSchema.safeParse({ ...draft, theme: "unknown" }).success,
    ).toBe(false);
  });
  it("requires optimistic versions and rejects client publication payloads", () => {
    expect(
      storefrontMutationSchema.safeParse({
        type: "publish",
        version: 1,
        data: draft,
      }).success,
    ).toBe(false);
    expect(
      storefrontMutationSchema.safeParse({ type: "save", data: draft }).success,
    ).toBe(false);
  });
});
