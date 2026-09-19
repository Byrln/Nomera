"use client";

import type {
  CustomerDetail,
  OperationsData,
  OperationsMutation,
} from "@nomera/schemas/operations";

import { saleStages } from "@nomera/schemas/operations";

import { Avatar, AvatarFallback } from "@nomera/ui/components/avatar";

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

import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@nomera/ui/components/tabs";

import {
  BarChart3,
  Bell,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  Download,
  ExternalLink,
  FileText,
  Globe,
  Mail,
  MessageSquare,
  Phone,
  Plus,
  Repeat2,
  Star,
  Users,
} from "lucide-react";

import Link from "next/link";

import { useLocale, useTranslations } from "next-intl";

import { type ReactNode, useState } from "react";

import { Funnel, FunnelChart, LabelList, Pie, PieChart } from "recharts";

import { MediaUpload } from "@/features/media/upload";

import { formatMoney } from "@/lib/format-money";

import type { OperationsModal } from "./workspace";

import "./reference.css";

type Props = {
  data: OperationsData;

  mode: "customers" | "sales" | "bookings";

  detail?: CustomerDetail;

  canManage: boolean;

  pending: boolean;

  setModal: (modal: OperationsModal) => void;

  run: (input: Omit<OperationsMutation, "operationId">) => void;

  bookingsTable: ReactNode;
};

