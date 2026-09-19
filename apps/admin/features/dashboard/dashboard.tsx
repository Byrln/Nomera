"use client";

import {
  type DashboardFilter,
  type DashboardResponse,
  dashboardFilterSchema,
  dashboardResponseSchema,
} from "@nomera/schemas/dashboard";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@nomera/ui/components/alert";
import { Badge } from "@nomera/ui/components/badge";
import { Button } from "@nomera/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@nomera/ui/components/card";
import { ChartContainer } from "@nomera/ui/components/chart";
import { Checkbox } from "@nomera/ui/components/checkbox";
import {
  Collapsible,
  CollapsibleContent,
} from "@nomera/ui/components/collapsible";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@nomera/ui/components/empty";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@nomera/ui/components/field";
import { Input } from "@nomera/ui/components/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@nomera/ui/components/select";
import { Skeleton } from "@nomera/ui/components/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@nomera/ui/components/table";

import { cn } from "@nomera/ui/lib/utils";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  CircleAlert,
  Compass,
  Map as MapIcon,
  RefreshCw,
  SlidersHorizontal,
} from "lucide-react";
import { useReducedMotion } from "motion/react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import {
  type FormEvent,
  type ReactNode,
  useEffect,
  useMemo,
  useState,
} from "react";
import { Cell, Pie, PieChart } from "recharts";
import { Ring } from "@/components/charts/ring";
import { RingCenter } from "@/components/charts/ring-center";
import { RingChart } from "@/components/charts/ring-chart";
import "./dashboard.css";

class DashboardRequestError extends Error {
  constructor(readonly status: number) {
    super("Dashboard request failed");
  }
}

async function fetchDashboard(
  tenantId: string,
  filter: DashboardFilter,
  signal: AbortSignal,
) {
  const response = await fetch(
    `/api/dashboard?${new URLSearchParams(filter)}`,
    { signal, cache: "no-store", credentials: "same-origin" },
  );
  if (!response.ok) throw new DashboardRequestError(response.status);
  const payload: unknown = await response.json();
  const parsed = dashboardResponseSchema.safeParse(
    typeof payload === "object" && payload !== null && "data" in payload
      ? payload.data
      : undefined,
  );
  if (!parsed.success || parsed.data.tenantId !== tenantId)
    throw new DashboardRequestError(403);
  return parsed.data;
}

