"use client";
import type { MarketingData } from "@nomera/schemas/finance";
import { Alert, AlertDescription } from "@nomera/ui/components/alert";
import { Badge } from "@nomera/ui/components/badge";
import { Button } from "@nomera/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@nomera/ui/components/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@nomera/ui/components/table";

import { ChartNoAxesColumn, Megaphone, Plus, Tag, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { majorToMinor } from "@/features/tours/request";
import { formatMoney } from "@/lib/format-money";
import { submitMarketing } from "./actions";
import {
  AnalyticsBars,
  CsvExport,
  MissingIntegration,
  Panel,
} from "./analytics";
import { operatorDate } from "./date";
import { Choice, FormInput, Metric, NoRecords } from "./shared";

export function MarketingView({
  data,
  canManage,
}: {
  data: MarketingData;
  canManage: boolean;
}) {
  const d = useTranslations("FinanceDesign");
  const t = useTranslations("Marketing"),
    f = useTranslations("Finance"),
    errors = useTranslations("Finance.errors"),
    locale = useLocale(),
    router = useRouter();
  const [open, setOpen] = useState(false),
    [action, setAction] = useState("promotion"),
    [kind, setKind] = useState("percent"),
    [currency, setCurrency] = useState("MNT"),
    [source, setSource] = useState("website"),
    [error, setError] = useState<string | null>(null),
    [pending, start] = useTransition();
  const submit = (input: unknown) =>
    start(async () => {
      setError(null);
      const result = await submitMarketing(input);
      if (!result.ok) {
        setError(errors(result.code));
        return;
      }
      setOpen(false);
      router.refresh();
    });
  return (
    <section className="admin-page finance-design" aria-busy={pending}>
      <header className="admin-page-heading">
        <div>
          <h1 className="text-[28px] font-semibold tracking-tight">
            {t("title")}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("description")}
          </p>
        </div>
        {canManage && (
          <Button
            onClick={() => {
              setError(null);
              setOpen(true);
            }}
          >
            <Plus aria-hidden="true" />
            {d("create")}
          </Button>
        )}
      </header>
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      <div className="admin-metrics">
        <Metric
          icon={<Megaphone aria-hidden="true" />}
          label={t("campaigns")}
          value={data.campaigns.length}
          note={d("recordedCampaigns")}
        />
        <Metric
          icon={<ChartNoAxesColumn aria-hidden="true" />}
          label={t("bookings")}
          value={data.sources.reduce((n, s) => n + s.bookings, 0)}
          note={d("allTime")}
        />
        <Metric
          icon={<Users aria-hidden="true" />}
          label={t("travelers")}
          value={data.sources.reduce((n, s) => n + s.travelers, 0)}
          note={d("allTime")}
        />
        <Metric
          icon={<Tag aria-hidden="true" />}
          label={t("redemptions")}
          value={data.promotions.reduce((n, p) => n + p.uses, 0)}
          note={d("recordedPromotions")}
        />
      </div>
      <div className="grid items-stretch gap-4 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <Panel title={d("acquisitions")}>
          <p className="mb-3 text-xs text-muted-foreground">
            {t("trafficNote")}
          </p>
          <AnalyticsBars
            rows={data.sources.map((s) => ({
              name: t(s.source),
              value: s.bookings,
              other: s.travelers,
            }))}
            primary={t("bookings")}
            secondary={t("travelers")}
          />
        </Panel>
        <Panel title={t("promotions")}>
          {!data.promotions.length ? (
            <NoRecords />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  {[
                    "code",
                    "discount",
                    "validity",
                    "redemptions",
                    "status",
                  ].map((k) => (
                    <TableHead key={k}>{t(k)}</TableHead>
                  ))}
                  {canManage && <TableHead>{t("actions")}</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.promotions.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.code}</TableCell>
                    <TableCell>
                      {p.kind === "percent"
                        ? `${p.value}% · ${p.currency}`
                        : formatMoney(p.value, p.currency, locale)}
                    </TableCell>
                    <TableCell>
                      {operatorDate(p.startsAt)} →{" "}
                      {p.endsAt ? operatorDate(p.endsAt) : t("noEnd")}
                    </TableCell>
                    <TableCell>
                      {p.uses}
                      {p.maxUses !== null ? ` / ${p.maxUses}` : ""}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {t(p.active ? "active" : "paused")}
                      </Badge>
                    </TableCell>
                    {canManage && (
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={pending}
                          onClick={() =>
                            submit({
                              action: "togglePromotion",
                              id: p.id,
                              active: !p.active,
                            })
                          }
                        >
                          {t(p.active ? "pause" : "activate")}
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Panel>
      </div>
      <div className="grid items-stretch gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <Panel
          title={d("campaignPerformance")}
          action={
            <CsvExport
              filename="nomera-campaigns"
              rows={[
                [
                  t("name"),
                  t("source"),
                  t("budget"),
                  f("currency"),
                  t("bookings"),
                  t("revenue"),
                ],
                ...data.campaigns.map((c) => [
                  c.name,
                  t(c.source),
                  c.budgetMinor / 100,
                  c.currency,
                  c.bookings,
                  c.revenueMinor / 100,
                ]),
              ]}
            />
          }
        >
          <p className="mb-4 text-sm text-muted-foreground">
            {t("attributionNote")}
          </p>
          {!data.campaigns.length ? (
            <NoRecords />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  {[
                    "name",
                    "source",
                    "dates",
                    "budget",
                    "bookings",
                    "revenue",
                  ].map((k) => (
                    <TableHead key={k}>{t(k)}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.campaigns.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.name}</TableCell>
                    <TableCell>{t(c.source)}</TableCell>
                    <TableCell>
                      {c.startsOn} → {c.endsOn}
                    </TableCell>
                    <TableCell>
                      {formatMoney(c.budgetMinor, c.currency, locale)}
                    </TableCell>
                    <TableCell>{c.bookings}</TableCell>
                    <TableCell>
                      {formatMoney(c.revenueMinor, c.currency, locale)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Panel>
        <Panel title={d("contentPerformance")}>
          <MissingIntegration text={d("emailNote")} />
        </Panel>
      </div>
      <Dialog
        open={open}
        onOpenChange={(value) => {
          if (!pending) setOpen(value);
        }}
      >
        <DialogContent
          closeLabel={f("close")}
          className="max-h-[90dvh] overflow-y-auto"
        >
          <DialogHeader>
            <DialogTitle>{t("create")}</DialogTitle>
            <DialogDescription>{t("createDescription")}</DialogDescription>
          </DialogHeader>
          <form
            className="grid gap-4"
            onSubmit={(event) => {
              event.preventDefault();
              const form = new FormData(event.currentTarget);
              const startDate = String(form.get("startsOn")),
                endDate = String(form.get("endsOn") ?? "");
              submit(
                action === "promotion"
                  ? {
                      action,
                      data: {
                        code: form.get("code"),
                        kind,
                        value:
                          kind === "percent"
                            ? Number(form.get("value"))
                            : majorToMinor(String(form.get("value") ?? "")),
                        currency,
                        startsAt: new Date(
                          `${startDate}T00:00:00+08:00`,
                        ).toISOString(),
                        endsAt: endDate
                          ? new Date(`${endDate}T23:59:59+08:00`).toISOString()
                          : null,
                        maxUses: form.get("maxUses")
                          ? Number(form.get("maxUses"))
                          : null,
                      },
                    }
                  : {
                      action,
                      name: form.get("name"),
                      source,
                      currency,
                      budgetMinor: majorToMinor(
                        String(form.get("budget") ?? ""),
                      ),
                      startsOn: startDate,
                      endsOn: endDate,
                    },
              );
            }}
          >
            <Choice
              name="action"
              label={t("type")}
              value={action}
              onChange={setAction}
              options={["promotion", "campaign"].map((v) => ({
                value: v,
                label: t(v),
              }))}
            />
            {action === "promotion" ? (
              <>
                <FormInput
                  name="code"
                  label={t("code")}
                  minLength={3}
                  maxLength={40}
                  pattern="[A-Za-z0-9_-]+"
                  required
                />
                <Choice
                  name="kind"
                  label={t("discountType")}
                  value={kind}
                  onChange={setKind}
                  options={["percent", "fixed"].map((v) => ({
                    value: v,
                    label: t(v),
                  }))}
                />
                <FormInput
                  name="value"
                  label={t("discount")}
                  type="number"
                  min={kind === "percent" ? 1 : 0.01}
                  max={kind === "percent" ? 100 : undefined}
                  step={kind === "percent" ? 1 : 0.01}
                  required
                />
                <FormInput
                  name="maxUses"
                  label={t("maxUses")}
                  type="number"
                  min="1"
                  max="1000000"
                  step="1"
                />
              </>
            ) : (
              <>
                <FormInput
                  name="name"
                  label={t("name")}
                  maxLength={120}
                  required
                />
                <Choice
                  name="source"
                  label={t("source")}
                  value={source}
                  onChange={setSource}
                  options={["direct", "website", "agent", "other"].map((v) => ({
                    value: v,
                    label: t(v),
                  }))}
                />
                <FormInput
                  name="budget"
                  label={t("budget")}
                  type="number"
                  min="0"
                  step="0.01"
                  required
                />
              </>
            )}
            <Choice
              name="currency"
              label={f("currency")}
              value={currency}
              onChange={setCurrency}
              options={["MNT", "USD"].map((v) => ({ value: v, label: v }))}
            />
            <div className="grid grid-cols-2 gap-3">
              <FormInput
                name="startsOn"
                label={t("startsOn")}
                type="date"
                required
              />
              <FormInput
                name="endsOn"
                label={t("endsOn")}
                type="date"
                required={action === "campaign"}
              />
            </div>
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <Button type="submit" disabled={pending}>
              {pending ? f("saving") : f("save")}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </section>
  );
}
