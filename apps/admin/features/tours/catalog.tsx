"use client";

import type { TourCatalog, TourCatalogFilter } from "@nomera/schemas/tours";
import { Badge } from "@nomera/ui/components/badge";
import { Button } from "@nomera/ui/components/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@nomera/ui/components/card";
import { ChartContainer } from "@nomera/ui/components/chart";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@nomera/ui/components/empty";
import { Field, FieldLabel } from "@nomera/ui/components/field";
import { Input } from "@nomera/ui/components/input";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
} from "@nomera/ui/components/pagination";
import {
  Select,
  SelectContent,
  SelectGroup,
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
import { Tabs, TabsList, TabsTrigger } from "@nomera/ui/components/tabs";
import {
  ChartNoAxesColumn,
  ChevronLeft,
  ChevronRight,
  FileText,
  ImageOff,
  Map as MapIcon,
  Plus,
  Search,
  Trophy,
} from "lucide-react";
import Image from "next/image";
import { Cell, Pie, PieChart } from "recharts";
import "./catalog.css";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { formatMoney } from "@/lib/format-money";

export function TourCatalogView({
  catalog,
  canManage,
}: {
  catalog: TourCatalog;
  canManage: boolean;
}) {
  const t = useTranslations("Tours");
  const d = useTranslations("TourDesign");
  const locale = useLocale();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [search, setSearch] = useState(catalog.filter.search);
  const [destination, setDestination] = useState(catalog.filter.destination);
  const [category, setCategory] = useState(catalog.filter.category);
  const pageCount = Math.max(
    1,
    Math.ceil(catalog.total / catalog.filter.pageSize),
  );
  function navigate(change: Partial<TourCatalogFilter>) {
    const filter = { ...catalog.filter, ...change };
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(filter))
      if (value !== "" && !(key === "status" && value === "all"))
        query.set(key, String(value));
    startTransition(() => router.push(`/tours?${query.toString()}`));
  }
  const amount = (minor: number, currency: string) =>
    formatMoney(minor, currency, locale);
  const featured = [...catalog.items].sort(
    (a, b) => b.confirmedBookings - a.confirmedBookings,
  )[0];
  const completeness = (
    ["basic", "itinerary", "media", "pricing"] as const
  ).map((key) => ({ key, count: catalog.summary[key] }));
  const complete = catalog.counts.total
    ? Math.round(
        (completeness.reduce((n, r) => n + r.count, 0) /
          (catalog.counts.total * 4)) *
          100,
      )
    : 0;
  return (
    <section className="admin-page tour-catalog" aria-busy={pending}>
      <header className="admin-page-heading">
        <div>
          <h1 className="text-[28px] font-semibold tracking-tight">
            {t("title")}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("catalogDescription")}
          </p>
        </div>
        {canManage && (
          <Button asChild>
            <Link href="/tours/new">
              <Plus aria-hidden="true" />
              {t("addTour")}
            </Link>
          </Button>
        )}
      </header>
      <Card className="tour-filter-panel min-w-0 gap-0">
        <CardContent className="tour-filterbar">
          <Tabs
            value={catalog.filter.status}
            onValueChange={(status) =>
              navigate({
                status: status as TourCatalogFilter["status"],
                page: 1,
              })
            }
          >
            <TabsList
              variant="line"
              className="grid h-auto w-full grid-cols-2 sm:flex sm:w-fit"
            >
              {(["all", "published", "draft", "archived"] as const).map(
                (status) => (
                  <TabsTrigger
                    key={status}
                    value={status}
                    disabled={pending}
                    className="min-h-10 gap-2 px-3"
                  >
                    {t(`status.${status}`)}
                  </TabsTrigger>
                ),
              )}
            </TabsList>
          </Tabs>
          <form
            className="tour-filter-form"
            onSubmit={(event) => {
              event.preventDefault();
              navigate({ search, destination, category, page: 1 });
            }}
          >
            <Field>
              <FieldLabel className="sr-only" htmlFor="tour-search">
                {t("search")}
              </FieldLabel>
              <Input
                id="tour-search"
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                maxLength={200}
                placeholder={t("searchPlaceholder")}
              />
            </Field>
            <Field>
              <FieldLabel className="sr-only" htmlFor="tour-destination">
                {t("destination")}
              </FieldLabel>
              <Select
                value={destination ? `value:${destination}` : "any"}
                onValueChange={(value) => {
                  const next = value === "any" ? "" : value.slice(6);
                  setDestination(next);
                  navigate({ destination: next, search, category, page: 1 });
                }}
              >
                <SelectTrigger id="tour-destination" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="any">{t("allDestinations")}</SelectItem>
                    {catalog.facets.destinations.map((value) => (
                      <SelectItem key={value} value={`value:${value}`}>
                        {value}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>
            <Field>
              <FieldLabel className="sr-only" htmlFor="tour-category">
                {t("category")}
              </FieldLabel>
              <Select
                value={category ? `value:${category}` : "any"}
                onValueChange={(value) => {
                  const next = value === "any" ? "" : value.slice(6);
                  setCategory(next);
                  navigate({ category: next, search, destination, page: 1 });
                }}
              >
                <SelectTrigger id="tour-category" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="any">{t("allCategories")}</SelectItem>
                    {catalog.facets.categories.map((value) => (
                      <SelectItem key={value} value={`value:${value}`}>
                        {value}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>
            <Button
              type="submit"
              variant="outline"
              size="icon"
              aria-label={t("apply")}
              disabled={pending}
            >
              <Search aria-hidden="true" />
            </Button>
          </form>
        </CardContent>
      </Card>
      <div className="admin-metrics">
        {[
          {
            label: d("published"),
            value: catalog.counts.published,
            icon: MapIcon,
            note: d("catalogScope"),
          },
          {
            label: d("draft"),
            value: catalog.counts.draft,
            icon: FileText,
            note: d("catalogScope"),
          },
          {
            label: d("confirmedBookings"),
            value: catalog.summary.bookings,
            icon: ChartNoAxesColumn,
            note: d("allTime"),
          },
          {
            label: d("topCategory"),
            value: catalog.summary.topCategory ?? "—",
            icon: Trophy,
            note: catalog.summary.bookings
              ? d("bookingShare", {
                  percent: Math.round(
                    (catalog.summary.topCategoryBookings /
                      catalog.summary.bookings) *
                      100,
                  ),
                })
              : d("noBookings"),
          },
        ].map((metric) => (
          <Card key={metric.label} className="admin-metric">
            <CardContent>
              <span className="admin-metric-icon">
                <metric.icon aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <p className="text-xs font-medium text-muted-foreground">
                  {metric.label}
                </p>
                <p className="mt-2 break-words text-2xl font-semibold tabular-nums">
                  {metric.value}
                </p>
                <p className="mt-2 text-xs text-muted-foreground">
                  {metric.note}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      <Card className="admin-panel min-w-0 gap-3">
        <CardHeader>
          <CardTitle>
            {t("title")} ({catalog.total})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {catalog.items.length ? (
            <Table
              aria-label={t("tableLabel")}
              containerProps={{ tabIndex: 0, "aria-label": t("tableLabel") }}
            >
              <TableHeader>
                <TableRow>
                  {["tour", "destination", "duration", "category"].map(
                    (key) => (
                      <TableHead key={key}>{t(key)}</TableHead>
                    ),
                  )}
                  <TableHead>{d("nextDeparture")}</TableHead>
                  <TableHead>{t("basePrice")}</TableHead>
                  <TableHead>{t("statusLabel")}</TableHead>
                  <TableHead>{d("performance")}</TableHead>
                  <TableHead>
                    <span className="sr-only">{d("details")}</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {catalog.items.map((tour) => (
                  <TableRow key={tour.id}>
                    <TableCell className="min-w-56">
                      <div className="flex items-center gap-3">
                        {tour.media[0] ? (
                          <Image
                            src={tour.media[0].url}
                            alt={tour.media[0].alt}
                            width={40}
                            height={40}
                            unoptimized
                            className="size-10 shrink-0 rounded-sm object-cover"
                          />
                        ) : (
                          <span className="flex size-10 shrink-0 items-center justify-center rounded-sm bg-muted">
                            <ImageOff
                              className="size-4 text-muted-foreground"
                              aria-label={d("noImage")}
                            />
                          </span>
                        )}
                        <div>
                          <Button
                            asChild
                            variant="link"
                            className="h-auto max-w-64 justify-start p-0 text-left text-xs font-medium whitespace-normal"
                          >
                            <Link href={`/tours/${tour.id}`}>{tour.title}</Link>
                          </Button>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {tour.code || t("noCode")}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{tour.destination || "—"}</TableCell>
                    <TableCell>
                      {t("days", { count: tour.durationDays })}
                    </TableCell>
                    <TableCell>
                      {tour.category ? (
                        <Badge variant="secondary">{tour.category}</Badge>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell>
                      {tour.nextDeparture
                        ? new Intl.DateTimeFormat(locale, {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                            timeZone: "UTC",
                          }).format(new Date(`${tour.nextDeparture}T00:00:00Z`))
                        : d("unscheduled")}
                    </TableCell>
                    <TableCell className="tabular-nums">
                      {amount(tour.basePriceMinor, tour.currency)}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="secondary"
                        className={
                          tour.status === "published" ? "tour-published" : ""
                        }
                      >
                        {t(`status.${tour.status}`)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <p className="text-xs font-medium">
                        {d("bookings", { count: tour.confirmedBookings })}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {d("travelers", { count: tour.confirmedTravelers })}
                      </p>
                    </TableCell>
                    <TableCell>
                      <Button asChild size="icon" variant="ghost">
                        <Link
                          href={`/tours/${tour.id}`}
                          aria-label={d("tourDetails", { title: tour.title })}
                        >
                          <ChevronRight aria-hidden="true" />
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <Empty className="min-h-64">
              <EmptyHeader>
                <EmptyTitle>
                  {t(catalog.counts.total ? "noResults" : "emptyTitle")}
                </EmptyTitle>
                <EmptyDescription>
                  {t(
                    catalog.counts.total
                      ? "noResultsDescription"
                      : "emptyDescription",
                  )}
                </EmptyDescription>
              </EmptyHeader>
              {catalog.counts.total > 0 ? (
                <Button asChild variant="outline">
                  <Link href="/tours">{t("clearFilters")}</Link>
                </Button>
              ) : (
                canManage && (
                  <Button asChild>
                    <Link href="/tours/new">{t("addTour")}</Link>
                  </Button>
                )
              )}
            </Empty>
          )}
          <footer className="flex flex-wrap items-center justify-between gap-3 border-t py-3 text-sm text-muted-foreground">
            <p>{t("results", { count: catalog.total })}</p>
            <Pagination aria-label={t("pagination")} className="mx-0 w-auto">
              <PaginationContent className="gap-2">
                <PaginationItem>
                  <Button
                    variant="outline"
                    size="icon"
                    aria-label={t("previousPage")}
                    disabled={pending || catalog.filter.page <= 1}
                    onClick={() => navigate({ page: catalog.filter.page - 1 })}
                  >
                    <ChevronLeft aria-hidden="true" />
                  </Button>
                </PaginationItem>
                {Array.from(
                  { length: Math.min(pageCount, 5) },
                  (_, i) =>
                    Math.min(
                      Math.max(1, catalog.filter.page - 2),
                      Math.max(1, pageCount - 4),
                    ) + i,
                ).map((page) => (
                  <PaginationItem key={page}>
                    <Button
                      variant={
                        page === catalog.filter.page ? "secondary" : "ghost"
                      }
                      size="icon"
                      aria-current={
                        page === catalog.filter.page ? "page" : undefined
                      }
                      aria-label={t("page", { page, total: pageCount })}
                      disabled={pending}
                      onClick={() => navigate({ page })}
                    >
                      {page}
                    </Button>
                  </PaginationItem>
                ))}
                <PaginationItem>
                  <Button
                    variant="outline"
                    size="icon"
                    aria-label={t("nextPage")}
                    disabled={pending || catalog.filter.page >= pageCount}
                    onClick={() => navigate({ page: catalog.filter.page + 1 })}
                  >
                    <ChevronRight aria-hidden="true" />
                  </Button>
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </footer>
        </CardContent>
      </Card>
      <div className="grid items-stretch gap-4 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <Card className="admin-panel min-w-0 gap-3">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>{d("featured")}</CardTitle>
            {featured && (
              <Button asChild variant="ghost" size="sm">
                <Link href={`/tours/${featured.id}`}>{d("details")}</Link>
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {featured ? (
              <div className="flex flex-col gap-5 sm:flex-row">
                {featured.media[0] ? (
                  <Image
                    src={featured.media[0].url}
                    alt={featured.media[0].alt}
                    width={176}
                    height={136}
                    unoptimized
                    className="h-36 w-full rounded-sm object-cover sm:w-44"
                  />
                ) : (
                  <div className="flex h-36 w-full shrink-0 items-center justify-center rounded-sm bg-muted sm:w-44">
                    <ImageOff
                      className="size-8 text-muted-foreground"
                      aria-label={d("noImage")}
                    />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-base font-semibold">{featured.title}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {featured.code} ·{" "}
                    {t("days", { count: featured.durationDays })} ·{" "}
                    {featured.destination}
                  </p>
                  <div className="mt-5 grid grid-cols-3 divide-x">
                    <div>
                      <p className="text-lg font-semibold">
                        {featured.confirmedBookings}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {d("confirmedBookings")}
                      </p>
                    </div>
                    <div className="px-3">
                      <p className="text-lg font-semibold break-words">
                        {amount(featured.revenueMinor, featured.currency)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {d("revenue", { currency: featured.currency })}
                      </p>
                    </div>
                    <div className="pl-3">
                      <p className="text-lg font-semibold">
                        {featured.confirmedTravelers}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {t("travelers")}
                      </p>
                    </div>
                  </div>
                  <p className="mt-3 text-xs text-muted-foreground">
                    {d("featuredScope")}
                  </p>
                </div>
              </div>
            ) : (
              <p className="py-8 text-sm text-muted-foreground">
                {d("noFeatured")}
              </p>
            )}
          </CardContent>
        </Card>
        <Card className="admin-panel min-w-0 gap-3">
          <CardHeader>
            <CardTitle>{d("completeness")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center gap-4 sm:flex-row">
              <div className="relative w-36 shrink-0">
                <ChartContainer
                  config={{ value: { color: "var(--primary)" } }}
                  className="size-36"
                >
                  <PieChart>
                    <Pie
                      data={[{ value: complete }, { value: 100 - complete }]}
                      dataKey="value"
                      innerRadius={48}
                      outerRadius={66}
                      startAngle={90}
                      endAngle={-270}
                      isAnimationActive={false}
                    >
                      <Cell fill="var(--primary)" />
                      <Cell fill="var(--muted)" />
                    </Pie>
                  </PieChart>
                </ChartContainer>
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                  <p className="text-xl font-semibold">{complete}%</p>
                  <p className="text-xs text-muted-foreground">
                    {d("complete")}
                  </p>
                </div>
              </div>
              <div className="min-w-0 flex-1 space-y-3">
                {completeness.map((row) => (
                  <div
                    key={row.key}
                    className="flex justify-between gap-4 text-xs"
                  >
                    <span>{d(row.key)}</span>
                    <span className="tabular-nums text-muted-foreground">
                      {row.count}/{catalog.counts.total}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              {d("completenessNote")}
            </p>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
