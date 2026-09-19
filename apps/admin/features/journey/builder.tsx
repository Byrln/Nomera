"use client";
import {
  type JourneyData,
  type JourneyStep,
  journeyStepTypes,
} from "@nomera/schemas/journey";
import { Alert, AlertDescription } from "@nomera/ui/components/alert";
import { Badge } from "@nomera/ui/components/badge";
import { Button } from "@nomera/ui/components/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@nomera/ui/components/card";
import { Checkbox } from "@nomera/ui/components/checkbox";
import { Input } from "@nomera/ui/components/input";
import { Label } from "@nomera/ui/components/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@nomera/ui/components/select";
import { Textarea } from "@nomera/ui/components/textarea";
import { ArrowDown, ArrowUp, Eye, Plus, Save, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { submitJourney } from "./actions";

function newStep(title: string): JourneyStep {
  return {
    id: crypto.randomUUID(),
    type: "CUSTOM",
    title,
    scheduledAt: "",
    visible: false,
    required: true,
    status: "planned",
    travelerNotes: "",
    internalNotes: "",
    details: {
      location: "",
      contact: "",
      flightNumber: "",
      vehicle: "",
      accommodation: "",
    },
    attachments: [],
  };
}
export function JourneyBuilder({
  options,
  initial,
  canManage,
}: {
  options: Array<{ id: string; title: string; startsOn: string }>;
  initial: JourneyData | null;
  canManage: boolean;
}) {
  const t = useTranslations("Journey");
  const router = useRouter();
  const [data, setData] = useState(initial);
  const [selected, setSelected] = useState(initial?.steps[0]?.id ?? "");
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState("");
  const [failed, setFailed] = useState(false);
  const step = data?.steps.find((item) => item.id === selected);
  const change = (patch: Partial<JourneyStep>) => {
    setMessage("");
    setData((current) =>
      current
        ? {
            ...current,
            steps: current.steps.map((item) =>
              item.id === selected ? { ...item, ...patch } : item,
            ),
          }
        : current,
    );
  };
  const reorder = (offset: number) => {
    if (!data) return;
    const index = data.steps.findIndex((item) => item.id === selected);
    const next = index + offset;
    if (index < 0 || next < 0 || next >= data.steps.length) return;
    const steps = [...data.steps];
    const [removed] = steps.splice(index, 1);
    if (removed) steps.splice(next, 0, removed);
    setData({ ...data, steps });
    setMessage("");
  };
  return (
    <div className="admin-page space-y-6">
      <header className="flex flex-wrap justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {t("title")}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("description")}
          </p>
        </div>
        <Button
          disabled={!data || !canManage || pending}
          onClick={() => {
            if (!data) return;
            setMessage("");
            startTransition(async () => {
              const result = await submitJourney({
                departureId: data.departureId,
                version: data.version,
                steps: data.steps,
              });
              setFailed(!result.ok);
              if (result.ok) {
                setData(result.data);
                setMessage(t("saved"));
              } else
                setMessage(
                  t(result.code === "CONFLICT" ? "conflict" : "failed"),
                );
            });
          }}
        >
          <Save className="size-4" />
          {pending ? t("saving") : t("save")}
        </Button>
      </header>
      {message && (
        <Alert variant={failed ? "destructive" : "default"}>
          <AlertDescription>{message}</AlertDescription>
        </Alert>
      )}
      <div className="max-w-xl space-y-2">
        <Label htmlFor="journey-departure">{t("departure")}</Label>
        <Select
          value={data?.departureId ?? ""}
          onValueChange={(id) =>
            router.push(`/journey-builder?departure=${id}`)
          }
          disabled={pending}
        >
          <SelectTrigger id="journey-departure" className="w-full">
            <SelectValue placeholder={t("chooseDeparture")} />
          </SelectTrigger>
          <SelectContent>
            {options.map((option) => (
              <SelectItem key={option.id} value={option.id}>
                {option.title} · {option.startsOn}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {!data ? (
        <Alert>
          <AlertDescription>{t("emptyDepartures")}</AlertDescription>
        </Alert>
      ) : (
        <div className="grid min-w-0 items-start gap-4 xl:grid-cols-[15rem_minmax(0,1fr)_18rem]">
          <Card className="min-w-0">
            <CardHeader>
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="text-base">{t("steps")}</CardTitle>
                <Button
                  size="icon"
                  variant="outline"
                  aria-label={t("add")}
                  disabled={!canManage || pending || data.steps.length >= 200}
                  onClick={() => {
                    const item = newStep(t("newStep"));
                    setData({ ...data, steps: [...data.steps, item] });
                    setSelected(item.id);
                    setMessage("");
                  }}
                >
                  <Plus className="size-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {data.steps.length ? (
                data.steps.map((item, index) => (
                  <Button
                    key={item.id}
                    variant={selected === item.id ? "secondary" : "ghost"}
                    className="h-auto min-h-10 w-full justify-start gap-3 whitespace-normal py-3 text-left"
                    onClick={() => setSelected(item.id)}
                  >
                    <span className="text-xs text-muted-foreground">
                      {index + 1}
                    </span>
                    <span className="min-w-0 break-words">{item.title}</span>
                    {item.visible && (
                      <Eye className="ml-auto size-3 shrink-0" />
                    )}
                  </Button>
                ))
              ) : (
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {t("emptySteps")}
                </p>
              )}
            </CardContent>
          </Card>
          <Card className="min-w-0">
            <CardHeader>
              <div className="flex flex-wrap justify-between gap-3">
                <CardTitle className="text-base">{t("editor")}</CardTitle>
                {step && (
                  <div className="flex gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      aria-label={t("up")}
                      disabled={
                        !canManage || pending || data.steps[0]?.id === step.id
                      }
                      onClick={() => reorder(-1)}
                    >
                      <ArrowUp className="size-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      aria-label={t("down")}
                      disabled={
                        !canManage ||
                        pending ||
                        data.steps.at(-1)?.id === step.id
                      }
                      onClick={() => reorder(1)}
                    >
                      <ArrowDown className="size-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      aria-label={t("remove")}
                      disabled={!canManage || pending}
                      onClick={() => {
                        const steps = data.steps.filter(
                          (item) => item.id !== selected,
                        );
                        setData({ ...data, steps });
                        setSelected(steps[0]?.id ?? "");
                        setMessage("");
                      }}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {!step ? (
                <p className="text-sm text-muted-foreground">
                  {t("selectStep")}
                </p>
              ) : (
                <fieldset
                  disabled={!canManage || pending}
                  className="space-y-4"
                >
                  <div className="space-y-2">
                    <Label htmlFor="step-title">{t("stepTitle")}</Label>
                    <Input
                      id="step-title"
                      value={step.title}
                      maxLength={200}
                      onChange={(event) =>
                        change({ title: event.target.value })
                      }
                    />
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="step-type">{t("type")}</Label>
                      <Select
                        value={step.type}
                        onValueChange={(value) =>
                          change({ type: value as JourneyStep["type"] })
                        }
                        disabled={!canManage || pending}
                      >
                        <SelectTrigger id="step-type" className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {journeyStepTypes.map((type) => (
                            <SelectItem key={type} value={type}>
                              {t(`types.${type}`)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="step-status">{t("status")}</Label>
                      <Select
                        value={step.status}
                        onValueChange={(value) =>
                          change({ status: value as JourneyStep["status"] })
                        }
                        disabled={!canManage || pending}
                      >
                        <SelectTrigger id="step-status" className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {(
                            [
                              "planned",
                              "ready",
                              "completed",
                              "cancelled",
                            ] as const
                          ).map((status) => (
                            <SelectItem key={status} value={status}>
                              {t(`statuses.${status}`)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="step-time">{t("time")}</Label>
                    <Input
                      id="step-time"
                      type="datetime-local"
                      value={
                        step.scheduledAt
                          ? new Date(
                              new Date(step.scheduledAt).getTime() -
                                new Date(step.scheduledAt).getTimezoneOffset() *
                                  60000,
                            )
                              .toISOString()
                              .slice(0, 16)
                          : ""
                      }
                      onChange={(event) =>
                        change({
                          scheduledAt: event.target.value
                            ? new Date(event.target.value).toISOString()
                            : "",
                        })
                      }
                    />
                  </div>
                  <div className="flex flex-wrap gap-5">
                    <Label className="flex items-center gap-2">
                      <Checkbox
                        checked={step.visible}
                        onCheckedChange={(checked) =>
                          change({ visible: checked === true })
                        }
                      />
                      {t("visible")}
                    </Label>
                    <Label className="flex items-center gap-2">
                      <Checkbox
                        checked={step.required}
                        onCheckedChange={(checked) =>
                          change({ required: checked === true })
                        }
                      />
                      {t("required")}
                    </Label>
                  </div>
                  {(
                    [
                      "location",
                      "contact",
                      ...(["FLIGHT_ARRIVAL", "FLIGHT_DEPARTURE"].includes(
                        step.type,
                      )
                        ? ["flightNumber"]
                        : []),
                      ...([
                        "AIRPORT_PICKUP",
                        "TRANSFER",
                        "RETURN_TRANSFER",
                      ].includes(step.type)
                        ? ["vehicle"]
                        : []),
                      ...(["HOTEL_CHECKIN", "HOTEL_CHECKOUT"].includes(
                        step.type,
                      )
                        ? ["accommodation"]
                        : []),
                    ] as Array<keyof JourneyStep["details"]>
                  ).map((key) => (
                    <div className="space-y-2" key={key}>
                      <Label htmlFor={`detail-${key}`}>
                        {t(`details.${key}`)}
                      </Label>
                      <Input
                        id={`detail-${key}`}
                        value={step.details[key]}
                        maxLength={key === "flightNumber" ? 50 : 200}
                        onChange={(event) =>
                          change({
                            details: {
                              ...step.details,
                              [key]: event.target.value,
                            },
                          })
                        }
                      />
                    </div>
                  ))}
                  <div className="space-y-2">
                    <Label htmlFor="traveler-notes">{t("travelerNotes")}</Label>
                    <Textarea
                      id="traveler-notes"
                      value={step.travelerNotes}
                      maxLength={10000}
                      onChange={(event) =>
                        change({ travelerNotes: event.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="internal-notes">{t("internalNotes")}</Label>
                    <Textarea
                      id="internal-notes"
                      value={step.internalNotes}
                      maxLength={10000}
                      onChange={(event) =>
                        change({ internalNotes: event.target.value })
                      }
                    />
                    <p className="text-xs text-muted-foreground">
                      {t("privateNotice")}
                    </p>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <Label>{t("attachments")}</Label>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={step.attachments.length >= 20}
                        onClick={() =>
                          change({
                            attachments: [
                              ...step.attachments,
                              { id: crypto.randomUUID(), title: "", url: "" },
                            ],
                          })
                        }
                      >
                        <Plus className="size-3" />
                        {t("add")}
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {t("attachmentNotice")}
                    </p>
                    {step.attachments.map((attachment, index) => (
                      <div
                        key={attachment.id}
                        className="space-y-2 rounded-lg border p-3"
                      >
                        <Input
                          aria-label={t("documentTitle")}
                          value={attachment.title}
                          maxLength={200}
                          onChange={(event) =>
                            change({
                              attachments: step.attachments.map((item, i) =>
                                i === index
                                  ? { ...item, title: event.target.value }
                                  : item,
                              ),
                            })
                          }
                        />
                        <Input
                          aria-label={t("documentUrl")}
                          type="url"
                          value={attachment.url}
                          maxLength={2048}
                          placeholder="https://"
                          onChange={(event) =>
                            change({
                              attachments: step.attachments.map((item, i) =>
                                i === index
                                  ? { ...item, url: event.target.value }
                                  : item,
                              ),
                            })
                          }
                        />
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() =>
                            change({
                              attachments: step.attachments.filter(
                                (_, i) => i !== index,
                              ),
                            })
                          }
                        >
                          {t("remove")}
                        </Button>
                      </div>
                    ))}
                  </div>
                </fieldset>
              )}
            </CardContent>
          </Card>
          <Card className="min-w-0">
            <CardHeader>
              <CardTitle className="text-base">{t("preview")}</CardTitle>
              <p className="text-xs text-muted-foreground">
                {t("previewNotice")}
              </p>
            </CardHeader>
            <CardContent>
              <h3 className="mb-5 font-semibold">{data.departureTitle}</h3>
              <ol className="space-y-5 border-l pl-4">
                {data.steps
                  .filter((item) => item.visible)
                  .map((item) => (
                    <li key={item.id} className="space-y-2">
                      <Badge variant="outline">
                        {t(`statuses.${item.status}`)}
                      </Badge>
                      <h4 className="break-words text-sm font-semibold">
                        {item.title}
                      </h4>
                      {item.scheduledAt && (
                        <p className="text-xs text-muted-foreground">
                          {item.scheduledAt.replace("T", " ").slice(0, 16)} UTC
                        </p>
                      )}
                      {item.travelerNotes && (
                        <p className="whitespace-pre-wrap break-words text-sm text-muted-foreground">
                          {item.travelerNotes}
                        </p>
                      )}
                      {item.details.location && (
                        <p className="text-xs">{item.details.location}</p>
                      )}
                      {item.attachments.map((attachment) => (
                        <p key={attachment.id} className="break-words text-xs">
                          {attachment.title}
                        </p>
                      ))}
                    </li>
                  ))}
              </ol>
              {!data.steps.some((item) => item.visible) && (
                <p className="text-sm text-muted-foreground">
                  {t("emptyPreview")}
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