export function Dashboard({
  tenantId,
  initialFilter,
}: {
  tenantId: string;
  workspaceName: string;
  initialFilter: DashboardFilter;
}) {
  const t = useTranslations("Dashboard");
  const design = useTranslations("AdminDesign");
  const locale = useLocale();
  const params = useSearchParams();
  const filter = useMemo(() => {
    const requested = dashboardFilterSchema.safeParse({
      from: params.get("from") ?? initialFilter.from,
      to: params.get("to") ?? initialFilter.to,
      currency: params.get("currency") ?? initialFilter.currency,
    });
    return requested.success ? requested.data : initialFilter;
  }, [params, initialFilter]);
  const [draft, setDraft] = useState(initialFilter);
  const [invalid, setInvalid] = useState(false);
  const [compare, setCompare] = useState(true);
  const [filtersOpen, setFiltersOpen] = useState(false);
  useEffect(() => {
    setDraft(filter);
    setInvalid(false);
  }, [filter]);
  const query = useQuery({
    queryKey: ["dashboard", tenantId, filter],
    queryFn: ({ signal }) => fetchDashboard(tenantId, filter, signal),
    retry: false,
    staleTime: 0,
    gcTime: 0,
    refetchInterval: 60_000,
  });
  function apply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = dashboardFilterSchema.safeParse(draft);
    setInvalid(!parsed.success);
    if (parsed.success) {
      window.history.replaceState(
        null,
        "",
        `/dashboard?${new URLSearchParams(parsed.data)}`,
      );
    }
  }
  return (
    <div className="dashboard-container">
      <h1 className="sr-only">{t("title")}</h1>
      <div className="dashboard-page-tools">
        <span>{t("performanceNote")}</span>
        <div>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={design("filterOptions")}
            onClick={() => setFiltersOpen(!filtersOpen)}
          >
            <SlidersHorizontal aria-hidden="true" />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={t(query.isFetching ? "refreshing" : "refresh")}
            onClick={() => void query.refetch()}
            disabled={query.isFetching}
          >
            <RefreshCw aria-hidden="true" data-icon="inline-start" />
          </Button>
        </div>
      </div>
      <Collapsible open={filtersOpen} onOpenChange={setFiltersOpen}>
        <CollapsibleContent>
          <form onSubmit={apply}>
            <FieldGroup className="dashboard-filters">
              <FieldGroup className="dashboard-date-fields">
                <Field data-invalid={invalid}>
                  <FieldLabel htmlFor="dashboard-from">{t("from")}</FieldLabel>
                  <Input
                    id="dashboard-from"
                    type="date"
                    required
                    value={draft.from}
                    onChange={(event) =>
                      setDraft({ ...draft, from: event.target.value })
                    }
                    aria-invalid={invalid}
                    aria-describedby={invalid ? "filter-error" : undefined}
                  />
                </Field>
                <span aria-hidden="true" className="date-separator">
                  –
                </span>
                <Field data-invalid={invalid}>
                  <FieldLabel htmlFor="dashboard-to">{t("to")}</FieldLabel>
                  <Input
                    id="dashboard-to"
                    type="date"
                    required
                    value={draft.to}
                    onChange={(event) =>
                      setDraft({ ...draft, to: event.target.value })
                    }
                    aria-invalid={invalid}
                    aria-describedby={invalid ? "filter-error" : undefined}
                  />
                </Field>
              </FieldGroup>
              <Field className="dashboard-currency-field">
                <FieldLabel htmlFor="dashboard-currency">
                  {t("currency")}
                </FieldLabel>
                <Select
                  value={draft.currency}
                  onValueChange={(value) =>
                    setDraft({
                      ...draft,
                      currency: value === "USD" ? "USD" : "MNT",
                    })
                  }
                >
                  <SelectTrigger id="dashboard-currency">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value="MNT">MNT · ₮</SelectItem>
                      <SelectItem value="USD">USD · $</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>
              <Button
                type="submit"
                variant="outline"
                disabled={query.isFetching}
              >
                {t("apply")}
              </Button>
              <Field orientation="horizontal" className="dashboard-compare">
                <Checkbox
                  id="dashboard-compare"
                  checked={compare}
                  onCheckedChange={(checked) => setCompare(checked === true)}
                />
                <FieldLabel htmlFor="dashboard-compare">
                  {t("compare")}
                </FieldLabel>
              </Field>
              {invalid && (
                <FieldError
                  id="filter-error"
                  className="dashboard-filter-error"
                >
                  {t("invalidRange")}
                </FieldError>
              )}
            </FieldGroup>
          </form>
        </CollapsibleContent>
      </Collapsible>
      {query.isPending ? (
        <DashboardLoading />
      ) : query.isError ? (
        <Alert className="dashboard-error">
          <CircleAlert aria-hidden="true" size={25} />
          <AlertTitle>
            <h2>
              {t(
                query.error instanceof DashboardRequestError &&
                  query.error.status === 403
                  ? "accessTitle"
                  : query.error instanceof DashboardRequestError &&
                      query.error.status === 401
                    ? "sessionTitle"
                    : "errorTitle",
              )}
            </h2>
          </AlertTitle>
          <AlertDescription>
            {t(
              query.error instanceof DashboardRequestError &&
                query.error.status === 403
                ? "accessDescription"
                : query.error instanceof DashboardRequestError &&
                    query.error.status === 401
                  ? "sessionDescription"
                  : "errorDescription",
            )}
          </AlertDescription>
          {query.error instanceof DashboardRequestError &&
          (query.error.status === 401 || query.error.status === 403) ? (
            <Button asChild variant="outline">
              <Link
                href={query.error.status === 401 ? "/sign-in" : "/workspaces"}
              >
                {t(query.error.status === 401 ? "signIn" : "switchWorkspace")}
              </Link>
            </Button>
          ) : (
            <Button variant="outline" onClick={() => void query.refetch()}>
              {t("retry")}
            </Button>
          )}
        </Alert>
      ) : (
        <DashboardContent data={query.data} compare={compare} />
      )}
      {query.data && !query.isError && (
        <p className="dashboard-updated" role="status">
          {t("updated", {
            time: new Intl.DateTimeFormat(locale, {
              hour: "2-digit",
              minute: "2-digit",
              hourCycle: "h23",
              timeZone: "Asia/Ulaanbaatar",
            }).format(new Date(query.data.generatedAt)),
          })}{" "}
          · {t("timezone")}
        </p>
      )}
    </div>
  );
}

