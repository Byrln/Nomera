/* biome-ignore-all lint/performance/noImgElement: tenant-owned media preview uses the original HTTPS reference. */
"use client";
import {
  type PublicTour,
  type PublishedStorefront,
  policyKinds,
  type StorefrontAdmin,
  type StorefrontInput,
  sectionKinds,
} from "@nomera/schemas/storefront";
import {
  interfaceKeys,
  StorefrontFooter,
  StorefrontFrame,
  StorefrontHeader,
  StorefrontHome,
  type StorefrontLabels,
  StorefrontPolicies,
} from "@nomera/storefront-themes/renderer";
import { Badge } from "@nomera/ui/components/badge";
import { Button } from "@nomera/ui/components/button";

import {
  CheckCircle2,
  ChevronRight,
  Clock,
  FileText,
  Globe,
  Search,
  TriangleAlert,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { type ReactNode, useState } from "react";
import { setLocale } from "@/app/actions";
import type { StorefrontPanel } from "./editor";
import { CopyUrl, publicationDate } from "./publication-panels";
import { ScaledPreview } from "./scaled-preview";

export function PreviewPanel({
  draft,
  tours,
  panel,
  base,
  device,
  deviceControls,
  live,
  liveUrl,
  showDraft,
  onShowDraft,
  state,
}: {
  draft: StorefrontInput;
  tours: PublicTour[];
  panel: StorefrontPanel;
  base: string;
  device: "desktop" | "mobile";
  deviceControls: ReactNode;
  live: PublishedStorefront | null;
  liveUrl: string;
  showDraft: boolean;
  onShowDraft: (value: boolean) => void;
  state: StorefrontAdmin;
}) {
  const p = useTranslations("PublicStorefront");
  const d = useTranslations("StorefrontDesign");
  const locale = useLocale();
  const useLive = panel === "publish" && !showDraft && live;
  const data = useLive ? live.data : draft;
  const previewBase = useLive ? liveUrl || `/o/${live.slug}` : base;
  const visibleTours = useLive ? live.tours : tours;
  const labels: StorefrontLabels = {
    ui: Object.fromEntries(
      interfaceKeys.map((key) => [key, p(key)]),
    ) as StorefrontLabels["ui"],
    tours: p("tours"),
    viewTour: p("viewTour"),
    empty: p("empty"),
    days: p("days"),
    from: p("from"),
    contact: p("contact"),
    policies: p("policies"),
    destinations: p("destinations"),
    availableTours: p("availableTours"),
    sections: Object.fromEntries(
      sectionKinds.map((k) => [k, p(`sections.${k}`)]),
    ) as StorefrontLabels["sections"],
  };
  const previewData = data;
  return (
    <aside className="sfe-preview-pane">
      <section className="admin-panel sfe-preview-panel">
        <div className="sfe-preview-heading">
          <div>
            <h2>
              {panel === "policies"
                ? d("policyPreview")
                : useLive
                  ? d("livePreview")
                  : d("draftPreview")}
            </h2>
            <p>
              {panel === "policies"
                ? d("policyPreviewDescription")
                : useLive
                  ? d("livePreviewDescription")
                  : d("previewDescription")}
            </p>
          </div>
          {panel === "publish" ? (
            <Button
              variant="outline"
              size="sm"
              aria-pressed={showDraft}
              onClick={() => onShowDraft(!showDraft)}
            >
              {showDraft ? d("showLive") : d("previewDraft")}
            </Button>
          ) : (
            deviceControls
          )}
        </div>
        <ScaledPreview device={device} title={d("draftPreview")}>
          <StorefrontFrame data={previewData}>
            <StorefrontHeader
              data={data}
              base={previewBase}
              labels={labels}
              language={
                <form action={setLocale}>
                  <Button
                    type="submit"
                    variant="ghost"
                    name="locale"
                    value={locale === "mn" ? "en" : "mn"}
                    aria-label={p("language")}
                  >
                    {locale === "mn" ? "EN" : "МН"}
                  </Button>
                </form>
              }
            />
            <main id="main">
              {panel === "policies" ? (
                <StorefrontPolicies
                  policies={data.policies}
                  titles={
                    Object.fromEntries(
                      policyKinds.map((key) => [key, p(`policyKinds.${key}`)]),
                    ) as Record<(typeof policyKinds)[number], string>
                  }
                  title={p("policies")}
                  empty={p("noPolicies")}
                  base={previewBase}
                  back={p("allTours")}
                />
              ) : (
                <StorefrontHome
                  data={previewData}
                  tours={visibleTours}
                  base={previewBase}
                  labels={labels}
                  locale={locale}
                  preview
                />
              )}
            </main>
            <StorefrontFooter data={data} base={previewBase} labels={labels} />
          </StorefrontFrame>
        </ScaledPreview>
        {panel === "publish" && (
          <div className="sfe-preview-live-url">
            <strong>{d("liveUrl")}</strong>
            {liveUrl ? (
              <CopyUrl url={liveUrl} />
            ) : (
              <p className="sfe-help">{d("liveUrlUnavailable")}</p>
            )}
          </div>
        )}
      </section>
      {panel === "publish" && (
        <section className="admin-panel sfe-activity">
          <h2>
            <Clock />
            {d("activityTitle")}
          </h2>
          {state.history.length ? (
            <ol>
              {state.history.slice(0, 6).map((item) => (
                <li key={item.version}>
                  <span className="sfe-activity-icon">
                    <FileText />
                  </span>
                  <div>
                    <strong>
                      {item.cancelled
                        ? d("publicationSuperseded")
                        : state.published?.version === item.version
                          ? d("storefrontPublished")
                          : d("publicationRecorded")}
                    </strong>
                    <p>
                      v{item.version} · {publicationDate(item.effectiveAt)}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          ) : (
            <p className="sfe-help">{d("noActivity")}</p>
          )}
        </section>
      )}
    </aside>
  );
}
export function SearchPreview({
  draft,
  state,
  base,
}: {
  draft: StorefrontInput;
  state: StorefrontAdmin;
  base: string;
}) {
  const d = useTranslations("StorefrontDesign");
  const [view, setView] = useState<"search" | "social">("search");
  const checks = [
    {
      key: "metadata",
      ready: !!(
        draft.seo.siteTitle &&
        draft.seo.metaTitle &&
        draft.seo.description
      ),
    },
    { key: "social", ready: !!draft.seo.ogImage },
    { key: "structured", ready: draft.seo.structuredData },
    { key: "indexing", ready: draft.seo.indexing },
    { key: "sitemap", ready: !!state.published },
  ];
  const ready = checks.filter((c) => c.ready).length;
  const title = draft.seo.metaTitle || draft.seo.siteTitle || draft.storeName;
  const description = draft.seo.description || draft.tagline;
  const url = draft.seo.canonicalUrl || base;
  return (
    <aside className="sfe-preview-pane">
      <section className="admin-panel sfe-search-panel">
        <div className="sfe-preview-heading">
          <div>
            <h2>{d("searchPreview")}</h2>
            <p>{d("searchPreviewDescription")}</p>
          </div>
          <div className="sfe-search-tabs">
            <Button
              variant="ghost"
              size="sm"
              aria-pressed={view === "search"}
              onClick={() => setView("search")}
            >
              {d("googleSearch")}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              aria-pressed={view === "social"}
              onClick={() => setView("social")}
            >
              {d("socialShare")}
            </Button>
          </div>
        </div>
        {view === "search" && (
          <div className="sfe-search-result">
            <p className="sfe-search-url">
              {draft.seo.favicon ? (
                <img src={draft.seo.favicon} alt="" width={18} height={18} />
              ) : (
                <Globe />
              )}
              {url}
            </p>
            <h3>{title}</h3>
            <p>{description || d("noDescription")}</p>
          </div>
        )}
        <div
          className={`sfe-social-result ${view === "social" ? "sfe-social-expanded" : ""}`}
        >
          {draft.seo.ogImage ? (
            <img
              src={draft.seo.ogImage}
              alt={draft.storeName}
              width={1200}
              height={630}
            />
          ) : (
            <div className="sfe-social-empty">
              <Search />
              <span>{d("noSocialImage")}</span>
            </div>
          )}
          <div>
            <strong>{draft.storeName}</strong>
            <small>{url}</small>
            <h3>{title}</h3>
            <p>{description || d("noDescription")}</p>
          </div>
        </div>
      </section>
      <section className="admin-panel sfe-health">
        <div className="sfe-preview-heading">
          <div>
            <h2>{d("visibilityHealth")}</h2>
            <p>{d("visibilityHealthDescription")}</p>
          </div>
          <Badge
            variant="outline"
            className={
              ready === checks.length ? "sfe-status-ready" : "sfe-status-empty"
            }
          >
            {ready === checks.length ? d("good") : d("needsAttention")}
          </Badge>
        </div>
        {checks.map((check) => (
          <div key={check.key} className="sfe-health-row">
            {check.ready ? (
              <CheckCircle2 className="sfe-good" />
            ) : (
              <TriangleAlert className="sfe-warning" />
            )}
            <div>
              <strong>{d(`health.${check.key}`)}</strong>
              <p>{d(`healthHelp.${check.key}`)}</p>
            </div>
            <ChevronRight />
          </div>
        ))}
      </section>
    </aside>
  );
}