export function OperationsPanels({
  data,

  mode,

  detail,

  canManage,

  pending,

  setModal,

  run,

  bookingsTable,
}: Props) {
  const t = useTranslations("Operations"),
    d = useTranslations("OperationsDesign"),
    locale = useLocale();

  const [search, setSearch] = useState("");

  const [filter, setFilter] = useState("all");

  const [currency, setCurrency] = useState("MNT");

  const [page, setPage] = useState(1);

  const [tab, setTab] = useState("overview");

  const money = (amount: number, code = currency) =>
    formatMoney(amount, code, locale);

  const date = (value: string) => {
    if (!value) return "—";

    const parsed = new Date(
      value.length === 10 ? `${value}T00:00:00+08:00` : value,
    );

    if (locale === "mn") {
      const parts = new Intl.DateTimeFormat("en", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        timeZone: "Asia/Ulaanbaatar",
      }).formatToParts(parsed);

      return ["year", "month", "day"]
        .map((type) => parts.find((part) => part.type === type)?.value)
        .join(".");
    }

    return new Intl.DateTimeFormat(locale, {
      year: "numeric",
      month: "short",
      day: "numeric",
      timeZone: "Asia/Ulaanbaatar",
    }).format(parsed);
  };

  const num = (value: number) => new Intl.NumberFormat(locale).format(value);

  const percent = (value: number) =>
    new Intl.NumberFormat(locale, {
      style: "percent",

      maximumFractionDigits: 0,
    }).format(value);

  const active = data.customers.filter((c) => !c.archived);

  const repeat = active.filter(
    (c) =>
      data.bookings.filter(
        (b) =>
          b.customerId === c.id &&
          ["confirmed", "completed"].includes(b.status),
      ).length > 1,
  ).length;

  const open = data.inquiries.filter((i) => !["won", "lost"].includes(i.stage));

  const quoted = data.inquiries.filter((i) => i.quoteValue !== undefined);

  const won = data.inquiries.filter((i) => i.stage === "won");

  const winRate = quoted.length
    ? won.filter((i) => i.quoteValue !== undefined).length / quoted.length
    : 0;

  const pipelineValue = open

    .filter((i) => i.quoteCurrency === currency)

    .reduce((n, i) => n + (i.quoteValue ?? 0), 0);

  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ulaanbaatar",

    year: "numeric",

    month: "2-digit",

    day: "2-digit",
  }).format(new Date());

  const reminders = open

    .filter((i) => i.followUpAt && i.followUpAt <= today)

    .sort((a, b) => a.followUpAt.localeCompare(b.followUpAt));

  const inquiries = data.inquiries.filter(
    (i) =>
      (filter === "all" || filter === i.stage) &&
      `${i.title} ${i.customerName}`

        .toLocaleLowerCase(locale)

        .includes(search.toLocaleLowerCase(locale)),
  );

  const customers = data.customers.filter(
    (c) =>
      (filter === "archived" ? c.archived : !c.archived) &&
      `${c.name} ${c.email} ${c.phone} ${c.country}`

        .toLocaleLowerCase(locale)

        .includes(search.toLocaleLowerCase(locale)),
  );

  const pages = Math.max(
    1,

    Math.ceil(
      (mode === "customers" ? customers.length : inquiries.length) / 10,
    ),
  );

  const currentPage = Math.min(page, pages);

  const customerTrips =
    detail?.bookings.filter((b) => b.status !== "cancelled") ?? [];

  const nextTrip = customerTrips

    .filter((b) => b.endsOn >= today)

    .sort((a, b) => a.startsOn.localeCompare(b.startsOn))[0];

  const lifetime = customerTrips.filter((b) =>
    ["confirmed", "completed"].includes(b.status),
  );

  const currencies = [...new Set(lifetime.map((b) => b.currency))];

  const countryCounts = new Map<string, number>();

  for (const customer of data.customers) {
    const country = customer.country || d("unspecified");

    countryCounts.set(country, (countryCounts.get(country) ?? 0) + 1);
  }

  const countryDistribution = [...countryCounts]

    .sort((a, b) => b[1] - a[1])

    .map(([name, value], index) => ({
      name,

      value,

      fill: `var(--chart-${(index % 5) + 1})`,
    }));

  const noData = (
    <Empty>
      <EmptyHeader>
        <EmptyTitle>{t("empty")}</EmptyTitle>
        <EmptyDescription>{t("emptyDescription")}</EmptyDescription>
      </EmptyHeader>
    </Empty>
  );

  function exportCustomers() {
    const cell = (value: string) =>
      `"${(/^[=+\-@\t\r]/.test(value) ? `'${value}` : value).replaceAll('"', '""')}"`;

    const rows = [
      [t("name"), t("email"), t("phone"), t("country"), t("status")],

      ...customers.map((c) => [
        c.name,

        c.email,

        c.phone,

        c.country,

        t(c.archived ? "archived" : "active"),
      ]),
    ];

    const url = URL.createObjectURL(
      new Blob(
        ["\uFEFF", rows.map((row) => row.map(cell).join(",")).join("\r\n")],

        { type: "text/csv;charset=utf-8" },
      ),
    );

    const link = document.createElement("a");

    link.href = url;

    link.download = "nomera-customers.csv";

    link.click();

    URL.revokeObjectURL(url);
  }

  function metric(
    title: string,

    value: string,

    icon: ReactNode,

    note = d("recentScope"),
  ) {
    return (
      <Card className="admin-metric" key={title}>
        <CardContent className="op-metric-content">
          <span className="admin-metric-icon">{icon}</span>
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <strong className="op-metric-value">{value}</strong>
            <p className="mt-1 text-xs text-muted-foreground">{note}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  function pager(count: number) {
    return (
      <div className="op-pagination">
        <p>
          {d("showing", {
            from: count ? (currentPage - 1) * 10 + 1 : 0,

            to: Math.min(currentPage * 10, count),

            total: count,
          })}
        </p>
        <div className="flex items-center gap-1">
          <Button
            size="icon-sm"
            variant="outline"
            aria-label={d("previous")}
            disabled={currentPage === 1}
            onClick={() => setPage(currentPage - 1)}
          >
            <ChevronLeft />
          </Button>
          <span className="px-2">
            {currentPage} / {pages}
          </span>
          <Button
            size="icon-sm"
            variant="outline"
            aria-label={d("next")}
            disabled={currentPage === pages}
            onClick={() => setPage(currentPage + 1)}
          >
            <ChevronRight />
          </Button>
        </div>
      </div>
    );
  }

  function searchControl() {
    return (
      <Field className="op-search">
        <FieldLabel className="sr-only" htmlFor="reference-search">
          {t("search")}
        </FieldLabel>
        <Input
          id="reference-search"
          placeholder={t("searchPlaceholder")}
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);

            setPage(1);
          }}
        />
      </Field>
    );
  }

  function activityList(kind?: string) {
    const rows =
      detail?.activities.filter((a) => !kind || a.kind === kind) ?? [];

    return rows.length ? (
      <div className="op-activity-list">
        {rows.slice(0, tab === "overview" ? 3 : 100).map((a) => (
          <article key={a.id}>
            <span className="op-activity-icon">
              <MessageSquare />
            </span>
            <div>
              <p className="whitespace-pre-wrap break-words">{a.body}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {date(a.createdAt)}
              </p>
              {a.url && (
                <Button asChild variant="link" className="h-auto p-0">
                  <a href={a.url} target="_blank" rel="noopener noreferrer">
                    {t("openDocument")}
                    <ExternalLink />
                  </a>
                </Button>
              )}
            </div>
          </article>
        ))}
      </div>
    ) : (
      <p className="py-4 text-sm text-muted-foreground">{t("noActivity")}</p>
    );
  }

  const addActivity = (kind: "note" | "interaction" | "document") =>
    detail &&
    setModal({ type: "activity", kind, customerId: detail.customer.id });

  if (mode === "bookings")
    return (
      <>
        <div className="admin-metrics">
          {metric(t("bookings"), num(data.bookings.length), <CalendarDays />)}
          {metric(
            t("statuses.pending"),

            num(data.bookings.filter((b) => b.status === "pending").length),

            <Bell />,
          )}
          {metric(
            t("statuses.confirmed"),

            num(data.bookings.filter((b) => b.status === "confirmed").length),

            <FileText />,
          )}
          {metric(
            t("travelers"),

            num(
              data.bookings

                .filter((b) => b.status !== "cancelled")

                .reduce((sum, b) => sum + b.travelers, 0),
            ),

            <Users />,
          )}
        </div>
        <Card className="admin-panel">
          <CardHeader>
            <CardTitle>{t("bookings")}</CardTitle>
          </CardHeader>
          <CardContent>
            {data.bookings.length ? bookingsTable : noData}
            <p className="mt-4 text-xs text-muted-foreground">
              {t("latestRecords")}
            </p>
          </CardContent>
        </Card>
      </>
    );

  if (mode === "sales")
    return (
      <>
        <div className="admin-metrics">
          {metric(d("leads"), num(data.inquiries.length), <Users />)}
          {metric(
            d("qualified"),

            num(
              data.inquiries.filter((i) =>
                ["proposal_sent", "negotiation", "won"].includes(i.stage),
              ).length,
            ),

            <FileText />,
          )}
          {metric(
            d("winRate"),

            quoted.length ? percent(winRate) : "—",

            <BarChart3 />,

            d("winRateNote"),
          )}
          {metric(
            d("expectedRevenue"),

            money(pipelineValue),

            <CircleDollarSign />,

            d("quotedValue"),
          )}
        </div>
        <div className="op-sales-grid">
          <div className="op-sales-main">
            <Card className="admin-panel">
              <CardHeader className="op-panel-heading">
                <div>
                  <CardTitle>{d("pipeline")}</CardTitle>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {d("byStage")}
                  </p>
                </div>
                <Select value={currency} onValueChange={setCurrency}>
                  <SelectTrigger aria-label={d("currency")} className="w-24">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MNT">MNT</SelectItem>
                    <SelectItem value="USD">USD</SelectItem>
                  </SelectContent>
                </Select>
              </CardHeader>
              <CardContent>
                <div className="op-pipeline">
                  {saleStages.map((stage) => {
                    const rows = data.inquiries.filter(
                      (i) => i.stage === stage,
                    );

                    return (
                      <Button
                        key={stage}
                        variant="ghost"
                        className={`op-stage op-stage-${stage}`}
                        aria-pressed={filter === stage}
                        onClick={() => {
                          setFilter(filter === stage ? "all" : stage);

                          setPage(1);
                        }}
                      >
                        <span>{t(`stages.${stage}`)}</span>
                        <strong>{num(rows.length)}</strong>
                        <span className="op-stage-amount">
                          {money(
                            rows

                              .filter((i) => i.quoteCurrency === currency)

                              .reduce((n, i) => n + (i.quoteValue ?? 0), 0),
                          )}
                        </span>
                      </Button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
            <Card className="admin-panel">
              <CardHeader className="op-panel-heading">
                <CardTitle>{d("activeDeals")}</CardTitle>
                <Button
                  variant="link"
                  size="sm"
                  onClick={() => {
                    setFilter("all");

                    setSearch("");

                    setPage(1);
                  }}
                >
                  {t("all")}
                </Button>
              </CardHeader>
              <CardContent>
                <div className="op-table-controls">
                  {searchControl()}
                  <Select
                    value={filter}
                    onValueChange={(value) => {
                      setFilter(value);

                      setPage(1);
                    }}
                  >
                    <SelectTrigger aria-label={t("stage")} className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t("all")}</SelectItem>
                      {saleStages.map((stage) => (
                        <SelectItem key={stage} value={stage}>
                          {t(`stages.${stage}`)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {inquiries.length ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {[
                          "customer",

                          "title",

                          "amount",

                          "stage",

                          "followUpAt",

                          "actions",
                        ].map((key) => (
                          <TableHead key={key}>{t(key)}</TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {inquiries

                        .slice((currentPage - 1) * 10, currentPage * 10)

                        .map((i) => (
                          <TableRow key={i.id}>
                            <TableCell>
                              {i.customerId ? (
                                <Button
                                  variant="link"
                                  asChild
                                  className="h-auto p-0"
                                >
                                  <Link href={`/customers/${i.customerId}`}>
                                    {i.customerName}
                                  </Link>
                                </Button>
                              ) : (
                                "—"
                              )}
                            </TableCell>
                            <TableCell className="font-medium">
                              {i.title || t("untitledInquiry")}
                            </TableCell>
                            <TableCell>
                              {i.quoteValue !== undefined
                                ? money(i.quoteValue, i.quoteCurrency)
                                : "—"}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant="secondary"
                                className={`op-stage-badge op-stage-${i.stage}`}
                              >
                                {t(`stages.${i.stage}`)}
                              </Badge>
                            </TableCell>
                            <TableCell>{date(i.followUpAt)}</TableCell>
                            <TableCell>
                              {canManage && (
                                <div className="flex gap-1">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    disabled={pending}
                                    onClick={() =>
                                      setModal({ type: "stage", inquiry: i })
                                    }
                                  >
                                    {t("update")}
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    disabled={pending}
                                    onClick={() =>
                                      setModal({
                                        type: "quote",

                                        inquiryId: i.id,
                                      })
                                    }
                                  >
                                    {t("quote")}
                                  </Button>
                                  {i.customerId && !i.bookingId && (
                                    <Button
                                      size="sm"
                                      disabled={pending}
                                      onClick={() =>
                                        setModal({
                                          type: "booking",

                                          inquiryId: i.id,

                                          customerId: i.customerId ?? undefined,
                                        })
                                      }
                                    >
                                      {t("book")}
                                    </Button>
                                  )}
                                </div>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                ) : (
                  noData
                )}
                {pager(inquiries.length)}
              </CardContent>
            </Card>
          </div>
          <aside className="op-sales-side">
            <Card className="admin-panel">
              <CardHeader>
                <CardTitle>{d("funnel")}</CardTitle>
              </CardHeader>
              <CardContent>
                {data.inquiries.length ? (
                  <ChartContainer
                    config={{
                      value: { label: d("leads"), color: "var(--primary)" },
                    }}
                    className="op-funnel"
                  >
                    <FunnelChart accessibilityLayer>
                      <Funnel
                        dataKey="value"
                        nameKey="name"
                        isAnimationActive={false}
                        data={[
                          {
                            name: d("leads"),

                            value: data.inquiries.length,

                            fill: "var(--primary)",
                          },

                          {
                            name: d("qualified"),

                            value: data.inquiries.filter((i) =>
                              ["proposal_sent", "negotiation", "won"].includes(
                                i.stage,
                              ),
                            ).length,

                            fill: "var(--chart-2)",
                          },

                          {
                            name: t("stages.proposal_sent"),

                            value: quoted.length,

                            fill: "var(--chart-3)",
                          },

                          {
                            name: t("stages.won"),

                            value: won.length,

                            fill: "var(--chart-4)",
                          },
                        ]}
                      >
                        <LabelList
                          position="right"
                          dataKey="value"
                          fill="var(--foreground)"
                          stroke="none"
                        />
                      </Funnel>
                    </FunnelChart>
                  </ChartContainer>
                ) : (
                  noData
                )}
                <div className="op-funnel-summary">
                  <BarChart3 />
                  <p>
                    {d("conversionSummary", {
                      rate: quoted.length ? percent(winRate) : "—",
                    })}
                    <span>{d("winRateNote")}</span>
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card className="admin-panel">
              <CardHeader>
                <CardTitle>{d("recentActivity")}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="op-activity-list">
                  {data.inquiries.slice(0, 4).map((i) => (
                    <article key={i.id}>
                      <span className="op-activity-icon">
                        <FileText />
                      </span>
                      <div>
                        <p className="font-medium">
                          {i.title || t("untitledInquiry")}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {i.customerName} · {t(`stages.${i.stage}`)}
                        </p>
                        {i.updatedAt && (
                          <p className="text-xs text-muted-foreground">
                            {date(i.updatedAt)}
                          </p>
                        )}
                      </div>
                    </article>
                  ))}
                </div>
                {!data.inquiries.length && (
                  <p className="text-sm text-muted-foreground">
                    {t("noActivity")}
                  </p>
                )}
              </CardContent>
            </Card>
            <Card className="admin-panel">
              <CardHeader>
                <CardTitle>{d("reminders")}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="mb-3 text-sm">
                  {d("followUpsDue", { count: reminders.length })}
                </p>
                <div className="op-activity-list">
                  {reminders.slice(0, 3).map((i) => (
                    <article key={i.id}>
                      <span className="op-activity-icon">
                        <Bell />
                      </span>
                      <div>
                        <p>{i.customerName}</p>
                        <p className="text-xs text-muted-foreground">
                          {date(i.followUpAt)}
                        </p>
                      </div>
                      {canManage && (
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`${t("update")} ${i.title}`}
                          onClick={() =>
                            setModal({ type: "stage", inquiry: i })
                          }
                        >
                          <ChevronRight />
                        </Button>
                      )}
                    </article>
                  ))}
                </div>
              </CardContent>
            </Card>
          </aside>
        </div>
        <p className="text-xs text-muted-foreground">{t("latestRecords")}</p>
      </>
    );

  return (
    <>
      <div className="op-export">
        <Button
          variant="outline"
          onClick={exportCustomers}
          disabled={!customers.length}
        >
          <Download />
          {d("exportCustomers")}
        </Button>
      </div>
      <div className="admin-metrics">
        {metric(d("totalCustomers"), num(data.customers.length), <Users />)}
        {metric(
          d("repeatTravelers"),

          active.length ? percent(repeat / active.length) : "—",

          <Repeat2 />,
        )}
        {metric(d("openInquiries"), num(open.length), <MessageSquare />)}
        {metric(d("satisfaction"), "—", <Star />, d("notCollected"))}
      </div>
      <div className={`op-customer-grid ${detail ? "" : "op-no-selection"}`}>
        <Card className="admin-panel op-directory">
          <CardHeader className="op-panel-heading">
            <CardTitle>{d("directory")}</CardTitle>
            <div className="op-table-controls">
              {searchControl()}
              <Select
                value={filter}
                onValueChange={(value) => {
                  setFilter(value);

                  setPage(1);
                }}
              >
                <SelectTrigger aria-label={t("status")} className="w-28">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("active")}</SelectItem>
                  <SelectItem value="archived">{t("archived")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            {customers.length ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    {["name", "country", "status"].map((key) => (
                      <TableHead key={key}>{t(key)}</TableHead>
                    ))}
                    <TableHead>{d("lastBooking")}</TableHead>
                    <TableHead>{d("lifetimeValue")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {customers

                    .slice((currentPage - 1) * 10, currentPage * 10)

                    .map((c) => (
                      <TableRow
                        key={c.id}
                        data-state={
                          detail?.customer.id === c.id ? "selected" : undefined
                        }
                      >
                        <TableCell>
                          <Button
                            asChild
                            variant="link"
                            className="op-customer-name"
                          >
                            <Link href={`/customers/${c.id}`}>
                              <Avatar className="size-7">
                                <AvatarFallback>
                                  {c.name.slice(0, 1)}
                                </AvatarFallback>
                              </Avatar>
                              {c.name}
                            </Link>
                          </Button>
                        </TableCell>
                        <TableCell>{c.country || "—"}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">
                            {t(c.archived ? "archived" : "active")}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {date(
                            data.bookings.find((b) => b.customerId === c.id)
                              ?.bookedAt ?? "",
                          )}
                        </TableCell>
                        <TableCell>
                          {[
                            ...new Set(
                              data.bookings

                                .filter(
                                  (b) =>
                                    b.customerId === c.id &&
                                    ["confirmed", "completed"].includes(
                                      b.status,
                                    ),
                                )

                                .map((b) => b.currency),
                            ),
                          ].map((code) => (
                            <p key={code}>
                              {money(
                                data.bookings

                                  .filter(
                                    (b) =>
                                      b.customerId === c.id &&
                                      b.currency === code &&
                                      ["confirmed", "completed"].includes(
                                        b.status,
                                      ),
                                  )

                                  .reduce((sum, b) => sum + b.totalMinor, 0),

                                code,
                              )}
                            </p>
                          ))}
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            ) : (
              noData
            )}
            {pager(customers.length)}
            <p className="text-xs text-muted-foreground">
              {t("latestRecords")}
            </p>
          </CardContent>
        </Card>
        {detail && (
          <Card className="admin-panel op-customer-detail">
            <CardHeader>
              <div className="op-customer-profile">
                <Avatar className="size-16">
                  <AvatarFallback className="text-2xl">
                    {detail.customer.name.slice(0, 1)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <CardTitle className="text-lg">
                      {detail.customer.name}
                    </CardTitle>
                    <Badge variant="secondary">
                      {t(detail.customer.archived ? "archived" : "active")}
                    </Badge>
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {d("customerSince", {
                      date: date(detail.customer.createdAt),
                    })}
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Tabs value={tab} onValueChange={setTab}>
                <TabsList variant="line" className="op-detail-tabs">
                  {[
                    "overview",

                    "trips",

                    "interactions",

                    "documents",

                    "notes",
                  ].map((value) => (
                    <TabsTrigger value={value} key={value}>
                      {d(value)}
                    </TabsTrigger>
                  ))}
                </TabsList>
                {tab === "overview" && (
                  <TabsContent value="overview" className="op-detail-grid">
                    <Card>
                      <CardHeader className="op-panel-heading">
                        <CardTitle>{d("contactInformation")}</CardTitle>
                        {canManage && (
                          <Button
                            variant="link"
                            size="sm"
                            onClick={() =>
                              setModal({
                                type: "customer",

                                customer: detail.customer,
                              })
                            }
                          >
                            {d("edit")}
                          </Button>
                        )}
                      </CardHeader>
                      <CardContent className="op-contact">
                        <p>
                          <Mail />
                          {detail.customer.email || t("emailPending")}
                        </p>
                        <p>
                          <Phone />
                          {detail.customer.phone || "—"}
                        </p>
                        <p>
                          <Globe />
                          {detail.customer.country || "—"}
                        </p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader>
                        <CardTitle>{d("countryDistribution")}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ChartContainer
                          config={{
                            value: {
                              label: d("totalCustomers"),

                              color: "var(--primary)",
                            },
                          }}
                          className="op-country-chart"
                        >
                          <PieChart accessibilityLayer>
                            <Pie
                              data={countryDistribution}
                              dataKey="value"
                              nameKey="name"
                              innerRadius="55%"
                              outerRadius="90%"
                              isAnimationActive={false}
                            />
                          </PieChart>
                        </ChartContainer>
                        <div className="op-country-legend">
                          {countryDistribution.slice(0, 5).map((country) => (
                            <p key={country.name}>
                              <span>{country.name}</span>
                              <strong>{country.value}</strong>
                            </p>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                    <Card className="op-next-trip">
                      <CardHeader className="op-panel-heading">
                        <CardTitle>{d("nextTrip")}</CardTitle>
                        <Button
                          variant="link"
                          size="sm"
                          onClick={() => setTab("trips")}
                        >
                          {d("viewBookings")}
                          <ChevronRight />
                        </Button>
                      </CardHeader>
                      <CardContent>
                        {nextTrip ? (
                          <div className="space-y-2">
                            <p className="font-semibold">
                              {nextTrip.tourTitle}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {date(nextTrip.startsOn)} –{" "}
                              {date(nextTrip.endsOn)}
                            </p>
                            <p className="text-xs">
                              {d("travelerCount", {
                                count: nextTrip.travelers,
                              })}
                            </p>
                            <Badge variant="secondary">
                              {t(`statuses.${nextTrip.status}`)}
                            </Badge>
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground">
                            {d("noUpcomingTrip")}
                          </p>
                        )}
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader>
                        <CardTitle>{d("lifetimeValue")}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        {currencies.length ? (
                          currencies.map((code) => (
                            <p key={code} className="text-2xl font-semibold">
                              {money(
                                lifetime

                                  .filter((b) => b.currency === code)

                                  .reduce((sum, b) => sum + b.totalMinor, 0),

                                code,
                              )}
                            </p>
                          ))
                        ) : (
                          <p className="text-2xl font-semibold">—</p>
                        )}
                        <p className="mt-2 text-xs text-muted-foreground">
                          {d("bookingCount", { count: lifetime.length })}
                        </p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="op-panel-heading">
                        <CardTitle>{d("recentInteractions")}</CardTitle>
                        <Button
                          variant="link"
                          size="sm"
                          onClick={() => setTab("interactions")}
                        >
                          {t("all")}
                        </Button>
                      </CardHeader>
                      <CardContent>{activityList("interaction")}</CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="op-panel-heading">
                        <CardTitle>{d("notes")}</CardTitle>
                        {canManage && (
                          <Button
                            variant="link"
                            size="sm"
                            onClick={() => addActivity("note")}
                          >
                            {t("note")}
                          </Button>
                        )}
                      </CardHeader>
                      <CardContent>{activityList("note")}</CardContent>
                    </Card>
                  </TabsContent>
                )}
                {tab === "trips" && (
                  <TabsContent value="trips" className="space-y-4 pt-4">
                    {detail.bookings.length ? bookingsTable : noData}
                    <h3 className="font-semibold">{t("quotes")}</h3>
                    {detail.quotes.length ? (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            {["tour", "travelers", "amount", "date"].map(
                              (key) => (
                                <TableHead key={key}>{t(key)}</TableHead>
                              ),
                            )}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {detail.quotes.map((q) => (
                            <TableRow key={q.id}>
                              <TableCell>{q.tourTitle}</TableCell>
                              <TableCell>{q.travelers}</TableCell>
                              <TableCell>
                                {money(q.totalMinor, q.currency)}
                              </TableCell>
                              <TableCell>{date(q.createdAt)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    ) : (
                      noData
                    )}
                  </TabsContent>
                )}
                {tab !== "overview" && tab !== "trips" && (
                  <TabsContent value={tab} className="pt-4">
                    <p className="mb-4 text-xs text-muted-foreground">
                      {t("internalOnly")}
                    </p>
                    {canManage && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          addActivity(
                            tab === "notes"
                              ? "note"
                              : tab === "documents"
                                ? "document"
                                : "interaction",
                          )
                        }
                      >
                        <Plus />
                        {t(
                          tab === "notes"
                            ? "note"
                            : tab === "documents"
                              ? "document"
                              : "interaction",
                        )}
                      </Button>
                    )}
                    {tab === "documents" &&
                      canManage &&
                      !detail.customer.archived && (
                        <div className="mt-4">
                          <MediaUpload customerId={detail.customer.id} />
                        </div>
                      )}
                    {activityList(
                      tab === "notes"
                        ? "note"
                        : tab === "documents"
                          ? "document"
                          : "interaction",
                    )}
                  </TabsContent>
                )}
              </Tabs>
              {canManage && !detail.customer.archived && (
                <Button
                  variant="ghost"
                  className="mt-4 text-muted-foreground"
                  disabled={pending}
                  onClick={() =>
                    run({
                      type: "archiveCustomer",

                      id: detail.customer.id,

                      version: detail.customer.version,
                    } as Omit<OperationsMutation, "operationId">)
                  }
                >
                  {t("archiveCustomer")}
                </Button>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </>
  );
}