function Panel({
  title,
  caption,
  children,
  className = "",
}: {
  title: string;
  caption?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Card size="sm" className={cn("dashboard-panel", className)}>
      <CardHeader className="dashboard-panel-heading">
        <CardTitle>
          <h2>{title}</h2>
        </CardTitle>
        {caption && <CardDescription>{caption}</CardDescription>}
      </CardHeader>
      <CardContent className="dashboard-panel-content">{children}</CardContent>
    </Card>
  );
}

function DashboardContent({
  data,
  compare,
}: {
  data: DashboardResponse;
  compare: boolean;
}) {
  const t = useTranslations("Dashboard");
  const locale = useLocale();
  const design = useTranslations("AdminDesign");
  const reduceMotion = useReducedMotion();
  const number = new Intl.NumberFormat(locale);
  const date = (iso: string) =>
    new Intl.DateTimeFormat(locale, {
      month: locale === "mn" ? "numeric" : "short",
      day: "numeric",
      timeZone: "Asia/Ulaanbaatar",
    }).format(new Date(iso.length === 10 ? `${iso}T04:00:00Z` : iso));
  const departureTotals = data.departures.reduce(
    (totals, departure) => ({
      capacity: totals.capacity + departure.capacity,
      reserved: totals.reserved + departure.reserved,
    }),
    { capacity: 0, reserved: 0 },
  );
  const fillRate = departureTotals.capacity
    ? Math.round((departureTotals.reserved / departureTotals.capacity) * 1000) /
      10
    : null;
  const days =
    Math.floor(
      (Date.parse(data.filter.to) - Date.parse(data.filter.from)) / 86_400_000,
    ) + 1;
  const pace = data.metrics.bookings.value / days;
  const paceValue = Math.round(pace * 10) / 10;
  const peakDaily = Math.max(
    1,
    paceValue,
    ...data.trend.map((point) => point.bookings),
  );
  const attentionDepartures =
    data.departureSummary.lowCapacity + data.departureSummary.atRisk;
  const healthTotal = Object.values(data.departureSummary).reduce(
    (sum, value) => sum + value,
    0,
  );
  const health = (["onTrack", "lowCapacity", "atRisk"] as const).map((key) => ({
    key,
    value: data.departureSummary[key],
    percent: healthTotal
      ? Math.round((data.departureSummary[key] / healthTotal) * 100)
      : 0,
  }));
  const featured = data.departures[0];
  const gauge = [
    { key: "filled", value: fillRate ?? 0, fill: "var(--dashboard-warm)" },
    {
      key: "open",
      value: fillRate === null ? 100 : 100 - fillRate,
      fill: "var(--dashboard-gauge-track)",
    },
  ];
  return (
    <div className="dashboard-canvas">
      <section className="dashboard-hero" aria-labelledby="dashboard-promise">
        <Image
          className="dashboard-hero-image"
          src="/images/dashboard-landscape.png"
          alt=""
          fill
          priority
          sizes="(max-width: 960px) 100vw, 50vw"
        />
        <div className="dashboard-hero-wash" />
        <div className="dashboard-hero-copy">
          <h2 id="dashboard-promise">
            {design("brandPromise")}
            <br />
            {design("brandPromiseLine2")}
          </h2>
          <p>{design("brandPromiseDescription")}</p>
          <div className="dashboard-hero-actions">
            <Button asChild variant="secondary" size="icon">
              <Link href="/tours" aria-label={design("allTours")}>
                <MapIcon aria-hidden="true" />
              </Link>
            </Button>
            <Button asChild variant="secondary" size="icon">
              <Link
                href="/journey-builder"
                aria-label={design("journeyBuilder")}
              >
                <Compass aria-hidden="true" />
              </Link>
            </Button>
            <Button asChild variant="secondary" size="icon">
              <Link href="/settings" aria-label={design("settings")}>
                <SlidersHorizontal aria-hidden="true" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {featured ? (
        <Card className="dashboard-featured">
          <CardHeader>
            <CardTitle>{design("featuredDeparture")}</CardTitle>
            <Button asChild variant="ghost" size="icon-sm">
              <Link href="/tours" aria-label={design("viewAll")}>
                <ArrowRight aria-hidden="true" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            <div className="dashboard-featured-image">
              <Image
                src="/images/dashboard-desert.jpeg"
                alt=""
                fill
                sizes="(max-width: 767px) 40vw, 240px"
              />
            </div>
            <div className="dashboard-featured-copy">
              <strong>{featured.title}</strong>
              <dl>
                <div>
                  <dt>{design("nextDeparture")}</dt>
                  <dd>{date(featured.startsOn)}</dd>
                </div>
                <div>
                  <dt>{design("seats")}</dt>
                  <dd>
                    {number.format(featured.reserved)} /{" "}
                    {number.format(featured.capacity)}
                  </dd>
                </div>
              </dl>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <section className="dashboard-summary" aria-label={design("summary")}>
        <div className="dashboard-summary-stat is-primary">
          <span>{t("bookings")}</span>
          <strong>{number.format(data.metrics.bookings.value)}</strong>
          {compare && (
            <MetricChange
              value={data.metrics.bookings.value}
              previous={data.metrics.bookings.previous}
              percentagePoints={false}
            />
          )}
        </div>
        <div className="dashboard-summary-stat">
          <span>{design("fillRate")}</span>
          <strong>
            {fillRate === null ? "—" : `${number.format(fillRate)}%`}
          </strong>
        </div>
      </section>

      <Panel title={design("bookingPace")} className="dashboard-pace">
        <div className="dashboard-pace-chart">
          <RingChart
            data={[
              {
                label: design("bookingPace"),
                value: paceValue,
                maxValue: peakDaily,
                color: "var(--dashboard-warm)",
              },
            ]}
            strokeWidth={16}
            ringGap={0}
            baseInnerRadius={52}
            className="dashboard-ring-chart"
          >
            <Ring
              index={0}
              animate={!reduceMotion}
              showGlow={false}
              lineCap="round"
            />
            <RingCenter
              defaultLabel={design("perDay")}
              formatOptions={{ maximumFractionDigits: 1 }}
            />
          </RingChart>
        </div>
        {data.metrics.bookings.value === 0 && (
          <p className="dashboard-pace-note">{t("noBookingsDescription")}</p>
        )}
      </Panel>

      <Panel title={design("operationalHealth")} className="dashboard-health">
        <p className="dashboard-health-summary">
          <strong>{number.format(attentionDepartures)}</strong>{" "}
          {design("departuresRequireAttention")}
        </p>
        <div className="dashboard-health-bars">
          {health.map((item) => (
            <div key={item.key}>
              <span>{item.percent}%</span>
              <div className={`dashboard-health-track health-${item.key}`}>
                <i style={{ height: `${item.percent}%` }} />
              </div>
              <small>{design(item.key)}</small>
            </div>
          ))}
        </div>
      </Panel>

      <section
        className="dashboard-booking-performance"
        aria-labelledby="booking-performance-title"
      >
        <h2 id="booking-performance-title">{design("bookingPerformance")}</h2>
        <div className="dashboard-gauge">
          <ChartContainer
            className="dashboard-chart-container"
            config={{
              filled: {
                label: design("booked"),
                color: "var(--dashboard-warm)",
              },
              open: {
                label: design("available"),
                color: "var(--dashboard-gauge-track)",
              },
            }}
          >
            <PieChart accessibilityLayer>
              <Pie
                data={gauge}
                dataKey="value"
                nameKey="key"
                innerRadius={49}
                outerRadius={61}
                startAngle={210}
                endAngle={-30}
                stroke="none"
                isAnimationActive={false}
              >
                {gauge.map((entry) => (
                  <Cell key={entry.key} fill={entry.fill} />
                ))}
              </Pie>
            </PieChart>
          </ChartContainer>
          <div>
            <strong>{fillRate === null ? "—" : number.format(fillRate)}</strong>
            {fillRate !== null && <span>%</span>}
            <small>{design("seatOccupancy")}</small>
          </div>
        </div>
        <div className="dashboard-performance-stats">
          <div>
            <span>{design("booked")}</span>
            <strong>{number.format(departureTotals.reserved)}</strong>
          </div>
          <div>
            <span>{design("capacity")}</span>
            <strong>{number.format(departureTotals.capacity)}</strong>
          </div>
          <div>
            <span>{t("activeDepartures")}</span>
            <strong>
              {number.format(data.metrics.activeDepartures.value)}
            </strong>
          </div>
        </div>
      </section>

      <Panel title={t("departures")} className="dashboard-departure-table">
        {data.departures.length === 0 ? (
          <ChartEmpty
            title={t("noDepartures")}
            description={t("noDeparturesDescription")}
          />
        ) : (
          <Table
            containerProps={{
              className: "dashboard-table-scroll",
              role: "region",
              tabIndex: 0,
              "aria-label": t("departures"),
            }}
          >
            <TableHeader>
              <TableRow>
                <TableHead>{t("tour")}</TableHead>
                <TableHead>{t("date")}</TableHead>
                <TableHead>{design("seats")}</TableHead>
                <TableHead>{t("status")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.departures.slice(0, 4).map((departure) => {
                const remaining = Math.max(
                  0,
                  departure.capacity - departure.reserved,
                );
                const attention =
                  remaining <=
                  Math.max(1, Math.floor(departure.capacity * 0.2));
                return (
                  <TableRow key={departure.id}>
                    <TableCell>
                      <Link href="/tours">{departure.title}</Link>
                    </TableCell>
                    <TableCell>{date(departure.startsOn)}</TableCell>
                    <TableCell className={attention ? "is-attention" : ""}>
                      {design("seatsLeft", { count: remaining })}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="secondary"
                        className={
                          attention
                            ? "departure-attention"
                            : "departure-on-track"
                        }
                      >
                        {design(attention ? "atRisk" : "onTrack")}
                      </Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </Panel>
    </div>
  );
}

function MetricChange({
  value,
  previous,
  percentagePoints,
}: {
  value: number | null;
  previous: number | null;
  percentagePoints: boolean;
}) {
  const t = useTranslations("Dashboard");
  const locale = useLocale();
  if (
    value === null ||
    previous === null ||
    (!percentagePoints && previous === 0)
  )
    return <span className="dashboard-change">{t("noComparison")}</span>;
  const change = percentagePoints
    ? value - previous
    : ((value - previous) / previous) * 100;
  return (
    <span
      className={cn("dashboard-change", {
        "change-up": change > 0,
        "change-down": change < 0,
      })}
    >
      {change > 0 ? (
        <ArrowUpRight size={13} aria-hidden="true" />
      ) : change < 0 ? (
        <ArrowDownRight size={13} aria-hidden="true" />
      ) : null}
      {new Intl.NumberFormat(locale, {
        maximumFractionDigits: 1,
        signDisplay: "exceptZero",
      }).format(change)}
      {percentagePoints ? ` ${t("percentagePoints")}` : "%"}
      <span className="sr-only"> {t("versusPrevious")}</span>
    </span>
  );
}

function ChartEmpty({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <Empty className="dashboard-empty">
      <EmptyHeader>
        <EmptyTitle>{title}</EmptyTitle>
        <EmptyDescription>{description}</EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}

function DashboardLoading() {
  const t = useTranslations("Dashboard");
  return (
    <div role="status" aria-live="polite" aria-busy="true">
      <p className="sr-only">{t("loading")}</p>
      <div className="dashboard-kpis" aria-hidden="true">
        {["bookings", "revenue", "departures", "conversion"].map((key) => (
          <Card size="sm" className="dashboard-kpi" key={key}>
            <CardHeader>
              <Skeleton className="h-3 w-3/5" />
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <Skeleton className="h-6 w-4/5" />
              <Skeleton className="h-3 w-3/5" />
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="dashboard-middle" aria-hidden="true">
        <Skeleton className="skeleton-chart" />
        <Skeleton className="skeleton-chart" />
      </div>
    </div>
  );
}
