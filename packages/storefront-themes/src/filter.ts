import type { PublicTour } from "@nomera/schemas/storefront";
import type { TourQuery } from "./shared/tour-filters";
export function filterTours(tours: PublicTour[], query: TourQuery) {
  const value = (key: keyof TourQuery) =>
    typeof query[key] === "string" && query[key] !== "all"
      ? (query[key]?.slice(0, 200) ?? "")
      : "";
  const result = tours.filter(
    ({ data, departures }) =>
      (!value("search") ||
        `${data.title} ${data.destination} ${data.category}`
          .toLocaleLowerCase()
          .includes(value("search").toLocaleLowerCase())) &&
      (!value("destination") || data.destination === value("destination")) &&
      (!value("category") || data.category === value("category")) &&
      (!value("duration") || data.durationDays === Number(value("duration"))) &&
      (!value("date") ||
        departures.some((d) => d.available > 0 && d.startsOn >= value("date"))),
  );
  if (value("sort") === "price")
    result.sort(
      (a, b) =>
        a.data.currency.localeCompare(b.data.currency) ||
        a.data.basePriceMinor - b.data.basePriceMinor,
    );
  if (value("sort") === "duration")
    result.sort((a, b) => a.data.durationDays - b.data.durationDays);
  return result;
}
