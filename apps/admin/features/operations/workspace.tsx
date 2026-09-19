"use client";
import type {
  Customer,
  CustomerDetail,
  OperationsData,
  OperationsMutation,
} from "@nomera/schemas/operations";
import { bookingStatuses, saleStages } from "@nomera/schemas/operations";
import { Alert, AlertDescription } from "@nomera/ui/components/alert";
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
import { Textarea } from "@nomera/ui/components/textarea";
import { Plus } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useRef, useState, useTransition } from "react";
import { formatMoney } from "@/lib/format-money";
import { submitOperation } from "./actions";
import { OperationsPanels } from "./reference-panels";

type Mode = "customers" | "sales" | "bookings";
export type OperationsModal =
  | { type: "customer"; customer?: Customer }
  | { type: "inquiry" }
  | { type: "booking"; inquiryId?: string; customerId?: string }
  | { type: "quote"; inquiryId: string }
  | { type: "stage"; inquiry: OperationsData["inquiries"][number] }
  | {
      type: "activity";
      kind: "note" | "interaction" | "document";
      customerId: string;
    }
  | null;
export function OperationsWorkspace({
  data,
  mode,
  canManage,
  detail,
}: {
  data: OperationsData;
  mode: Mode;
  canManage: boolean;
  detail?: CustomerDetail;
}) {
  const t = useTranslations("Operations"),
    locale = useLocale(),
    router = useRouter();
  const searchParams = useSearchParams();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null),
    [notice, setNotice] = useState(false),
    [searchState, setSearchState] = useState<{
      query: string;
      value: string;
    } | null>(null),
    [filterState, setFilterState] = useState<{
      query: string;
      value: string;
    } | null>(null),
    [modal, setModal] = useState<OperationsModal>(null);
  const queryKey = searchParams.toString();
  const search = searchState?.query === queryKey ? searchState.value : null;
  const filter = filterState?.query === queryKey ? filterState.value : null;
  const setSearch = (value: string) =>
    setSearchState({ query: queryKey, value });
  const setFilter = (value: string) =>
    setFilterState({ query: queryKey, value });
  const money = (n: number, currency: string) =>
    formatMoney(n, currency, locale);
  const attempt = useRef<{ signature: string; id: string } | null>(null);
  function run(input: Omit<OperationsMutation, "operationId">) {
    setError(null);
    setNotice(false);
    const signature = JSON.stringify(input);
    if (attempt.current?.signature !== signature)
      attempt.current = { signature, id: crypto.randomUUID() };
    const operationId = attempt.current.id;
    start(async () => {
      const result = await submitOperation({
        ...input,
        operationId,
      });
      if (!result.ok) {
        setError(result.code);
        return;
      }
      setNotice(true);
      attempt.current = null;
      setModal(null);
      router.refresh();
    });
  }
  function submit(form: FormData) {
    if (!modal) return;
    const val = (name: string) => String(form.get(name) ?? "");
    if (modal.type === "customer")
      run({
        type: "customer",
        ...(modal.customer
          ? { id: modal.customer.id, version: modal.customer.version }
          : {}),
        data: {
          name: val("name"),
          email: val("email"),
          phone: val("phone"),
          country: val("country"),
        },
      } as Omit<OperationsMutation, "operationId">);
    if (modal.type === "inquiry")
      run({
        type: "inquiry",
        customerId: val("customerId"),
        title: val("title"),
        notes: val("notes"),
      } as Omit<OperationsMutation, "operationId">);
    if (modal.type === "booking")
      run({
        type: "booking",
        customerId: val("customerId"),
        departureId: val("departureId"),
        travelers: Number(val("travelers")),
        promotionCode: val("promotionCode"),
        channel: val("channel"),
        ...(modal.inquiryId ? { inquiryId: modal.inquiryId } : {}),
      } as Omit<OperationsMutation, "operationId">);
    if (modal.type === "quote")
      run({
        type: "quote",
        inquiryId: modal.inquiryId,
        departureId: val("departureId"),
        travelers: Number(val("travelers")),
      } as Omit<OperationsMutation, "operationId">);
    if (modal.type === "stage")
      run({
        type: "stage",
        id: modal.inquiry.id,
        version: modal.inquiry.version,
        stage: val("stage"),
        followUpAt: val("followUpAt"),
        notes: val("notes"),
      } as Omit<OperationsMutation, "operationId">);
    if (modal.type === "activity")
      run({
        type: "activity",
        kind: modal.kind,
        customerId: modal.customerId,
        body: val("body"),
        url: val("url"),
      } as Omit<OperationsMutation, "operationId">);
  }
  function textField(
    name: string,
    value = "",
    type = "text",
    required = false,
  ) {
    return (
      <Field key={name}>
        <FieldLabel htmlFor={`op-${name}`}>{t(name)}</FieldLabel>
        <Input
          id={`op-${name}`}
          name={name}
          defaultValue={value}
          type={type}
          required={required}
          disabled={pending}
          maxLength={name === "email" ? 254 : 200}
          {...(type === "number" ? { min: 1, max: 100, step: 1 } : {})}
        />
      </Field>
    );
  }
  function choose(
    name: string,
    items: { value: string; label: string }[],
    value?: string,
  ) {
    return (
      <Field>
        <FieldLabel htmlFor={`op-${name}`}>{t(name)}</FieldLabel>
        <Select name={name} defaultValue={value} required disabled={pending}>
          <SelectTrigger id={`op-${name}`} className="w-full">
            <SelectValue placeholder={t("select")} />
          </SelectTrigger>
          <SelectContent>
            {items.map((i) => (
              <SelectItem key={i.value} value={i.value}>
                {i.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
    );
  }
  const customerOptions = data.customers
    .filter((c) => !c.archived)
    .map((c) => ({ value: c.id, label: c.name }));
  const departureOptions = data.departures.map((d) => ({
    value: d.id,
    label: `${d.title} · ${d.startsOn} · ${d.available} ${t("available")} · ${money(d.priceMinor, d.currency)}`,
  }));
  const queryStatus = searchParams.get("status");
  const bookingFilter =
    filter ??
    (bookingStatuses.some((status) => status === queryStatus)
      ? queryStatus
      : "all");
  const bookingRows = (detail?.bookings ?? data.bookings).filter(
    (b) =>
      (bookingFilter === "all" || b.status === bookingFilter) &&
      `${b.reference} ${b.customerName} ${b.tourTitle}`
        .toLowerCase()
        .includes((search ?? searchParams.get("search") ?? "").toLowerCase()),
  );
  const bookingsTable = (
    <Table>
      <TableHeader>
        <TableRow>
          {[
            "reference",
            "customer",
            "tour",
            "dates",
            "travelers",
            "amount",
            "status",
          ].map((key) => (
            <TableHead key={key}>{t(key)}</TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {bookingRows.map((b) => (
          <TableRow key={b.id}>
            <TableCell className="font-medium">{b.reference}</TableCell>
            <TableCell>
              {b.customerId ? (
                <Button variant="link" asChild className="h-auto p-0">
                  <Link href={`/customers/${b.customerId}`}>
                    {b.customerName}
                  </Link>
                </Button>
              ) : (
                b.customerName
              )}
            </TableCell>
            <TableCell>{b.tourTitle}</TableCell>
            <TableCell>
              {b.startsOn} – {b.endsOn}
            </TableCell>
            <TableCell>{b.travelers}</TableCell>
            <TableCell className="tabular-nums">
              {money(b.totalMinor, b.currency)}
            </TableCell>
            <TableCell>
              {canManage && ["pending", "confirmed"].includes(b.status) ? (
                <Select
                  value={b.status}
                  disabled={pending}
                  onValueChange={(status) =>
                    run({
                      type: "bookingStatus",
                      id: b.id,
                      version: b.version,
                      status,
                    } as Omit<OperationsMutation, "operationId">)
                  }
                >
                  <SelectTrigger aria-label={`${t("status")} ${b.reference}`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {bookingStatuses
                      .filter(
                        (s) =>
                          s === b.status ||
                          s === "cancelled" ||
                          (b.status === "pending" && s === "confirmed") ||
                          (b.status === "confirmed" && s === "completed"),
                      )
                      .map((s) => (
                        <SelectItem key={s} value={s}>
                          {t(`statuses.${s}`)}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              ) : (
                <Badge variant="secondary">{t(`statuses.${b.status}`)}</Badge>
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
  return (
    <section
      className="operations-workspace flex w-full min-w-0 flex-col gap-4"
      aria-busy={pending}
    >
      <header className="admin-page-heading flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">{t(mode)}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {t(`${mode}Description`)}
          </p>
        </div>
        {canManage && (
          <Button
            onClick={() =>
              setModal(
                mode === "customers"
                  ? { type: "customer" }
                  : mode === "sales"
                    ? { type: "inquiry" }
                    : { type: "booking" },
              )
            }
          >
            <Plus />
            {t(
              mode === "customers"
                ? "addCustomer"
                : mode === "sales"
                  ? "addInquiry"
                  : "addBooking",
            )}
          </Button>
        )}
      </header>
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{t(`errors.${error}`)}</AlertDescription>
        </Alert>
      )}
      {notice && (
        <Alert>
          <AlertDescription>{t("saved")}</AlertDescription>
        </Alert>
      )}
      {mode === "bookings" && (
        <div className="flex flex-wrap items-end gap-3">
          <Field className="max-w-sm">
            <FieldLabel htmlFor="bookings-search">{t("search")}</FieldLabel>
            <Input
              id="bookings-search"
              value={search ?? searchParams.get("search") ?? ""}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={t("searchPlaceholder")}
            />
          </Field>
          <Select value={bookingFilter ?? "all"} onValueChange={setFilter}>
            <SelectTrigger aria-label={t("status")} className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("all")}</SelectItem>
              {bookingStatuses.map((status) => (
                <SelectItem key={status} value={status}>
                  {t(`statuses.${status}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
      <OperationsPanels
        data={data}
        mode={mode}
        detail={detail}
        canManage={canManage}
        pending={pending}
        setModal={setModal}
        run={run}
        bookingsTable={bookingsTable}
      />
      <Dialog
        open={modal !== null}
        onOpenChange={(open) => {
          if (!pending && !open) setModal(null);
        }}
      >
        <DialogContent
          closeLabel={t("close")}
          className="max-h-[90svh] overflow-y-auto"
        >
          <DialogHeader>
            <DialogTitle>
              {t(
                modal?.type === "activity"
                  ? modal.kind
                  : (modal?.type ?? "customer"),
              )}
            </DialogTitle>
            <DialogDescription>
              {t(
                modal?.type === "booking" || modal?.type === "quote"
                  ? "serverPrice"
                  : "formDescription",
              )}
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              submit(new FormData(event.currentTarget));
            }}
            className="space-y-4"
          >
            {modal?.type === "customer" && (
              <>
                {textField("name", modal.customer?.name, "text", true)}
                {textField("email", modal.customer?.email, "email")}
                {textField("phone", modal.customer?.phone)}
                {textField("country", modal.customer?.country)}
              </>
            )}
            {(modal?.type === "inquiry" || modal?.type === "booking") &&
              choose(
                "customerId",
                customerOptions,
                modal.type === "booking" ? modal.customerId : undefined,
              )}
            {modal?.type === "inquiry" && textField("title", "", "text", true)}
            {(modal?.type === "quote" || modal?.type === "booking") && (
              <>
                {choose("departureId", departureOptions)}
                {textField("travelers", "1", "number", true)}
              </>
            )}
            {modal?.type === "booking" && (
              <>
                {textField("promotionCode")}
                {choose(
                  "channel",
                  ["direct", "agent", "other"].map((v) => ({
                    value: v,
                    label: t(`channels.${v}`),
                  })),
                  "direct",
                )}
              </>
            )}
            {modal?.type === "stage" && (
              <>
                {choose(
                  "stage",
                  saleStages.map((v) => ({
                    value: v,
                    label: t(`stages.${v}`),
                  })),
                  modal.inquiry.stage,
                )}
                {textField("followUpAt", modal.inquiry.followUpAt, "date")}
              </>
            )}
            {(modal?.type === "inquiry" ||
              modal?.type === "stage" ||
              modal?.type === "activity") && (
              <Field>
                <FieldLabel htmlFor="op-notes">
                  {t(modal.type === "activity" ? "body" : "notes")}
                </FieldLabel>
                <Textarea
                  id="op-notes"
                  name={modal.type === "activity" ? "body" : "notes"}
                  maxLength={10000}
                  required={modal.type === "activity"}
                  defaultValue={
                    modal.type === "stage" ? modal.inquiry.notes : ""
                  }
                  disabled={pending}
                />
              </Field>
            )}
            {modal?.type === "activity" &&
              modal.kind === "document" &&
              textField("url", "", "url", true)}
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{t(`errors.${error}`)}</AlertDescription>
              </Alert>
            )}
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                disabled={pending}
                onClick={() => setModal(null)}
              >
                {t("cancel")}
              </Button>
              <Button type="submit" disabled={pending}>
                {t(pending ? "saving" : "save")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </section>
  );
}
