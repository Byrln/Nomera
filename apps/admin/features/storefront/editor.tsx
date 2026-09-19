/* biome-ignore-all lint/performance/noImgElement: inspected local theme thumbnail assets do not need an image proxy. */
"use client";
import {
  type PublishedStorefront,
  type StorefrontAdmin,
  storefrontInputSchema,
} from "@nomera/schemas/storefront";
import { themeIds } from "@nomera/storefront-themes";
import { Alert, AlertDescription } from "@nomera/ui/components/alert";
import { Button } from "@nomera/ui/components/button";
import {
  Check,
  ChevronDown,
  ExternalLink,
  Eye,
  FileText,
  Home,
  Monitor,
  Rocket,
  Search,
  Settings,
  Smartphone,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { submitStorefront } from "./actions";
import { GeneralPanel, HomepagePanel, PoliciesPanel } from "./content-panels";
import { PreviewPanel, SearchPreview } from "./preview";
import { PublishPanel, SeoPanel } from "./publication-panels";
import "@nomera/storefront-themes/styles.css";
import "./storefront.css";
export type StorefrontPanel =
  | "settings"
  | "homepage"
  | "policies"
  | "seo"
  | "publish";
const panels = [
  { id: "settings", icon: Settings },
  { id: "homepage", icon: Home },
  { id: "policies", icon: FileText },
  { id: "seo", icon: Search },
  { id: "publish", icon: Rocket },
] as const;
const themes = themeIds;
export function StorefrontEditor({
  initial,
  panel,
  canManage,
  canPublish,
  publicOrigin,
  initialLive,
}: {
  initial: StorefrontAdmin;
  panel: StorefrontPanel;
  canManage: boolean;
  canPublish: boolean;
  publicOrigin: string;
  initialLive: PublishedStorefront | null;
}) {
  const t = useTranslations("Storefront");
  const d = useTranslations("StorefrontDesign");
  const [state, setState] = useState(initial);
  const [draft, setDraft] = useState(initial.draft);
  const [active, setActive] = useState(panel);
  const [live, setLive] = useState(initialLive);
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState("");
  const [failed, setFailed] = useState(false);
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");
  const [expandedPreview, setExpandedPreview] = useState(false);
  const [draftPreview, setDraftPreview] = useState(false);
  const dirty = JSON.stringify(draft) !== JSON.stringify(state.draft);
  const base = `${publicOrigin}/o/${draft.seo.slug}`;
  const liveUrl =
    state.published && publicOrigin
      ? `${publicOrigin}/o/${state.published.slug}`
      : "";
  function navigate(next: StorefrontPanel) {
    setActive(next);
    setExpandedPreview(false);
    window.history.replaceState(
      null,
      "",
      next === "settings" ? "/storefront" : `/storefront/${next}`,
    );
  }
  function execute(
    type: "save" | "publish" | "restore",
    value?: string | number,
  ) {
    setMessage("");
    setFailed(false);
    if (type === "save" && !storefrontInputSchema.safeParse(draft).success) {
      setFailed(true);
      setMessage(t("invalid"));
      return;
    }
    startTransition(async () => {
      try {
        const result = await submitStorefront(
          type === "save"
            ? { type, version: state.version, data: draft }
            : type === "restore"
              ? { type, version: state.version, sourceVersion: value }
              : {
                  type,
                  version: state.version,
                  ...(typeof value === "string" && value
                    ? { scheduledAt: new Date(value).toISOString() }
                    : {}),
                },
        );
        if (!result.ok) {
          setFailed(true);
          setMessage(t(`errors.${result.code}`));
          return;
        }
        setState(result.data);
        setDraft(result.data.draft);
        if (type === "publish" && !value)
          setLive({
            tenantId: result.data.tenantId,
            slug: result.data.draft.seo.slug,
            version: result.data.version,
            data: result.data.draft,
            tours: result.data.tours,
          });
        setMessage(
          t(
            type === "save"
              ? "saved"
              : type === "restore"
                ? "restored"
                : value
                  ? "scheduled"
                  : "published",
          ),
        );
      } catch {
        setFailed(true);
        setMessage(t("errors.UNAVAILABLE"));
      }
    });
  }
  const tabs = (
    <nav className="sfe-tabs" aria-label={d("tabsLabel")}>
      {panels.map((item) => (
        <Button
          key={item.id}
          variant="ghost"
          aria-current={active === item.id ? "page" : undefined}
          onClick={() => navigate(item.id)}
        >
          <item.icon />
          {d(`tabs.${item.id}`)}
        </Button>
      ))}
    </nav>
  );
  const deviceControls = (
    <div className="sfe-device">
      <Button
        variant="ghost"
        size="sm"
        aria-pressed={device === "desktop"}
        aria-label={d("desktop")}
        onClick={() => setDevice("desktop")}
      >
        <Monitor />
        <span>{d("desktop")}</span>
      </Button>
      <Button
        variant="ghost"
        size="sm"
        aria-pressed={device === "mobile"}
        aria-label={d("mobile")}
        onClick={() => setDevice("mobile")}
      >
        <Smartphone />
        <span>{d("mobile")}</span>
      </Button>
    </div>
  );
  const shared = { draft, setDraft, disabled: !canManage || pending };
  return (
    <div className="admin-page sfe-editor">
      <header className="admin-page-heading">
        <div>
          <h1>{t("title")}</h1>
          <p>{d("description")}</p>
        </div>
        <div className="sfe-heading-actions">
          {liveUrl && (
            <Button asChild variant="outline">
              <a href={liveUrl} target="_blank" rel="noreferrer">
                <ExternalLink />
                {d("viewLive")}
              </a>
            </Button>
          )}
          {active !== "seo" && (
            <Button
              variant="outline"
              aria-pressed={expandedPreview}
              onClick={() => setExpandedPreview(!expandedPreview)}
            >
              <Eye />
              {d("preview")}
            </Button>
          )}
          <Button
            disabled={!canManage || pending || !dirty}
            onClick={() => execute("save")}
          >
            {pending ? t("saving") : d("saveChanges")}
            <ChevronDown />
          </Button>
        </div>
      </header>
      {message && (
        <Alert variant={failed ? "destructive" : "default"}>
          <AlertDescription role="status">{message}</AlertDescription>
        </Alert>
      )}
      {active !== "publish" && (
        <section className="admin-panel sfe-gallery">
          <div className="sfe-gallery-heading">
            <div>
              <h2>{d("themeTitle")}</h2>
              <p>{d("themeDescription")}</p>
            </div>
            {deviceControls}
          </div>
          <div className="sfe-themes">
            {themes.map((theme) => (
              <Button
                key={theme}
                variant="outline"
                className="sfe-theme"
                aria-pressed={draft.theme === theme}
                disabled={!canManage || pending}
                onClick={() => setDraft({ ...draft, theme })}
              >
                <span className="sfe-theme-image">
                  <img
                    src={`/images/storefront-themes/${theme}.webp`}
                    alt=""
                    width={234}
                    height={124}
                  />
                  {draft.theme === theme && (
                    <span className="sfe-theme-selected">
                      <Check />
                    </span>
                  )}
                </span>
                <span className="sfe-theme-name">{t(`themes.${theme}`)}</span>
                <span className="sfe-theme-description">
                  {d(`themes.${theme}`)}
                </span>
              </Button>
            ))}
          </div>
        </section>
      )}
      {active === "publish" && (
        <div className="admin-panel sfe-publish-tabs">{tabs}</div>
      )}
      <div
        className={`sfe-workspace sfe-workspace-${active}${expandedPreview ? " sfe-preview-expanded" : ""}`}
      >
        <div
          className={`sfe-edit-pane ${active !== "publish" ? "admin-panel" : ""}`}
        >
          {active !== "publish" && tabs}
          {active === "settings" && <GeneralPanel {...shared} />}{" "}
          {active === "homepage" && (
            <HomepagePanel {...shared} tours={state.tours} />
          )}{" "}
          {active === "policies" && (
            <PoliciesPanel
              {...shared}
              showHistory={() => navigate("publish")}
            />
          )}{" "}
          {active === "seo" && (
            <SeoPanel {...shared} state={state} base={base} liveUrl={liveUrl} />
          )}{" "}
          {active === "publish" && (
            <PublishPanel
              state={state}
              draft={draft}
              dirty={dirty}
              pending={pending}
              canPublish={canPublish}
              canManage={canManage}
              liveUrl={liveUrl}
              onPublish={(schedule) => execute("publish", schedule)}
              onRestore={(version) => execute("restore", version)}
              onPreview={() => {
                setDraftPreview(true);
                setExpandedPreview(false);
              }}
              onNavigate={navigate}
            />
          )}
        </div>
        {active === "seo" ? (
          <SearchPreview draft={draft} state={state} base={base} />
        ) : (
          <PreviewPanel
            draft={draft}
            tours={state.tours}
            panel={active}
            base={base}
            device={device}
            deviceControls={deviceControls}
            live={live}
            liveUrl={liveUrl}
            showDraft={draftPreview}
            onShowDraft={setDraftPreview}
            state={state}
          />
        )}
      </div>
    </div>
  );
}
