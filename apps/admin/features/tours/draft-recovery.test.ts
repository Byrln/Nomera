import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

const guard = vi.hoisted(() => ({ recoveryPending: true }));
vi.mock("./actions", () => ({ submitTourMutation: vi.fn() }));
vi.mock("./draft-guard", () => ({
  useTourDraftGuard: () => ({
    recoveryPending: guard.recoveryPending,
    clearDraft: vi.fn(),
    recoveryNotice: null,
    navigationDialog: null,
  }),
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("next-intl", () => ({
  useLocale: () => "en",
  useTranslations: () => (key: string) => key,
}));

import { TourEditor } from "./editor";

describe("Tour draft recovery choice", () => {
  it.each([true, false])(
    "keeps editing and submission blocked exactly while recovery is pending (%s)",
    (recoveryPending) => {
      guard.recoveryPending = recoveryPending;
      const html = renderToStaticMarkup(
        createElement(TourEditor, {
          userId: "user",
          tenantId: "tenant",
          canManage: true,
          canPublish: true,
        }),
      );
      const editableControls = html.match(/<(?:input|textarea)\b[^>]*>/g) ?? [];
      expect(editableControls.length).toBeGreaterThan(0);
      for (const control of editableControls)
        expect(control.includes('disabled=""')).toBe(recoveryPending);
      const submit = html.match(/<button\b[^>]*form="tour-form"[^>]*>/)?.[0];
      expect(submit).toBeDefined();
      expect(submit?.includes('disabled=""')).toBe(recoveryPending);
    },
  );
});
