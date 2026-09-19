import type { PublicTour } from "@nomera/schemas/storefront";
import { Button } from "@nomera/ui/components/button";
import { Card, CardContent } from "@nomera/ui/components/card";
import { ArrowUpRight, CalendarDays, Clock3, MapPin } from "lucide-react";
import { nextDeparture } from "../data";
import { storefrontDate } from "../date";
import { storefrontMoney } from "../money";
import type { HomeProps } from "../types";
import { TravelImage } from "./travel-image";
export function TourCard({
  tour,
  base,
  labels,
  locale,
  feature,
}: Pick<HomeProps, "base" | "labels" | "locale"> & {
  tour: PublicTour;
  feature?: boolean;
}) {
  const departure = nextDeparture(tour);
  const url = `${base}/tours/${tour.id}`;
  return (
    <Card className={`sf-tour${feature ? " sf-tour-feature" : ""}`}>
      {tour.data.media[0] && (
        <a href={url} className="sf-tour-image" aria-label={tour.data.title}>
          <TravelImage
            src={tour.data.media[0].url}
            alt={tour.data.media[0].alt}
          />
        </a>
      )}
      <CardContent className="sf-tour-content">
        <div className="sf-tour-meta">
          {tour.data.destination && (
            <span>
              <MapPin />
              {tour.data.destination}
            </span>
          )}
          <span>
            <Clock3 />
            {tour.data.durationDays}{" "}
            {tour.data.durationDays === 1 ? labels.ui.durationDay : labels.days}
          </span>
        </div>
        <h3>
          <a href={url}>{tour.data.title}</a>
        </h3>
        {feature && tour.data.description && (
          <p className="sf-tour-summary">{tour.data.description}</p>
        )}
        {departure && (
          <p className="sf-tour-date">
            <CalendarDays />
            <span>
              {labels.ui.nextDeparture} ·{" "}
              {storefrontDate(departure.startsOn, locale)}
            </span>
          </p>
        )}
        <div className="sf-tour-bottom">
          <span>
            <small>{labels.from}</small>
            <strong>
              {storefrontMoney(
                tour.data.basePriceMinor,
                tour.data.currency,
                locale,
              )}
            </strong>
          </span>
          <Button asChild variant={feature ? "default" : "outline"}>
            <a href={url}>
              {labels.viewTour}
              <ArrowUpRight />
            </a>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
export function TourCollection({
  tours,
  base,
  labels,
  locale,
}: Pick<HomeProps, "tours" | "base" | "labels" | "locale">) {
  if (!tours.length) return <p className="sf-empty">{labels.empty}</p>;
  return (
    <div className="sf-tour-grid" data-count={Math.min(tours.length, 4)}>
      {tours.map((tour) => (
        <TourCard
          key={tour.id}
          tour={tour}
          base={base}
          labels={labels}
          locale={locale}
          feature={tours.length === 1}
        />
      ))}
    </div>
  );
}
