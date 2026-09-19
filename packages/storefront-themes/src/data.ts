import type { PublicTour, StorefrontInput } from "@nomera/schemas/storefront";
export function featuredTours(data: StorefrontInput, tours: PublicTour[]) {
  return data.featuredTourIds.length
    ? data.featuredTourIds.flatMap((id) =>
        tours.filter((tour) => tour.id === id),
      )
    : tours.slice(0, 6);
}
export function heroImage(data: StorefrontInput, tours: PublicTour[]) {
  const configured = data.sections.find(
    (section) => section.kind === "hero",
  )?.image;
  if (configured) return { url: configured, alt: data.storeName };
  return (
    featuredTours(data, tours).find((tour) => tour.data.media.length)?.data
      .media[0] ??
    tours.find((tour) => tour.data.media.length)?.data.media[0] ??
    null
  );
}
export function nextDeparture(tour: PublicTour) {
  return [...tour.departures]
    .filter((departure) => departure.available > 0)
    .sort((a, b) => a.startsOn.localeCompare(b.startsOn))[0];
}
export function destinations(tours: PublicTour[]) {
  return Array.from(
    new Set(tours.map((tour) => tour.data.destination).filter(Boolean)),
  ).map((name) => ({
    name,
    tour:
      tours.find(
        (tour) => tour.data.destination === name && tour.data.media.length,
      ) ?? tours.find((tour) => tour.data.destination === name),
  }));
}
