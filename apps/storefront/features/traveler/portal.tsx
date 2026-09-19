"use client";
import type { TravelerJourneyStep } from "@nomera/schemas/journey";
import { storefrontMoney } from "@nomera/storefront-themes/money";
import { Alert, AlertDescription } from "@nomera/ui/components/alert";
import { Badge } from "@nomera/ui/components/badge";
import { Button } from "@nomera/ui/components/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@nomera/ui/components/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@nomera/ui/components/tabs";
import {
  CalendarDays,
  FileText,
  Headphones,
  Hotel,
  MapPin,
  Route,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { leaveTrip } from "./actions";
import { travelDate, travelEventDate } from "./format-date";

type Booking = {
  reference: string;
  status: "pending" | "confirmed" | "completed" | "cancelled";
  customerName: string;
  travelers: number;
  totalMinor: number;
  currency: string;
  departure: { startsOn: string; endsOn: string };
  tour: {
    title: string;
    destination: string;
    itinerary: Array<{ day: number; title: string; description: string }>;
  };
};
export function TravelerPortal({
  slug,
  booking,
  steps,
  support,
}: {
  slug: string;
  booking: Booking;
  steps: TravelerJourneyStep[];
  support: { email: string; phone: string };
}) {
  const t = useTranslations("Traveler");
  const locale = useLocale();
  const date = (value: string) => travelDate(value, locale);
  const eventDate = (value: string) => travelEventDate(value, locale);
  const stays = steps.filter((step) =>
    ["HOTEL_CHECKIN", "HOTEL_CHECKOUT"].includes(step.type),
  );
  const documents = steps.flatMap((step) => step.attachments);
  const stepView = (step: TravelerJourneyStep) => (
    <Card key={step.id}>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-base">{step.title}</CardTitle>
          <Badge variant="outline">{t(`stepStatus.${step.status}`)}</Badge>
        </div>
        {step.scheduledAt && (
          <p className="text-sm text-muted-foreground">
            {eventDate(step.scheduledAt)}
          </p>
        )}
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        {step.travelerNotes && (
          <p className="whitespace-pre-wrap leading-relaxed">
            {step.travelerNotes}
          </p>
        )}
        {Object.entries(step.details)
          .filter(([, value]) => value)
          .map(([key, value]) => (
            <p key={key}>
              <span className="text-muted-foreground">
                {t(`details.${key}`)}:{" "}
              </span>
              {value}
            </p>
          ))}
        {!step.required && <Badge variant="secondary">{t("optional")}</Badge>}
        {step.attachments.map((document) => (
          <Button
            key={document.id}
            variant="link"
            asChild
            className="h-auto max-w-full justify-start p-0 whitespace-normal"
          >
            <a href={document.url} target="_blank" rel="noreferrer">
              <FileText className="size-4 shrink-0" />
              {document.title}
            </a>
          </Button>
        ))}
      </CardContent>
    </Card>
  );
  return (
    <section className="mx-auto max-w-4xl px-4 py-8 md:py-12">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="mb-2 text-sm text-muted-foreground">
            {t("welcome", { name: booking.customerName })}
          </p>
          <h1 className="font-serif text-3xl md:text-4xl">
            {booking.tour.title}
          </h1>
          <p className="mt-3 flex items-center gap-2 text-muted-foreground">
            <MapPin className="size-4" />
            {booking.tour.destination}
          </p>
        </div>
        <Badge variant="outline">{t(`status.${booking.status}`)}</Badge>
      </div>
      {booking.status === "pending" && (
        <Alert className="mb-6">
          <AlertDescription>{t("paymentPending")}</AlertDescription>
        </Alert>
      )}
      <Tabs defaultValue="trip" className="gap-6">
        <TabsList className="sticky top-2 z-10 grid h-auto w-full grid-cols-5 bg-muted p-1 shadow-sm">
          {(
            [
              { key: "trip", icon: CalendarDays },
              { key: "journey", icon: Route },
              { key: "stays", icon: Hotel },
              { key: "documents", icon: FileText },
              { key: "support", icon: Headphones },
            ] as const
          ).map(({ key, icon: Icon }) => (
            <TabsTrigger
              key={key}
              value={key}
              className="min-w-0 flex-col gap-1 px-1 py-2 text-[10px] sm:flex-row sm:gap-2 sm:text-sm"
            >
              <Icon className="size-4" />
              <span>{t(`tabs.${key}`)}</span>
            </TabsTrigger>
          ))}
        </TabsList>
        <TabsContent value="trip" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{t("overview")}</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-1 gap-5 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-muted-foreground">{t("reference")}</dt>
                  <dd className="mt-1 font-semibold">{booking.reference}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">{t("dates")}</dt>
                  <dd className="mt-1">
                    {date(booking.departure.startsOn)} —{" "}
                    {date(booking.departure.endsOn)}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">{t("travelers")}</dt>
                  <dd className="mt-1">{booking.travelers}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">{t("total")}</dt>
                  <dd className="mt-1 font-semibold">
                    {storefrontMoney(
                      booking.totalMinor,
                      booking.currency,
                      locale,
                    )}
                  </dd>
                </div>
              </dl>
            </CardContent>
          </Card>
          {booking.tour.itinerary.length > 0 && (
            <section>
              <h2 className="mb-4 text-xl font-semibold">{t("itinerary")}</h2>
              <ol className="space-y-5 border-l pl-5">
                {booking.tour.itinerary.map((day) => (
                  <li key={day.day}>
                    <p className="text-xs font-medium text-muted-foreground">
                      {t("day", { day: day.day })}
                    </p>
                    <h3 className="mt-1 font-semibold">{day.title}</h3>
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
                      {day.description}
                    </p>
                  </li>
                ))}
              </ol>
            </section>
          )}
        </TabsContent>
        <TabsContent value="journey" className="space-y-4">
          {steps.length ? (
            steps.map(stepView)
          ) : (
            <Alert>
              <AlertDescription>{t("journeyPending")}</AlertDescription>
            </Alert>
          )}
        </TabsContent>
        <TabsContent value="stays" className="space-y-4">
          {stays.length ? (
            stays.map(stepView)
          ) : (
            <Alert>
              <AlertDescription>{t("staysPending")}</AlertDescription>
            </Alert>
          )}
        </TabsContent>
        <TabsContent value="documents" className="space-y-3">
          {documents.length ? (
            documents.map((document) => (
              <Card key={document.id}>
                <CardContent className="py-4">
                  <Button
                    asChild
                    variant="link"
                    className="h-auto max-w-full justify-start whitespace-normal p-0"
                  >
                    <a href={document.url} target="_blank" rel="noreferrer">
                      <FileText className="size-4 shrink-0" />
                      {document.title}
                    </a>
                  </Button>
                </CardContent>
              </Card>
            ))
          ) : (
            <Alert>
              <AlertDescription>{t("documentsPending")}</AlertDescription>
            </Alert>
          )}
        </TabsContent>
        <TabsContent value="support">
          <Card>
            <CardHeader>
              <CardTitle>{t("supportTitle")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                {t("supportDescription", { reference: booking.reference })}
              </p>
              <div className="flex flex-wrap gap-3">
                {support.email && (
                  <Button variant="outline" asChild>
                    <a href={`mailto:${support.email}`}>{t("email")}</a>
                  </Button>
                )}
                {support.phone && (
                  <Button variant="outline" asChild>
                    <a href={`tel:${support.phone}`}>{t("call")}</a>
                  </Button>
                )}
              </div>
              {!support.email && !support.phone && (
                <p className="text-sm">{t("supportPending")}</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      <form action={leaveTrip.bind(null, slug)} className="mt-10">
        <Button variant="ghost" size="sm">
          {t("leave")}
        </Button>
      </form>
    </section>
  );
}
