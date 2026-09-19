"use client";
import type { FinanceData } from "@nomera/schemas/finance";
import { Alert, AlertDescription } from "@nomera/ui/components/alert";
import { Badge } from "@nomera/ui/components/badge";
import { Button } from "@nomera/ui/components/button";
import { Card, CardContent } from "@nomera/ui/components/card";
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
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@nomera/ui/components/tabs";
import {
  ChartNoAxesColumn,
  Coins,
  FileClock,
  Plus,
  RefreshCw,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { majorToMinor } from "@/features/tours/request";
import { formatMoney } from "@/lib/format-money";
import { submitFinance } from "./actions";
import {
  AnalyticsBars,
  CsvExport,
  MissingIntegration,
  Panel,
} from "./analytics";
import { operatorDate } from "./date";
import { Choice, FormInput, Metric, MoneyFilter, NoRecords } from "./shared";

export function FinanceView({
  data,
  canManage,
}: {
  data: FinanceData;
  canManage: boolean;
}) {
  const d = useTranslations("FinanceDesign");
  const [tab, setTab] = useState("transactions");
  const t = useTranslations("Finance"),
    errors = useTranslations("Finance.errors"),
    locale = useLocale(),
    router = useRouter();
  const [open, setOpen] = useState(false),
    [action, setAction] = useState("payment"),
    [bookingId, setBookingId] = useState(""),
    [method, setMethod] = useState("bank_transfer"),
    [error, setError] = useState<string | null>(null),
    [success, setSuccess] = useState(false),
    [pending, start] = useTransition();
  const [requestId, setRequestId] = useState<string | null>(null);
  const money = (n: number) =>
    `${n < 0 ? "−" : ""}${formatMoney(Math.abs(n), data.currency, locale)}`;
  const submit = (input: unknown) =>
    start(async () => {
      setError(null);
      setSuccess(false);
      const result = await submitFinance(input);
      if (!result.ok) {
        setError(errors(result.code));
        return;
      }
      setSuccess(true);
      setOpen(false);
      setRequestId(null);
      router.refresh();
    });
  const today = operatorDate(new Date().toISOString());
  const overdue = data.invoices.filter(
    (i) => i.dueOn < today && i.totalMinor > i.paidMinor,
  );
  const unpaid = data.invoices.filter((i) => i.totalMinor > i.paidMinor);
  const review = data.entries.filter((e) => !e.reconciledAt);
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
        <div className="flex flex-wrap gap-2">
          <MoneyFilter currency={data.currency} path="/finance" />
          <CsvExport
            filename="nomera-transactions"
            rows={[
              [
                t("booking"),
                t("type"),
                t("amount"),
                t("method"),
                t("reference"),
              ],
              ...data.entries.map((e) => [
                e.bookingReference,
                t(e.kind),
                e.amountMinor / 100,
                t(e.method),
                e.reference,
              ]),
            ]}
          />
          {canManage && (
            <Button
              onClick={() => {
                setError(null);
                setOpen(true);
                setRequestId(crypto.randomUUID());
              }}
            >
              <Plus aria-hidden="true" />
              {t("record")}
            </Button>
          )}
        </div>
      </header>
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {success && (
        <p role="status" className="text-sm">
          {t("saved")}
        </p>
      )}
      <div className="admin-metrics">
        <Metric
          icon={<Coins aria-hidden="true" />}
          note={d("allTime")}
          label={t("collected")}
          value={money(data.collectedMinor - data.refundedMinor)}
        />
        <Metric
          icon={<FileClock aria-hidden="true" />}
          note={d("allTime")}
          label={t("outstanding")}
          value={money(data.outstandingMinor)}
        />
        <Metric
          icon={<RefreshCw aria-hidden="true" />}
          note={d("allTime")}
          label={t("refunds")}
          value={money(data.refundedMinor)}
        />
        <Metric
          icon={<ChartNoAxesColumn aria-hidden="true" />}
          note={d("allTime")}
          label={t("average")}
          value={money(data.averageBookingMinor)}
        />
      </div>
      <div className="grid gap-4 xl:grid-cols-4">
        <Panel title={t("cashFlow")} className="xl:col-span-2">
          <p className="mb-2 text-xs text-muted-foreground">
            {d("cashDescription", { currency: data.currency })}
          </p>
          <AnalyticsBars
            rows={[...data.cashFlow].reverse().map((c) => ({
              name: c.month,
              value: c.paymentsMinor,
              other: -c.refundsMinor,
            }))}
            primary={t("payments")}
            secondary={t("refunds")}
            money
          />
        </Panel>
        <Panel title={d("payouts")}>
          <MissingIntegration text={d("payoutNote")} />
        </Panel>
        <Panel
          title={d("invoiceOverview")}
          action={
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setTab("invoices")}
            >
              {d("viewAll")}
            </Button>
          }
        >
          <div className="divide-y">
            <div className="py-5">
              <p className="text-sm">
                {d("overdue", { count: overdue.length })}
              </p>
              <p className="mt-1 text-xl font-semibold">
                {money(
                  overdue.reduce(
                    (sum, i) => sum + i.totalMinor - i.paidMinor,
                    0,
                  ),
                )}
              </p>
            </div>
            <div className="py-5">
              <p className="text-sm">
                {d("openInvoices", { count: unpaid.length })}
              </p>
              <p className="mt-1 text-xl font-semibold">
                {money(
                  unpaid.reduce(
                    (sum, i) => sum + i.totalMinor - i.paidMinor,
                    0,
                  ),
                )}
              </p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">{t("recordLimit")}</p>
        </Panel>
      </div>
      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,2.2fr)_minmax(0,1fr)]">
        <Card className="admin-panel min-w-0">
          <CardContent className="min-w-0">
            <h2 className="mb-3 text-base font-semibold">
              {d("recentTransactions")}
            </h2>
            <Tabs value={tab} onValueChange={setTab}>
              <TabsList
                variant="line"
                className="mb-4 grid h-auto w-full grid-cols-2 sm:flex sm:w-fit"
              >
                {[
                  "payments",
                  "invoices",
                  "transactions",
                  "reconciliation",
                  "cashFlow",
                ].map((tab) => (
                  <TabsTrigger key={tab} value={tab}>
                    {t(tab)}
                  </TabsTrigger>
                ))}
              </TabsList>
              <TabsContent value="payments">
                {!data.bookings.length ? (
                  <NoRecords />
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {[
                          "booking",
                          "customer",
                          "total",
                          "paid",
                          "balance",
                        ].map((k) => (
                          <TableHead key={k}>{t(k)}</TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.bookings.map((b) => (
                        <TableRow key={b.id}>
                          <TableCell className="font-medium">
                            {b.reference}
                          </TableCell>
                          <TableCell>{b.customerName}</TableCell>
                          <TableCell>{money(b.totalMinor)}</TableCell>
                          <TableCell>{money(b.paidMinor)}</TableCell>
                          <TableCell>
                            {b.status === "cancelled"
                              ? t("cancelled")
                              : money(Math.max(0, b.totalMinor - b.paidMinor))}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </TabsContent>
              <TabsContent value="invoices">
                {!data.invoices.length ? (
                  <NoRecords />
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {[
                          "invoice",
                          "booking",
                          "customer",
                          "due",
                          "total",
                          "status",
                        ].map((k) => (
                          <TableHead key={k}>{t(k)}</TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.invoices.map((i) => (
                        <TableRow key={i.id}>
                          <TableCell className="font-medium">
                            {i.number}
                          </TableCell>
                          <TableCell>{i.bookingReference}</TableCell>
                          <TableCell>{i.customerName}</TableCell>
                          <TableCell>{i.dueOn}</TableCell>
                          <TableCell>{money(i.totalMinor)}</TableCell>
                          <TableCell>
                            <Badge variant="secondary">
                              {t(
                                i.paidMinor >= i.totalMinor ? "paid" : "unpaid",
                              )}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </TabsContent>
              {["transactions", "reconciliation"].map((tab) => (
                <TabsContent key={tab} value={tab}>
                  {!data.entries.filter(
                    (e) => tab !== "reconciliation" || !e.reconciledAt,
                  ).length ? (
                    <NoRecords />
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          {[
                            "booking",
                            "type",
                            "amount",
                            "method",
                            "reference",
                            "status",
                          ].map((k) => (
                            <TableHead key={k}>{t(k)}</TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {data.entries
                          .filter(
                            (e) => tab !== "reconciliation" || !e.reconciledAt,
                          )
                          .map((e) => (
                            <TableRow key={e.id}>
                              <TableCell>
                                {e.bookingReference}
                                <p className="text-xs text-muted-foreground">
                                  {operatorDate(e.createdAt)}
                                </p>
                              </TableCell>
                              <TableCell>{t(e.kind)}</TableCell>
                              <TableCell>{money(e.amountMinor)}</TableCell>
                              <TableCell>{t(e.method)}</TableCell>
                              <TableCell>{e.reference}</TableCell>
                              <TableCell>
                                {e.reconciledAt ? (
                                  <Badge variant="secondary">
                                    {t("reconciled")}
                                  </Badge>
                                ) : canManage ? (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    disabled={pending}
                                    onClick={() =>
                                      submit({
                                        action: "reconcile",
                                        entryId: e.id,
                                      })
                                    }
                                  >
                                    {t("reconcile")}
                                  </Button>
                                ) : (
                                  t("unreconciled")
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                      </TableBody>
                    </Table>
                  )}
                </TabsContent>
              ))}
              <TabsContent value="cashFlow">
                {!data.cashFlow.length ? (
                  <NoRecords />
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {["month", "payments", "refunds", "net"].map((k) => (
                          <TableHead key={k}>{t(k)}</TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.cashFlow.map((c) => (
                        <TableRow key={c.month}>
                          <TableCell>{c.month}</TableCell>
                          <TableCell>{money(c.paymentsMinor)}</TableCell>
                          <TableCell>{money(c.refundsMinor)}</TableCell>
                          <TableCell>
                            {money(c.paymentsMinor - c.refundsMinor)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </TabsContent>
            </Tabs>
            <p className="mt-4 text-xs text-muted-foreground">
              {t("recordLimit")}
            </p>
          </CardContent>
        </Card>
        <Panel
          title={d("reconciliationStatus")}
          action={
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setTab("reconciliation")}
            >
              {d("viewAll")}
            </Button>
          }
        >
          <div className="divide-y">
            <div className="py-5">
              <p className="text-sm">{t("reconciled")}</p>
              <p className="mt-1 text-2xl font-semibold">
                {data.entries.length
                  ? `${Math.round(((data.entries.length - review.length) / data.entries.length) * 100)}%`
                  : "—"}
              </p>
            </div>
            <div className="py-5">
              <p className="text-sm font-medium">
                {d("reviewCount", { count: review.length })}
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                {d("manualMatching")}
              </p>
            </div>
            <div className="py-5 text-xs text-muted-foreground">
              {t("manualOnly")}
            </div>
          </div>
        </Panel>
      </div>
      <Dialog
        open={open}
        onOpenChange={(value) => {
          if (!pending) setOpen(value);
        }}
      >
        <DialogContent
          closeLabel={t("close")}
          className="max-h-[90dvh] overflow-y-auto"
        >
          <DialogHeader>
            <DialogTitle>{t("record")}</DialogTitle>
            <DialogDescription>{t("manualOnly")}</DialogDescription>
          </DialogHeader>
          <form
            className="grid gap-4"
            onSubmit={(event) => {
              event.preventDefault();
              const f = new FormData(event.currentTarget);
              submit(
                action === "invoice"
                  ? { action, bookingId, dueOn: f.get("dueOn") }
                  : {
                      action,
                      bookingId,
                      method,
                      amountMinor: majorToMinor(String(f.get("amount") ?? "")),
                      reference: f.get("reference"),
                      requestId,
                    },
              );
            }}
          >
            <Choice
              name="action"
              label={t("type")}
              value={action}
              onChange={setAction}
              options={["payment", "refund", "invoice"].map((v) => ({
                value: v,
                label: t(v),
              }))}
            />
            <Choice
              name="bookingId"
              label={t("booking")}
              value={bookingId}
              onChange={setBookingId}
              options={data.bookings.map((b) => ({
                value: b.id,
                label: `${b.reference} · ${b.customerName}`,
              }))}
            />
            {action === "invoice" ? (
              <FormInput name="dueOn" label={t("due")} type="date" required />
            ) : (
              <>
                <FormInput
                  name="amount"
                  label={`${t("amount")} (${data.currency})`}
                  type="number"
                  min="0.01"
                  step="0.01"
                  required
                />
                <Choice
                  name="method"
                  label={t("method")}
                  value={method}
                  onChange={setMethod}
                  options={["bank_transfer", "cash", "other"].map((v) => ({
                    value: v,
                    label: t(v),
                  }))}
                />
                <FormInput
                  name="reference"
                  label={t("reference")}
                  maxLength={120}
                  required
                />
              </>
            )}
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <Button type="submit" disabled={pending || !bookingId}>
              {pending ? t("saving") : t("save")}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </section>
  );
}
