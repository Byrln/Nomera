"use client";
import type { ErrorCode } from "@nomera/domain/errors";
import {
  type DepartureInput,
  type TourDeparture,
  type TourDetail,
  type TourInput,
  type TourMutation,
  tourInputSchema,
} from "@nomera/schemas/tours";
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
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@nomera/ui/components/dialog";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@nomera/ui/components/empty";
import { FieldGroup } from "@nomera/ui/components/field";
import { Input } from "@nomera/ui/components/input";
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
import { Textarea } from "@nomera/ui/components/textarea";
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  ExternalLink,
  Plus,
  Trash2,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useRef, useState, useTransition } from "react";
import { formatMoney } from "@/lib/format-money";
import { submitTourMutation, type TourActionResult } from "./actions";
import { DepartureEditor } from "./departure-editor";
import { useTourDraftGuard } from "./draft-guard";
import { CurrencySelect, EditorField, minorToMajor } from "./fields";
import { majorToMinor } from "./request";

const emptyInput: TourInput = {
  code: "",
  title: "",
  destination: "",
  category: "",
  durationDays: 1,
  description: "",
  basePriceMinor: 0,
  currency: "MNT",
  itinerary: [],
  media: [],
};

export function TourEditor({
  initial,
  tenantId,
  userId,
  canManage,
  canPublish,
}: {
  initial?: TourDetail;
  tenantId: string;
  userId: string;
  canManage: boolean;
  canPublish: boolean;
}) {
  const t = useTranslations("Tours");
  const locale = useLocale();
  const router = useRouter();
  const [detail, setDetail] = useState(initial);
  const [data, setData] = useState<TourInput>(initial?.data ?? emptyInput);
  const [price, setPrice] = useState(
    minorToMajor(initial?.data.basePriceMinor ?? 0),
  );
  const [tab, setTab] = useState("overview");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<ErrorCode>();
  const [fields, setFields] = useState<string[]>([]);
  const [saved, setSaved] = useState(false);
  const [departure, setDeparture] = useState<TourDeparture | "new" | null>(
    null,
  );
  const [confirm, setConfirm] = useState<"publish" | "archive" | null>(null);
  const [mediaOpen, setMediaOpen] = useState(false);
  const [mediaUrl, setMediaUrl] = useState("");
  const [mediaAlt, setMediaAlt] = useState("");
  const [mediaInvalid, setMediaInvalid] = useState(false);
  const operation = useRef<{ payload: string; id: string } | null>(null);
  const editor = useRef<HTMLElement>(null);
  const candidate = { ...data, basePriceMinor: majorToMinor(price) };
  const dirty =
    JSON.stringify(candidate) !== JSON.stringify(detail?.data ?? emptyInput);
  const readonly = !canManage || detail?.status === "archived";
  const draftGuard = useTourDraftGuard({
    storageKey: `nomera:tour-draft:${userId}:${tenantId}:${initial?.id ?? "new"}`,
    draft: { data, price, version: detail?.version ?? null },
    dirty,
    canEdit: !readonly,
    pending,
    restore: (saved) => {
      setData(saved.data);
      setPrice(saved.price);
      setSaved(false);
    },
  });
  const disabled = readonly || pending || draftGuard.recoveryPending;
  const duration =
    Number.isInteger(data.durationDays) &&
    data.durationDays >= 1 &&
    data.durationDays <= 365
      ? data.durationDays
      : 0;
  const publishReady = Boolean(
    data.destination.trim() &&
      data.category.trim() &&
      data.description.trim() &&
      data.itinerary.length === data.durationDays &&
      duration > 0 &&
      Array.from({ length: duration }, (_, index) => index + 1).every((day) =>
        data.itinerary.some(
          (entry) =>
            entry.day === day && entry.title.trim() && entry.description.trim(),
        ),
      ),
  );
  const activeDepartures =
    detail?.departures.some(
      (entry) => !["completed", "cancelled"].includes(entry.status),
    ) ?? false;
  useEffect(() => {
    if (!fields.length) return;
    const frame = requestAnimationFrame(() =>
      editor.current
        ?.querySelector<HTMLElement>('[aria-invalid="true"]')
        ?.focus(),
    );
    return () => cancelAnimationFrame(frame);
  }, [fields]);
  useEffect(() => {
    if (!dirty) return;
    const beforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    window.addEventListener("beforeunload", beforeUnload);
    return () => window.removeEventListener("beforeunload", beforeUnload);
  }, [dirty]);
  function update<K extends keyof TourInput>(key: K, value: TourInput[K]) {
    setData((current) => ({ ...current, [key]: value }));
    setSaved(false);
  }
  function invalid(key: string) {
    return fields.some(
      (path) => path === `data.${key}` || path.startsWith(`data.${key}.`),
    );
  }
  function validate() {
    const parsed = tourInputSchema.safeParse(candidate);
    if (parsed.success) return true;
    const paths = parsed.error.issues.map(
      (issue) => `data.${issue.path.join(".")}`,
    );
    setError("VALIDATION_ERROR");
    setFields(paths);
    setTab(
      paths[0]?.includes("itinerary")
        ? "itinerary"
        : paths[0]?.includes("media")
          ? "media"
          : "overview",
    );
    return false;
  }
  function run(
    type: TourMutation["type"],
    changedDeparture?: DepartureInput,
  ): Promise<TourActionResult> {
    const payload =
      type === "create"
        ? { type, data: candidate }
        : {
            type,
            tourId: detail?.id,
            version: detail?.version,
            ...(type === "update" ? { data: candidate } : {}),
            ...(type === "saveDeparture"
              ? { departure: changedDeparture }
              : {}),
          };
    const serialized = JSON.stringify(payload);
    if (operation.current?.payload !== serialized)
      operation.current = { payload: serialized, id: crypto.randomUUID() };
    const command = { ...payload, operationId: operation.current.id };
    setError(undefined);
    setFields([]);
    setSaved(false);
    return new Promise((resolve) =>
      startTransition(async () => {
        let result: TourActionResult;
        try {
          result = await submitTourMutation(command);
        } catch {
          result = { ok: false, code: "UNAVAILABLE", fields: [] };
        }
        if (result.ok) {
          operation.current = null;
          draftGuard.clearDraft();
          setDetail(result.data);
          setData(result.data.data);
          setPrice(minorToMajor(result.data.data.basePriceMinor));
          setSaved(true);
          setConfirm(null);
          if (type === "create") router.replace(`/tours/${result.data.id}`);
        } else {
          setError(result.code);
          setFields(result.fields);
        }
        resolve(result);
      }),
    );
  }
  function addDay() {
    const nextDay = Array.from(
      { length: duration },
      (_, index) => index + 1,
    ).find((day) => !data.itinerary.some((entry) => entry.day === day));
    if (nextDay)
      update(
        "itinerary",
        [...data.itinerary, { day: nextDay, title: "", description: "" }].sort(
          (left, right) => left.day - right.day,
        ),
      );
  }
  function addMedia() {
    const parsed = tourInputSchema.shape.media.element.safeParse({
      url: mediaUrl,
      alt: mediaAlt,
    });
    if (
      !parsed.success ||
      data.media.some((item) => item.url === parsed.data.url)
    ) {
      setMediaInvalid(true);
      return;
    }
    update("media", [...data.media, parsed.data]);
    setMediaOpen(false);
    setMediaUrl("");
    setMediaAlt("");
    setMediaInvalid(false);
  }
  const money = (minor: number, currency: string) =>
    formatMoney(minor, currency, locale);
  return (
    <section
      ref={editor}
      className="admin-page flex flex-col gap-5"
      aria-busy={pending}
    >
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <Button asChild variant="outline" size="icon">
            <Link href="/tours" aria-label={t("backToTours")}>
              <ArrowLeft aria-hidden="true" />
            </Link>
          </Button>
          <div className="min-w-0">
            <h1 className="text-xl font-semibold break-words tracking-tight">
              {detail?.data.title || t("newTour")}
            </h1>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <Badge
                variant={
                  detail?.status === "published" ? "default" : "secondary"
                }
              >
                {t(`status.${detail?.status ?? "draft"}`)}
              </Badge>
              <p className="text-xs text-muted-foreground" role="status">
                {t(
                  readonly
                    ? "readOnly"
                    : pending
                      ? "saving"
                      : dirty
                        ? "unsaved"
                        : saved
                          ? "saved"
                          : "editorDescription",
                )}
              </p>
            </div>
          </div>
        </div>
        {!readonly && (
          <div className="flex flex-wrap gap-2">
            <Button
              type="submit"
              form="tour-form"
              disabled={disabled || (Boolean(detail) && !dirty)}
            >
              {t(pending ? "saving" : detail ? "save" : "createDraft")}
            </Button>
            {detail && canPublish && (
              <>
                <Button
                  type="button"
                  variant="outline"
                  disabled={disabled || dirty}
                  onClick={() => setConfirm("publish")}
                >
                  {t(detail.published ? "publishChanges" : "publish")}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  disabled={disabled || dirty}
                  onClick={() => setConfirm("archive")}
                >
                  {t("archive")}
                </Button>
              </>
            )}
          </div>
        )}
      </header>
      {draftGuard.recoveryNotice}
      {error && (
        <Alert variant="destructive">
          <AlertTitle>{t("errorTitle")}</AlertTitle>
          <AlertDescription>
            <p>{t(`errors.${error}`)}</p>
            {error === "CONFLICT" && (
              <Button
                type="button"
                variant="outline"
                className="mt-2"
                onClick={() => window.location.reload()}
              >
                {t("reloadLatest")}
              </Button>
            )}
            {error === "UNAUTHENTICATED" && (
              <Button asChild variant="outline" className="mt-2">
                <Link href="/sign-in">{t("signIn")}</Link>
              </Button>
            )}
          </AlertDescription>
        </Alert>
      )}
      {detail?.published && (
        <Alert>
          <AlertTitle>{t("publishedSnapshot")}</AlertTitle>
          <AlertDescription>
            {t("publishedSnapshotDescription", {
              date: new Intl.DateTimeFormat(locale, {
                dateStyle: "medium",
                timeZone: "Asia/Ulaanbaatar",
              }).format(new Date(detail.published.publishedAt)),
            })}
          </AlertDescription>
        </Alert>
      )}
      <form
        id="tour-form"
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          if (!disabled && validate()) void run(detail ? "update" : "create");
        }}
      >
        <Tabs value={tab} onValueChange={setTab} className="gap-5">
          <TabsList
            className="grid h-auto w-full grid-cols-2 sm:flex sm:w-fit"
            variant="line"
          >
            {(["overview", "itinerary", "media", "departures"] as const).map(
              (item) => (
                <TabsTrigger key={item} value={item} className="min-h-10 px-4">
                  {t(item)}
                </TabsTrigger>
              ),
            )}
          </TabsList>
          <TabsContent value="overview">
            <div className="grid min-w-0 items-start gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
              <Card>
                <CardHeader>
                  <CardTitle>{t("tourDetails")}</CardTitle>
                  <CardDescription>
                    {t("tourDetailsDescription")}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <FieldGroup>
                    <EditorField
                      id="tour-title"
                      label={t("tourTitle")}
                      invalid={invalid("title")}
                    >
                      <Input
                        id="tour-title"
                        value={data.title}
                        maxLength={200}
                        disabled={disabled}
                        onChange={(event) =>
                          update("title", event.target.value)
                        }
                        aria-invalid={invalid("title")}
                      />
                    </EditorField>
                    <EditorField
                      id="tour-description"
                      label={t("description")}
                      invalid={invalid("description")}
                    >
                      <Textarea
                        id="tour-description"
                        value={data.description}
                        maxLength={20000}
                        rows={9}
                        disabled={disabled}
                        onChange={(event) =>
                          update("description", event.target.value)
                        }
                        aria-invalid={invalid("description")}
                      />
                    </EditorField>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <EditorField
                        id="tour-code"
                        label={t("code")}
                        invalid={invalid("code")}
                      >
                        <Input
                          id="tour-code"
                          value={data.code}
                          maxLength={64}
                          disabled={disabled}
                          onChange={(event) =>
                            update("code", event.target.value)
                          }
                          aria-invalid={invalid("code")}
                        />
                      </EditorField>
                      <EditorField
                        id="tour-duration"
                        label={t("durationDays")}
                        invalid={invalid("durationDays")}
                      >
                        <Input
                          id="tour-duration"
                          type="number"
                          min={1}
                          max={365}
                          step={1}
                          value={
                            Number.isNaN(data.durationDays)
                              ? ""
                              : data.durationDays
                          }
                          disabled={disabled}
                          onChange={(event) =>
                            update(
                              "durationDays",
                              event.target.value === ""
                                ? Number.NaN
                                : Number(event.target.value),
                            )
                          }
                          aria-invalid={invalid("durationDays")}
                        />
                      </EditorField>
                    </div>
                  </FieldGroup>
                </CardContent>
              </Card>
              <div className="flex min-w-0 flex-col gap-5">
                <Card>
                  <CardHeader>
                    <CardTitle>{t("organization")}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <FieldGroup>
                      <EditorField
                        id="tour-destination-edit"
                        label={t("destination")}
                        invalid={invalid("destination")}
                      >
                        <Input
                          id="tour-destination-edit"
                          maxLength={120}
                          value={data.destination}
                          disabled={disabled}
                          onChange={(event) =>
                            update("destination", event.target.value)
                          }
                        />
                      </EditorField>
                      <EditorField
                        id="tour-category-edit"
                        label={t("category")}
                        invalid={invalid("category")}
                      >
                        <Input
                          id="tour-category-edit"
                          maxLength={80}
                          value={data.category}
                          disabled={disabled}
                          onChange={(event) =>
                            update("category", event.target.value)
                          }
                        />
                      </EditorField>
                    </FieldGroup>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle>{t("pricing")}</CardTitle>
                    <CardDescription>{t("pricingDescription")}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <FieldGroup>
                      <EditorField
                        id="tour-price"
                        label={t("basePrice")}
                        invalid={invalid("basePriceMinor")}
                      >
                        <Input
                          id="tour-price"
                          inputMode="decimal"
                          value={price}
                          disabled={disabled}
                          onChange={(event) => {
                            setPrice(event.target.value);
                            setSaved(false);
                          }}
                          aria-invalid={invalid("basePriceMinor")}
                        />
                      </EditorField>
                      <EditorField id="tour-currency" label={t("currency")}>
                        <CurrencySelect
                          id="tour-currency"
                          value={data.currency}
                          disabled={disabled}
                          onChange={(value) => update("currency", value)}
                        />
                      </EditorField>
                    </FieldGroup>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>
          <TabsContent value="itinerary">
            <Card>
              <CardHeader>
                <CardTitle>{t("itinerary")}</CardTitle>
                <CardDescription>{t("itineraryDescription")}</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-5">
                {invalid("itinerary") && (
                  <Alert variant="destructive">
                    <AlertDescription>{t("itineraryInvalid")}</AlertDescription>
                  </Alert>
                )}
                {data.itinerary.length === 0 && (
                  <Empty>
                    <EmptyHeader>
                      <EmptyTitle>{t("noItinerary")}</EmptyTitle>
                      <EmptyDescription>
                        {t("itineraryDescription")}
                      </EmptyDescription>
                    </EmptyHeader>
                  </Empty>
                )}
                {data.itinerary.map((entry) => (
                  <FieldGroup
                    key={entry.day}
                    className="border-b pb-5 last:border-0"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <h2 className="font-semibold">
                        {t("dayNumber", { day: entry.day })}
                      </h2>
                      {!readonly && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          disabled={disabled}
                          onClick={() =>
                            update(
                              "itinerary",
                              data.itinerary.filter(
                                (item) => item.day !== entry.day,
                              ),
                            )
                          }
                        >
                          <Trash2 aria-hidden="true" />
                          {t("remove")}
                        </Button>
                      )}
                    </div>
                    <EditorField
                      id={`day-${entry.day}-title`}
                      label={t("dayTitle")}
                    >
                      <Input
                        id={`day-${entry.day}-title`}
                        value={entry.title}
                        maxLength={200}
                        disabled={disabled}
                        onChange={(event) =>
                          update(
                            "itinerary",
                            data.itinerary.map((item) =>
                              item.day === entry.day
                                ? { ...item, title: event.target.value }
                                : item,
                            ),
                          )
                        }
                      />
                    </EditorField>
                    <EditorField
                      id={`day-${entry.day}-description`}
                      label={t("dayDescription")}
                    >
                      <Textarea
                        id={`day-${entry.day}-description`}
                        value={entry.description}
                        maxLength={10000}
                        rows={4}
                        disabled={disabled}
                        onChange={(event) =>
                          update(
                            "itinerary",
                            data.itinerary.map((item) =>
                              item.day === entry.day
                                ? { ...item, description: event.target.value }
                                : item,
                            ),
                          )
                        }
                      />
                    </EditorField>
                  </FieldGroup>
                ))}
                {!readonly && (
                  <Button
                    type="button"
                    variant="outline"
                    className="self-start"
                    disabled={
                      disabled ||
                      !Number.isInteger(data.durationDays) ||
                      data.itinerary.length >= data.durationDays
                    }
                    onClick={addDay}
                  >
                    <Plus aria-hidden="true" />
                    {t("addDay")}
                  </Button>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="media">
            <Card>
              <CardHeader>
                <CardTitle>{t("media")}</CardTitle>
                <CardDescription>{t("mediaDescription")}</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                {data.media.length === 0 && (
                  <Empty>
                    <EmptyHeader>
                      <EmptyTitle>{t("noMedia")}</EmptyTitle>
                      <EmptyDescription>
                        {t("mediaDescription")}
                      </EmptyDescription>
                    </EmptyHeader>
                  </Empty>
                )}
                {data.media.map((entry, index) => (
                  <div
                    key={entry.url}
                    className="grid min-w-0 gap-4 border-b pb-4 sm:grid-cols-[8rem_minmax(0,1fr)]"
                  >
                    <Image
                      src={entry.url}
                      alt={entry.alt}
                      width={160}
                      height={120}
                      unoptimized
                      referrerPolicy="no-referrer"
                      className="aspect-[4/3] w-32 rounded-lg object-cover"
                    />
                    <div className="flex min-w-0 flex-col gap-3">
                      <p className="text-xs break-all text-muted-foreground">
                        {entry.url}
                      </p>
                      <EditorField
                        id={`media-alt-${index}`}
                        label={t("altText")}
                      >
                        <Input
                          id={`media-alt-${index}`}
                          value={entry.alt}
                          maxLength={300}
                          disabled={disabled}
                          onChange={(event) =>
                            update(
                              "media",
                              data.media.map((item) =>
                                item.url === entry.url
                                  ? { ...item, alt: event.target.value }
                                  : item,
                              ),
                            )
                          }
                        />
                      </EditorField>
                      <div className="flex flex-wrap gap-2">
                        <Button asChild variant="outline" size="sm">
                          <a href={entry.url} target="_blank" rel="noreferrer">
                            {t("openImage")}
                            <ExternalLink aria-hidden="true" />
                          </a>
                        </Button>
                        {!readonly && (
                          <>
                            <Button
                              type="button"
                              size="icon-sm"
                              variant="outline"
                              aria-label={t("moveImageUp")}
                              disabled={disabled || index === 0}
                              onClick={() => {
                                const list = [...data.media];
                                const prior = list[index - 1];
                                if (prior) {
                                  list[index - 1] = entry;
                                  list[index] = prior;
                                  update("media", list);
                                }
                              }}
                            >
                              <ArrowUp aria-hidden="true" />
                            </Button>
                            <Button
                              type="button"
                              size="icon-sm"
                              variant="outline"
                              aria-label={t("moveImageDown")}
                              disabled={
                                disabled || index === data.media.length - 1
                              }
                              onClick={() => {
                                const list = [...data.media];
                                const next = list[index + 1];
                                if (next) {
                                  list[index + 1] = entry;
                                  list[index] = next;
                                  update("media", list);
                                }
                              }}
                            >
                              <ArrowDown aria-hidden="true" />
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              disabled={disabled}
                              onClick={() =>
                                update(
                                  "media",
                                  data.media.filter(
                                    (item) => item.url !== entry.url,
                                  ),
                                )
                              }
                            >
                              {t("remove")}
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                {!readonly && (
                  <Button
                    type="button"
                    variant="outline"
                    className="self-start"
                    disabled={disabled || data.media.length >= 30}
                    onClick={() => setMediaOpen(true)}
                  >
                    <Plus aria-hidden="true" />
                    {t("addImage")}
                  </Button>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="departures">
            <Card>
              <CardHeader>
                <CardTitle>{t("departures")}</CardTitle>
                <CardDescription>
                  {t(
                    !detail
                      ? "saveBeforeDeparture"
                      : dirty
                        ? "saveBeforeAction"
                        : "departuresDescription",
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                {detail?.departures.length ? (
                  <Table
                    aria-label={t("departureTable")}
                    containerProps={{
                      tabIndex: 0,
                      "aria-label": t("departureTable"),
                    }}
                  >
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t("dates")}</TableHead>
                        <TableHead>{t("statusLabel")}</TableHead>
                        <TableHead className="text-right">
                          {t("capacity")}
                        </TableHead>
                        <TableHead className="text-right">
                          {t("reserved")}
                        </TableHead>
                        <TableHead className="text-right">
                          {t("price")}
                        </TableHead>
                        <TableHead>{t("actions")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {detail.departures.map((entry) => (
                        <TableRow key={entry.id}>
                          <TableCell>
                            {entry.startsOn}
                            <span className="block text-xs text-muted-foreground">
                              {entry.endsOn}
                            </span>
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary">
                              {t(`departureStatus.${entry.status}`)}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {entry.capacity}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {entry.reserved}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {money(entry.priceMinor, entry.currency)}
                          </TableCell>
                          <TableCell>
                            {!readonly &&
                            !["completed", "cancelled"].includes(
                              entry.status,
                            ) ? (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                disabled={disabled || dirty}
                                onClick={() => setDeparture(entry)}
                              >
                                {t("edit")}
                              </Button>
                            ) : (
                              t("readOnly")
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <Empty>
                    <EmptyHeader>
                      <EmptyTitle>{t("noDepartures")}</EmptyTitle>
                      <EmptyDescription>
                        {t(
                          !detail
                            ? "saveBeforeDeparture"
                            : "departuresDescription",
                        )}
                      </EmptyDescription>
                    </EmptyHeader>
                  </Empty>
                )}
                {!readonly && (
                  <Button
                    type="button"
                    variant="outline"
                    className="self-start"
                    disabled={!detail || disabled || dirty}
                    onClick={() => setDeparture("new")}
                  >
                    <Plus aria-hidden="true" />
                    {t("addDeparture")}
                  </Button>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </form>
      {departure && (
        <DepartureEditor
          existing={departure === "new" ? undefined : departure}
          currency={data.currency}
          basePrice={detail?.data.basePriceMinor ?? 0}
          pending={pending}
          close={() => setDeparture(null)}
          save={(input) => run("saveDeparture", input)}
        />
      )}
      <Dialog open={mediaOpen} onOpenChange={setMediaOpen}>
        <DialogContent closeLabel={t("close")}>
          <DialogHeader>
            <DialogTitle>{t("addImage")}</DialogTitle>
            <DialogDescription>{t("mediaDescription")}</DialogDescription>
          </DialogHeader>
          <form
            id="media-form"
            className="flex flex-col gap-4"
            noValidate
            onSubmit={(event) => {
              event.preventDefault();
              if (!disabled) addMedia();
            }}
          >
            {mediaInvalid && (
              <Alert variant="destructive">
                <AlertDescription>{t("mediaInvalid")}</AlertDescription>
              </Alert>
            )}
            <EditorField id="media-url" label={t("imageUrl")}>
              <Input
                id="media-url"
                type="url"
                value={mediaUrl}
                maxLength={2048}
                disabled={disabled}
                onChange={(event) => setMediaUrl(event.target.value)}
              />
            </EditorField>
            <EditorField id="media-alt" label={t("altText")}>
              <Input
                id="media-alt"
                value={mediaAlt}
                maxLength={300}
                disabled={disabled}
                onChange={(event) => setMediaAlt(event.target.value)}
              />
            </EditorField>
          </form>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">
                {t("cancel")}
              </Button>
            </DialogClose>
            <Button type="submit" form="media-form" disabled={disabled}>
              {t("addImage")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog
        open={confirm !== null}
        onOpenChange={(open) => {
          if (!open && !pending) setConfirm(null);
        }}
      >
        <DialogContent closeLabel={t("close")} showCloseButton={!pending}>
          <DialogHeader>
            <DialogTitle>
              {t(confirm === "archive" ? "archiveTitle" : "publishTitle")}
            </DialogTitle>
            <DialogDescription>
              {t(
                confirm === "archive"
                  ? activeDepartures
                    ? "archiveBlocked"
                    : "archiveDescription"
                  : publishReady
                    ? "publishDescription"
                    : "publishRequirements",
              )}
            </DialogDescription>
          </DialogHeader>
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{t(`errors.${error}`)}</AlertDescription>
            </Alert>
          )}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={disabled}
              onClick={() => setConfirm(null)}
            >
              {t("cancel")}
            </Button>
            <Button
              type="button"
              variant={confirm === "archive" ? "destructive" : "default"}
              disabled={
                disabled ||
                (confirm === "archive" ? activeDepartures : !publishReady)
              }
              onClick={() => {
                if (confirm) void run(confirm);
              }}
            >
              {t(
                pending
                  ? "saving"
                  : confirm === "archive"
                    ? "archive"
                    : "publish",
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {draftGuard.navigationDialog}
    </section>
  );
}
