"use client";
import {
  policyKinds,
  type StorefrontAdmin,
  type StorefrontInput,
} from "@nomera/schemas/storefront";
import { Badge } from "@nomera/ui/components/badge";
import { Button } from "@nomera/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@nomera/ui/components/dialog";
import { Input } from "@nomera/ui/components/input";
import { Label } from "@nomera/ui/components/label";
import { Progress } from "@nomera/ui/components/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@nomera/ui/components/table";
import { Textarea } from "@nomera/ui/components/textarea";
import {
  ArrowRight,
  Check,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  Copy,
  ExternalLink,
  Eye,
  FileCheck2,
  FlaskConical,
  Globe,
  History,
  Loader2,
  Rocket,
  Upload,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { type ContentPanelProps, MediaControl } from "./content-panels";
import {
  EditorField,
  EditorInput,
  EditorSection,
  EditorSwitch,
} from "./controls";
import type { StorefrontPanel } from "./editor";
export function publicationDate(value: string) {
  return `${new Date(value).toISOString().replace("T", " ").slice(0, 16)} UTC`;
}
export function publicationChecks(
  draft: StorefrontInput,
  state: StorefrontAdmin,
) {
  return [
    {
      key: "homepage",
      ready: !!draft.sections.find(
        (s) => s.kind === "hero" && s.visible && (s.title || draft.storeName),
      ),
      panel: "homepage",
    },
    {
      key: "tours",
      ready: state.tours.some((t) => t.departures.some((d) => d.available > 0)),
      panel: "homepage",
    },
    {
      key: "policies",
      ready: policyKinds.every((k) => !!draft.policies[k].trim()),
      panel: "policies",
    },
    {
      key: "seo",
      ready: !!(
        draft.seo.siteTitle &&
        draft.seo.metaTitle &&
        draft.seo.description
      ),
      panel: "seo",
    },
  ] as const;
}
export function CopyUrl({ url }: { url: string }) {
  const d = useTranslations("StorefrontDesign");
  const [copied, setCopied] = useState(false);
  return (
    <div className="sfe-copy-url">
      <Input aria-label={d("liveUrl")} value={url} readOnly />
      <Button
        variant="outline"
        size="icon"
        disabled={!url}
        aria-label={d("copyUrl")}
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(url);
            setCopied(true);
          } catch {
            setCopied(false);
          }
        }}
      >
        {copied ? <Check /> : <Copy />}
      </Button>
      {copied && (
        <span className="sr-only" role="status">
          {d("copied")}
        </span>
      )}
    </div>
  );
}
export function SeoPanel({
  draft,
  setDraft,
  disabled,
  state,
  base,
  liveUrl,
}: ContentPanelProps & {
  state: StorefrontAdmin;
  base: string;
  liveUrl: string;
}) {
  const t = useTranslations("Storefront");
  const d = useTranslations("StorefrontDesign");
  function set(key: keyof StorefrontInput["seo"], value: string | boolean) {
    setDraft((current) => ({
      ...current,
      seo: { ...current.seo, [key]: value },
    }));
  }
  const media = state.tours.flatMap((t) => t.data.media);
  const altCount = media.filter((m) => m.alt.trim()).length;
  return (
    <div className="sfe-pane-body">
      <EditorSection title={d("seoTitle")} description={d("seoDescription")}>
        <div className="sfe-seo-fields">
          <div className="sfe-seo-column">
            <EditorField
              label={t("seo.siteTitle")}
              id="site-title"
              count={`${draft.seo.siteTitle.length}/160`}
              hint={d("siteTitleHelp")}
            >
              <Input
                id="site-title"
                value={draft.seo.siteTitle}
                maxLength={160}
                disabled={disabled}
                onChange={(e) => set("siteTitle", e.target.value)}
              />
            </EditorField>
            <EditorField
              label={t("seo.description")}
              id="meta-description"
              count={`${draft.seo.description.length}/500`}
              hint={d("descriptionHelp")}
            >
              <Textarea
                id="meta-description"
                rows={4}
                maxLength={500}
                value={draft.seo.description}
                disabled={disabled}
                onChange={(e) => set("description", e.target.value)}
              />
            </EditorField>
            <EditorField label={t("seo.ogImage")} hint={d("ogImageHelp")}>
              <MediaControl
                value={draft.seo.ogImage}
                label={t("seo.ogImage")}
                disabled={disabled}
                onChange={(v) => set("ogImage", v)}
              />
            </EditorField>
            <div className="sfe-seo-toggle">
              <Globe />
              <div>
                <strong>{d("sitemap")}</strong>
                <p>
                  {state.published
                    ? d("sitemapReady")
                    : d("sitemapAfterPublish")}
                </p>
              </div>
              {liveUrl && (
                <Button asChild variant="outline" size="sm">
                  <a
                    href={`${liveUrl}/sitemap.xml`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {d("viewSitemap")}
                    <ExternalLink />
                  </a>
                </Button>
              )}
            </div>
            {(["indexing", "structuredData"] as const).map((key) => (
              <div key={key} className="sfe-seo-toggle">
                <CheckCircle2 />
                <div>
                  <Label htmlFor={`seo-${key}`}>{t(`seo.${key}`)}</Label>
                  <p>
                    {d(key === "indexing" ? "indexingHelp" : "structuredHelp")}
                  </p>
                </div>
                <EditorSwitch
                  id={`seo-${key}`}
                  checked={draft.seo[key]}
                  disabled={disabled}
                  onCheckedChange={(v) => set(key, v === true)}
                />
              </div>
            ))}
          </div>
          <div className="sfe-seo-column">
            <EditorField
              label={t("seo.metaTitle")}
              id="meta-title"
              count={`${draft.seo.metaTitle.length}/160`}
              hint={d("metaTitleHelp")}
            >
              <Input
                id="meta-title"
                value={draft.seo.metaTitle}
                maxLength={160}
                disabled={disabled}
                onChange={(e) => set("metaTitle", e.target.value)}
              />
            </EditorField>
            <EditorInput
              id="canonical"
              label={t("seo.canonicalUrl")}
              value={draft.seo.canonicalUrl}
              disabled={disabled}
              onChange={(e) => set("canonicalUrl", e.target.value)}
              hint={d("canonicalHelp")}
            />
            <EditorInput
              id="slug"
              label={t("seo.slug")}
              value={draft.seo.slug}
              disabled={disabled}
              onChange={(e) => set("slug", e.target.value)}
              hint={base}
            />
            <EditorField label={t("seo.favicon")} hint={d("faviconHelp")}>
              <MediaControl
                value={draft.seo.favicon}
                label={t("seo.favicon")}
                disabled={disabled}
                onChange={(v) => set("favicon", v)}
              />
            </EditorField>
            <EditorInput
              label={t("seo.keywords")}
              value={draft.seo.keywords}
              disabled={disabled}
              onChange={(e) => set("keywords", e.target.value)}
              hint={d("keywordsHelp")}
            />
            <div className="sfe-alt-health">
              <strong>{d("imageAlt")}</strong>
              <Progress
                value={media.length ? (altCount / media.length) * 100 : 0}
              />
              <p>
                {media.length
                  ? d("altCount", { complete: altCount, total: media.length })
                  : d("noPublishedImages")}
              </p>
            </div>
          </div>
        </div>
      </EditorSection>
    </div>
  );
}
export function PublishPanel({
  state,
  draft,
  dirty,
  pending,
  canPublish,
  canManage,
  liveUrl,
  onPublish,
  onRestore,
  onPreview,
  onNavigate,
}: {
  state: StorefrontAdmin;
  draft: StorefrontInput;
  dirty: boolean;
  pending: boolean;
  canPublish: boolean;
  canManage: boolean;
  liveUrl: string;
  onPublish: (schedule?: string) => void;
  onRestore: (version: number) => void;
  onPreview: () => void;
  onNavigate: (panel: StorefrontPanel) => void;
}) {
  const t = useTranslations("Storefront");
  const d = useTranslations("StorefrontDesign");
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [scheduledAt, setScheduledAt] = useState("");
  const [restoreVersion, setRestoreVersion] = useState<number | null>(null);
  const checks = publicationChecks(draft, state);
  return (
    <div className="sfe-publishing">
      <EditorSection
        title={d("storefrontStatus")}
        description={d("statusDescription")}
        icon={<FileCheck2 />}
        action={
          <Badge
            variant="outline"
            className={
              state.published ? "sfe-status-ready" : "sfe-status-empty"
            }
          >
            {state.published ? d("live") : t("draft")}
          </Badge>
        }
      >
        <div className="sfe-version-compare">
          <div className="sfe-version-card">
            <Badge variant="secondary">{t("draft")}</Badge>
            <h3>{d("draftVersion")}</h3>
            <p>
              {dirty
                ? d("unsavedChanges")
                : d("savedVersion", { version: state.version })}
            </p>
            <p>{d("draftDescription")}</p>
            <Button variant="outline" onClick={onPreview}>
              <Eye />
              {d("previewDraft")}
            </Button>
          </div>
          <ArrowRight className="sfe-version-arrow" />
          <div className="sfe-version-card">
            <Badge
              variant="outline"
              className={state.published ? "sfe-status-ready" : ""}
            >
              {state.published ? d("live") : d("notLive")}
            </Badge>
            <h3>{d("liveVersion")}</h3>
            <p>
              {state.published
                ? publicationDate(state.published.effectiveAt)
                : t("notPublished")}
            </p>
            <p>{d("liveDescription")}</p>
            {liveUrl ? (
              <CopyUrl url={liveUrl} />
            ) : (
              <p className="sfe-help">{d("liveUrlUnavailable")}</p>
            )}
          </div>
        </div>
      </EditorSection>
      <div className="sfe-publish-grid">
        <EditorSection
          title={d("stagingTitle")}
          description={d("stagingDescription")}
          icon={<FlaskConical />}
        >
          <Button variant="outline" className="w-full" onClick={onPreview}>
            <Eye />
            {d("previewDraft")}
          </Button>
          <p className="sfe-help mt-3">{d("stagingHelp")}</p>
        </EditorSection>
        <EditorSection
          title={d("domainTitle")}
          description={d("domainDescription")}
          icon={<Globe />}
        >
          <p className="sfe-domain">
            {draft.seo.canonicalUrl || liveUrl || d("notConfigured")}
          </p>
          <Badge variant="outline">{d("notVerified")}</Badge>
          <p className="sfe-help mt-3">{d("domainHelp")}</p>
        </EditorSection>
        <EditorSection
          title={d("checklist")}
          description={d("checklistDescription")}
          icon={<ClipboardCheck />}
          action={
            <Badge variant="secondary">
              {d("checklistCount", {
                complete: checks.filter((c) => c.ready).length,
                total: checks.length,
              })}
            </Badge>
          }
        >
          <div className="sfe-checklist">
            {checks.map((check) => (
              <Button
                variant="ghost"
                key={check.key}
                onClick={() => onNavigate(check.panel)}
                className="sfe-checklist-row"
              >
                {check.ready ? (
                  <CheckCircle2 className="sfe-good" />
                ) : (
                  <span className="sfe-unchecked" />
                )}
                {d(`checks.${check.key}`)}
              </Button>
            ))}
          </div>
        </EditorSection>
        <EditorSection
          title={d("publishingActions")}
          description={d("publishingDescription")}
          icon={<Rocket />}
        >
          <div className="sfe-publish-actions">
            <Button
              disabled={!canPublish || pending || dirty}
              onClick={() => onPublish()}
            >
              {pending ? <Loader2 className="animate-spin" /> : <Upload />}
              <span>
                {d("publishLive")}
                <small>{d("publishLiveHelp")}</small>
              </span>
            </Button>
            <Button
              variant="outline"
              disabled={!canPublish || pending || dirty}
              onClick={() => setScheduleOpen(true)}
            >
              <Clock />
              <span>
                {t("scheduleButton")}
                <small>{d("scheduleHelp")}</small>
              </span>
            </Button>
            {dirty && <p className="sfe-help">{d("saveBeforePublish")}</p>}
          </div>
        </EditorSection>
      </div>
      <EditorSection
        title={t("history")}
        description={d("historyDescription")}
        icon={<History />}
      >
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{d("version")}</TableHead>
              <TableHead>{d("publishedOn")}</TableHead>
              <TableHead>{d("status")}</TableHead>
              <TableHead className="text-right">{d("actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {state.history.length ? (
              state.history.map((item) => (
                <TableRow key={item.version}>
                  <TableCell>v{item.version}</TableCell>
                  <TableCell>{publicationDate(item.effectiveAt)}</TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {item.cancelled
                        ? t("cancelled")
                        : state.published?.version === item.version
                          ? d("live")
                          : d("versionSaved")}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={!canManage || pending}
                      onClick={() => setRestoreVersion(item.version)}
                    >
                      {t("restore")}
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={4}
                  className="py-8 text-center text-muted-foreground"
                >
                  {t("noVersions")}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </EditorSection>
      <Dialog open={scheduleOpen} onOpenChange={setScheduleOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("scheduleButton")}</DialogTitle>
            <DialogDescription>{t("scheduleHelp")}</DialogDescription>
          </DialogHeader>
          <EditorInput
            label={t("schedule")}
            type="datetime-local"
            value={scheduledAt}
            onChange={(e) => setScheduledAt(e.target.value)}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setScheduleOpen(false)}>
              {d("cancel")}
            </Button>
            <Button
              disabled={!scheduledAt || pending || dirty || !canPublish}
              onClick={() => {
                onPublish(scheduledAt);
                setScheduleOpen(false);
              }}
            >
              {t("scheduleButton")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog
        open={restoreVersion !== null}
        onOpenChange={(open) => {
          if (!open) setRestoreVersion(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("restore")}</DialogTitle>
            <DialogDescription>{d("restoreHelp")}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRestoreVersion(null)}>
              {d("cancel")}
            </Button>
            <Button
              disabled={pending || !canManage}
              onClick={() => {
                if (restoreVersion !== null) onRestore(restoreVersion);
                setRestoreVersion(null);
              }}
            >
              {t("restore")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
