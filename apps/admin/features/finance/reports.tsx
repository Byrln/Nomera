"use client";
import type { ReportsData } from "@nomera/schemas/finance";
import { Button } from "@nomera/ui/components/button";
import { Input } from "@nomera/ui/components/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@nomera/ui/components/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@nomera/ui/components/table";
import { CalendarDays, ChartNoAxesColumn, Coins, Users } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { formatMoney } from "@/lib/format-money";
import { AnalyticsBars, CsvExport, Panel, SourceDonut } from "./analytics";
import { Metric, MoneyFilter, NoRecords } from "./shared";
export function ReportsView({ data }: { data: ReportsData }) {
  const t = useTranslations("Reports"),
    m = useTranslations("Marketing"),
    d = useTranslations("FinanceDesign"),
    locale = useLocale();
  const router = useRouter(),
    query = useSearchParams();
  const changeFilter = (key: string, value: string) => {
    const params = new URLSearchParams(query.toString());
    if (value === "all") params.delete(key);
    else params.set(key, value);
    router.push(`/reports?${params}`);
  };
  const [search, setSearch] = useState("");
  const [measure, setMeasure] = useState<"bookings" | "revenue">("bookings");
  const money = (n: number) =>
    `${n < 0 ? "−" : ""}${formatMoney(Math.abs(n), data.currency, locale)}`;
  const filtered = data.tours.filter((r) =>
    r.name.toLocaleLowerCase(locale).includes(search.toLocaleLowerCase(locale)),
  );
  const rows = (group: "destinations" | "sources" | "tours") => [
    [t(group), t("bookings"), t("travelers"), t("revenue"), d("currency")],
    ...data[group].map((r) => [
      group === "sources" ? m(r.name) : r.name,
      r.bookings,
      r.travelers,
      r.revenueMinor / 100,
      data.currency,
    ]),
  ];
  return (
    <section className="admin-page finance-design">
      <header className="admin-page-heading">
        <div>
          <h1 className="text-[28px] font-semibold tracking-tight">
            {t("title")}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("description")}
          </p>
        </div>
      </header>
      <div className="admin-metrics">
        <Metric
          icon={<CalendarDays aria-hidden="true" />}
          label={t("bookings")}
          value={data.bookings}
          note={d("allTime")}
        />
        <Metric
          icon={<Coins aria-hidden="true" />}
          label={t("revenue")}
          value={money(data.revenueMinor)}
          note={d("allTime")}
        />
        <Metric
          icon={<Users aria-hidden="true" />}
          label={t("travelers")}
          value={data.travelers}
          note={d("allTime")}
        />
        <Metric
          icon={<ChartNoAxesColumn aria-hidden="true" />}
          label={t("margin")}
          value={
            data.grossMarginMinor === null
              ? t("noCosts")
              : money(data.grossMarginMinor)
          }
          note={d("costed", {
            count: data.costedBookings,
            total: data.bookings,
          })}
        />
      </div>
      <div className="flex flex-wrap items-end gap-4 rounded-md border bg-card p-4">
        <div className="grid gap-2">
          <span className="text-xs font-medium">{d("scope")}</span>
          <p className="flex h-9 items-center gap-2 text-sm">
            <CalendarDays className="size-4" aria-hidden="true" />
            {d("confirmedAllTime")}
          </p>
        </div>
        <div className="grid gap-2">
          <span className="text-xs font-medium">{d("currency")}</span>
          <MoneyFilter currency={data.currency} path="/reports" />
        </div>
        {(["destination", "channel"] as const).map((key) => (
          <div key={key} className="grid gap-2">
            <span className="text-xs font-medium">{d(key)}</span>
            <Select
              value={query.get(key) ?? "all"}
              onValueChange={(value) => changeFilter(key, value)}
            >
              <SelectTrigger className="w-44" aria-label={d(key)}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{d("all")}</SelectItem>
                {(key === "destination"
                  ? data.availableDestinations.filter(Boolean)
                  : ["direct", "website", "agent", "other"]
                ).map((value) => (
                  <SelectItem key={value} value={value}>
                    {key === "channel" ? m(value) : value}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ))}
        <div className="ml-auto">
          <CsvExport
            filename={`nomera-report-${data.currency}`}
            rows={rows("tours")}
          />
        </div>
      </div>
      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <div className="grid min-w-0 gap-4">
          <Panel
            title={d("bookingTrend")}
            action={
              <div className="flex gap-1">
                {(["bookings", "revenue"] as const).map((v) => (
                  <Button
                    key={v}
                    variant={measure === v ? "secondary" : "ghost"}
                    size="sm"
                    onClick={() => setMeasure(v)}
                  >
                    {t(v)}
                  </Button>
                ))}
              </div>
            }
          >
            <p className="mb-2 text-xs text-muted-foreground">
              {d("latestMonths")}
              {measure === "revenue" ? ` · ${data.currency}` : ""}
            </p>
            <AnalyticsBars
              rows={data.monthly.map((r) => ({
                name: r.month,
                value: measure === "bookings" ? r.bookings : r.revenueMinor,
              }))}
              primary={t(measure)}
              money={measure === "revenue"}
            />
          </Panel>
          <Panel title={t("title")}>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{d("reportName")}</TableHead>
                  <TableHead>{d("scope")}</TableHead>
                  <TableHead>{d("format")}</TableHead>
                  <TableHead className="text-right">{d("export")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(["destinations", "sources", "tours"] as const).map(
                  (group) => (
                    <TableRow key={group}>
                      <TableCell className="font-medium">{t(group)}</TableCell>
                      <TableCell>{d("allTime")}</TableCell>
                      <TableCell>CSV</TableCell>
                      <TableCell className="text-right">
                        <CsvExport
                          rows={rows(group)}
                          filename={`nomera-${group}-${data.currency}`}
                        />
                      </TableCell>
                    </TableRow>
                  ),
                )}
              </TableBody>
            </Table>
          </Panel>
        </div>
        <div className="grid min-w-0 gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Panel title={d("topDestinations")}>
              {!data.destinations.length ? (
                <NoRecords />
              ) : (
                <div className="divide-y">
                  {data.destinations.slice(0, 5).map((r, i) => (
                    <div key={r.name} className="flex items-center gap-3 py-3">
                      <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs">
                        {i + 1}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">
                          {r.name || t("unspecified")}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {r.bookings} {t("bookings")}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Panel>
            <Panel title={d("sourceMix")}>
              <SourceDonut
                rows={data.sources.map((r) => ({
                  name: m(r.name),
                  value: r.bookings,
                }))}
              />
            </Panel>
          </div>
          <Panel title={d("topTours")}>
            <Input
              aria-label={d("searchTours")}
              placeholder={d("searchTours")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="mb-3"
            />
            {!filtered.length ? (
              <NoRecords />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("tours")}</TableHead>
                    <TableHead className="text-right">
                      {t("bookings")}
                    </TableHead>
                    <TableHead className="text-right">{t("revenue")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((r) => (
                    <TableRow key={r.name}>
                      <TableCell className="font-medium">{r.name}</TableCell>
                      <TableCell className="text-right">{r.bookings}</TableCell>
                      <TableCell className="text-right">
                        {money(r.revenueMinor)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Panel>
        </div>
      </div>
    </section>
  );
}
