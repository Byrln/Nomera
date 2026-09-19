/* biome-ignore-all lint/performance/noImgElement: tenant-controlled HTTPS media is previewed directly without a proxy. */
"use client";
import {
  type PublicTour,
  policyKinds,
  type StorefrontInput,
} from "@nomera/schemas/storefront";
import { Badge } from "@nomera/ui/components/badge";
import { Button } from "@nomera/ui/components/button";
import { Checkbox } from "@nomera/ui/components/checkbox";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@nomera/ui/components/collapsible";
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
import { Textarea } from "@nomera/ui/components/textarea";
import {
  ArrowDown,
  ArrowUp,
  CalendarDays,
  CalendarX,
  ChevronDown,
  Clock,
  Compass,
  CreditCard,
  FileText,
  GripVertical,
  History,
  List,
  ShieldCheck,
  Upload,
  Users,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { type Dispatch, type SetStateAction, useState } from "react";
import {
  EditorField,
  EditorInput,
  EditorSection,
  EditorSelect,
  EditorSwitch,
} from "./controls";
export type ContentPanelProps = {
  draft: StorefrontInput;
  setDraft: Dispatch<SetStateAction<StorefrontInput>>;
  disabled: boolean;
};
export function MediaControl({
  value,
  onChange,
  label,
  disabled,
  kind = "image",
}: {
  value: string;
  onChange: (value: string) => void;
  label: string;
  disabled: boolean;
  kind?: "logo" | "image";
}) {
  const d = useTranslations("StorefrontDesign");
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState(value);
  return (
    <>
      <div className={`sfe-media sfe-media-${kind}`}>
        {value ? (
          <img src={value} alt={label} width={400} height={200} />
        ) : (
          <span className="sfe-media-empty">
            <Compass />
            {d("noImage")}
          </span>
        )}
        <div>
          <Button
            variant="outline"
            size="sm"
            disabled={disabled}
            onClick={() => {
              setUrl(value);
              setOpen(true);
            }}
          >
            <Upload />
            {d("changeImage")}
          </Button>
          {value && (
            <Button
              variant="ghost"
              size="sm"
              className="text-destructive"
              disabled={disabled}
              onClick={() => onChange("")}
            >
              {d("remove")}
            </Button>
          )}
        </div>
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{label}</DialogTitle>
            <DialogDescription>{d("mediaHelp")}</DialogDescription>
          </DialogHeader>
          <EditorInput
            label={d("imageUrl")}
            id={`media-${kind}`}
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            type="url"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              {d("cancel")}
            </Button>
            <Button
              disabled={disabled || (!!url && !/^https:\/\//i.test(url))}
              onClick={() => {
                onChange(url);
                setOpen(false);
              }}
            >
              {d("apply")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
export function GeneralPanel({ draft, setDraft, disabled }: ContentPanelProps) {
  const t = useTranslations("Storefront");
  const d = useTranslations("StorefrontDesign");
  const set = (key: keyof StorefrontInput, value: string) =>
    setDraft((current) => ({ ...current, [key]: value }));
  const featured = draft.sections.find((s) => s.kind === "featured");
  return (
    <div className="sfe-pane-body">
      <EditorSection
        title={d("branding")}
        description={d("brandingDescription")}
      >
        <div className="sfe-branding-grid">
          <div className="sfe-logo-field">
            <Label>{t("fields.logo")}</Label>
            <MediaControl
              value={draft.logo}
              onChange={(v) => set("logo", v)}
              disabled={disabled}
              label={t("fields.logo")}
              kind="logo"
            />
            <p className="sfe-help">{d("logoHelp")}</p>
          </div>
          <div className="sfe-brand-controls">
            {(["primaryColor", "accentColor"] as const).map((key) => (
              <EditorField key={key} label={d(key)} id={key}>
                <div className="sfe-color-control">
                  <Input
                    type="color"
                    value={
                      /^#[a-fA-F0-9]{6}$/.test(draft[key])
                        ? draft[key]
                        : "#000000"
                    }
                    aria-label={d(key)}
                    disabled={disabled}
                    onChange={(e) => set(key, e.target.value)}
                  />
                  <Input
                    id={key}
                    value={draft[key]}
                    maxLength={7}
                    disabled={disabled}
                    onChange={(e) => set(key, e.target.value)}
                  />
                </div>
              </EditorField>
            ))}
            <EditorField label={t("font")} hint={d("fontHelp")}>
              <EditorSelect
                label={t("font")}
                value={draft.font}
                disabled={disabled}
                onChange={(v) => set("font", v)}
                options={[
                  { value: "sans", label: "Noto Sans" },
                  { value: "serif", label: "Noto Serif" },
                ]}
              />
            </EditorField>
            <EditorInput
              label={d("brandVoice")}
              value={draft.brandVoice}
              disabled={disabled}
              onChange={(e) => set("brandVoice", e.target.value)}
              hint={d("brandVoiceHelp")}
            />
          </div>
        </div>
      </EditorSection>
      <EditorSection
        title={d("information")}
        description={d("informationDescription")}
      >
        <div className="sfe-info-name">
          <EditorInput
            id="storeName"
            label={t("fields.storeName")}
            value={draft.storeName}
            disabled={disabled}
            maxLength={120}
            onChange={(e) => set("storeName", e.target.value)}
          />
          <EditorField
            label={t("fields.tagline")}
            id="tagline"
            count={`${draft.tagline.length}/300`}
          >
            <Input
              id="tagline"
              value={draft.tagline}
              disabled={disabled}
              maxLength={300}
              onChange={(e) => set("tagline", e.target.value)}
            />
          </EditorField>
        </div>
        <div className="sfe-info-contact">
          {(["email", "phone", "cta"] as const).map((key) => (
            <EditorInput
              key={key}
              id={key}
              label={t(`fields.${key}`)}
              type={key === "email" ? "email" : "text"}
              value={draft[key]}
              disabled={disabled}
              onChange={(e) => set(key, e.target.value)}
            />
          ))}
        </div>
        <div className="sfe-featured-toggle">
          <strong>{d("featuredSection")}</strong>
          <EditorSwitch
            id="show-featured"
            checked={featured?.visible ?? false}
            disabled={disabled}
            onCheckedChange={(v) =>
              setDraft((current) => ({
                ...current,
                sections: current.sections.map((s) =>
                  s.kind === "featured" ? { ...s, visible: v === true } : s,
                ),
              }))
            }
          />
          <div>
            <Label htmlFor="show-featured">{d("showFeatured")}</Label>
            <p className="sfe-help">{d("showFeaturedHelp")}</p>
          </div>
        </div>
      </EditorSection>
    </div>
  );
}
export function HomepagePanel({
  draft,
  setDraft,
  disabled,
  tours,
}: ContentPanelProps & { tours: PublicTour[] }) {
  const t = useTranslations("Storefront");
  const d = useTranslations("StorefrontDesign");
  const [reorder, setReorder] = useState(false);
  function update(
    index: number,
    patch: Partial<StorefrontInput["sections"][number]>,
  ) {
    setDraft((current) => ({
      ...current,
      sections: current.sections.map((section, i) =>
        i === index ? { ...section, ...patch } : section,
      ),
    }));
  }
  function move(index: number, delta: number) {
    setDraft((current) => {
      const sections = [...current.sections];
      const a = sections[index],
        b = sections[index + delta];
      if (!a || !b) return current;
      sections[index] = b;
      sections[index + delta] = a;
      return { ...current, sections };
    });
  }
  return (
    <div className="sfe-pane-body">
      <EditorSection
        title={d("homepageTitle")}
        description={d("homepageDescription")}
        action={
          <Button
            variant="outline"
            size="sm"
            aria-pressed={reorder}
            onClick={() => setReorder(!reorder)}
          >
            <List />
            {d("reorder")}
          </Button>
        }
      >
        <div className="sfe-section-list">
          {draft.sections.map((section, index) => (
            <Collapsible key={section.kind} className="sfe-section-row">
              <div className="sfe-section-row-main">
                <GripVertical className="sfe-grip" />
                <div className="sfe-section-row-text">
                  <strong>{d(`sectionNames.${section.kind}`)}</strong>
                  <p>{d(`sectionDescriptions.${section.kind}`)}</p>
                </div>
                <EditorSelect
                  label={`${d(`sectionNames.${section.kind}`)} ${t("layout")}`}
                  value={section.layout}
                  disabled={disabled}
                  onChange={(layout) =>
                    update(index, { layout: layout as typeof section.layout })
                  }
                  options={["standard", "split", "compact"].map((value) => ({
                    value,
                    label: t(`layouts.${value}`),
                  }))}
                />
                <div className="sfe-row-visible">
                  <EditorSwitch
                    id={`visible-${section.kind}`}
                    checked={section.visible}
                    disabled={disabled}
                    onCheckedChange={(v) =>
                      update(index, { visible: v === true })
                    }
                  />
                  <Label htmlFor={`visible-${section.kind}`}>
                    {d("visible")}
                  </Label>
                </div>
                <CollapsibleTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={d("editSection", {
                      section: d(`sectionNames.${section.kind}`),
                    })}
                  >
                    <ChevronDown />
                  </Button>
                </CollapsibleTrigger>
              </div>
              {reorder && (
                <div className="sfe-reorder">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={disabled || index === 0}
                    onClick={() => move(index, -1)}
                  >
                    <ArrowUp />
                    {t("moveUp")}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={disabled || index === draft.sections.length - 1}
                    onClick={() => move(index, 1)}
                  >
                    <ArrowDown />
                    {t("moveDown")}
                  </Button>
                </div>
              )}
              <CollapsibleContent className="sfe-section-edit">
                <EditorInput
                  label={t("sectionTitle")}
                  value={section.title}
                  disabled={disabled}
                  onChange={(e) => update(index, { title: e.target.value })}
                />
                {!["stats", "destinations"].includes(section.kind) && (
                  <EditorField label={t("content")}>
                    <Textarea
                      aria-label={t("content")}
                      value={section.body}
                      disabled={disabled}
                      rows={3}
                      onChange={(e) => update(index, { body: e.target.value })}
                    />
                  </EditorField>
                )}
                {["hero", "about", "testimonials", "faq"].includes(
                  section.kind,
                ) && (
                  <EditorInput
                    label={t("image")}
                    value={section.image}
                    disabled={disabled}
                    onChange={(e) => update(index, { image: e.target.value })}
                  />
                )}{" "}
                {section.kind === "featured" && (
                  <div className="sfe-tour-picker">
                    {tours.length ? (
                      tours.map((tour) => (
                        <div key={tour.id}>
                          <Checkbox
                            id={`pick-${tour.id}`}
                            checked={draft.featuredTourIds.includes(tour.id)}
                            disabled={disabled}
                            onCheckedChange={(checked) =>
                              setDraft((current) => ({
                                ...current,
                                featuredTourIds: checked
                                  ? [...current.featuredTourIds, tour.id]
                                  : current.featuredTourIds.filter(
                                      (id) => id !== tour.id,
                                    ),
                              }))
                            }
                          />
                          <Label htmlFor={`pick-${tour.id}`}>
                            {tour.data.title}
                          </Label>
                        </div>
                      ))
                    ) : (
                      <p className="sfe-help">{t("noPublishedTours")}</p>
                    )}
                  </div>
                )}
                {section.kind === "stats" && (
                  <p className="sfe-help">{d("statsHelp")}</p>
                )}
              </CollapsibleContent>
            </Collapsible>
          ))}
        </div>
      </EditorSection>
    </div>
  );
}
const policyIcons = [
  CalendarX,
  CalendarDays,
  CreditCard,
  Clock,
  Users,
  FileText,
  Users,
  List,
  ShieldCheck,
];
export function PoliciesPanel({
  draft,
  setDraft,
  disabled,
  showHistory,
}: ContentPanelProps & { showHistory: () => void }) {
  const t = useTranslations("Storefront");
  const d = useTranslations("StorefrontDesign");
  const [editing, setEditing] = useState<(typeof policyKinds)[number] | null>(
    null,
  );
  const [body, setBody] = useState("");
  return (
    <div className="sfe-pane-body">
      <EditorSection
        title={d("policiesTitle")}
        description={d("policiesDescription")}
        action={
          <Button variant="outline" size="sm" onClick={showHistory}>
            <History />
            {d("viewHistory")}
          </Button>
        }
      >
        <div className="sfe-policy-list">
          {policyKinds.map((key, index) => {
            const Icon = policyIcons[index] ?? FileText;
            return (
              <div key={key} className="sfe-policy-row">
                <Icon />
                <div>
                  <strong>{t(`policies.${key}`)}</strong>
                  <p>{d(`policyDescriptions.${key}`)}</p>
                </div>
                <Badge
                  variant="outline"
                  className={
                    draft.policies[key]
                      ? "sfe-status-ready"
                      : "sfe-status-empty"
                  }
                >
                  {draft.policies[key] ? d("configured") : d("empty")}
                </Badge>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={disabled}
                  onClick={() => {
                    setEditing(key);
                    setBody(draft.policies[key]);
                  }}
                >
                  {d("edit")}
                </Button>
              </div>
            );
          })}
        </div>
        <div className="sfe-policy-note">
          <ShieldCheck />
          <div>
            <strong>{d("policyDisplay")}</strong>
            <p>{d("policyDisplayHelp")}</p>
          </div>
        </div>
      </EditorSection>
      <Dialog
        open={editing !== null}
        onOpenChange={(open) => {
          if (!open) setEditing(null);
        }}
      >
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editing ? t(`policies.${editing}`) : d("policiesTitle")}
            </DialogTitle>
            <DialogDescription>{d("policyEditHelp")}</DialogDescription>
          </DialogHeader>
          <Textarea
            aria-label={editing ? t(`policies.${editing}`) : d("content")}
            rows={12}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            maxLength={20000}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>
              {d("cancel")}
            </Button>
            <Button
              disabled={disabled}
              onClick={() => {
                if (editing)
                  setDraft((current) => ({
                    ...current,
                    policies: { ...current.policies, [editing]: body },
                  }));
                setEditing(null);
              }}
            >
              {d("apply")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
