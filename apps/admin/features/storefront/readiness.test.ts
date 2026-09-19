import {
  defaultStorefront,
  policyKinds,
  type StorefrontAdmin,
} from "@nomera/schemas/storefront";
import { expect, it } from "vitest";
import { publicationChecks, publicationDate } from "./publication-panels";

const tenant = "33333333-3333-4333-8333-333333333333";
function fixture(): StorefrontAdmin {
  return {
    tenantId: tenant,
    version: 0,
    draft: defaultStorefront("Operator", tenant),
    published: null,
    history: [],
    tours: [],
  };
}
it("does not report empty policies, SEO or unavailable departures as ready", () => {
  const state = fixture();
  expect(
    publicationChecks(state.draft, state)
      .filter((c) => c.ready)
      .map((c) => c.key),
  ).toEqual(["homepage"]);
  state.draft.sections = state.draft.sections.map((s) => ({
    ...s,
    visible: false,
  }));
  expect(publicationChecks(state.draft, state).some((c) => c.ready)).toBe(
    false,
  );
});
it("derives policy and SEO readiness from current unsaved values", () => {
  const state = fixture();
  for (const key of policyKinds) state.draft.policies[key] = "Policy content";
  state.draft.seo.metaTitle = "Operator journeys";
  state.draft.seo.description = "Journeys from the operator";
  expect(
    publicationChecks(state.draft, state)
      .filter((c) => c.ready)
      .map((c) => c.key),
  ).toEqual(["homepage", "policies", "seo"]);
  state.draft.policies.terms = "  ";
  expect(
    publicationChecks(state.draft, state).find((c) => c.key === "policies")
      ?.ready,
  ).toBe(false);
});
it("renders publication timestamps in an explicit stable timezone", () => {
  expect(publicationDate("2026-09-12T15:30:00+08:00")).toBe(
    "2026-09-12 07:30 UTC",
  );
});
