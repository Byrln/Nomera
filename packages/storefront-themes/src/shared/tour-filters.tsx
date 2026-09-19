"use client";
import type { PublicTour } from "@nomera/schemas/storefront";
import { Button } from "@nomera/ui/components/button";
import { Input } from "@nomera/ui/components/input";
import { Label } from "@nomera/ui/components/label";
import {
  Select,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@nomera/ui/components/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@nomera/ui/components/sheet";
import { SlidersHorizontal } from "lucide-react";
import { useId } from "react";
import type { StorefrontLabels } from "../types";
import { useThemeDialog } from "./theme-context";
import { StorefrontSelectContent as SelectContent } from "./themed-select";
export type TourQuery = {
  search?: string;
  destination?: string;
  category?: string;
  duration?: string;
  date?: string;
  sort?: string;
  page?: string;
};
function FilterForm({
  tours,
  query,
  base,
  labels,
}: {
  tours: PublicTour[];
  query: TourQuery;
  base: string;
  labels: StorefrontLabels;
}) {
  const id = useId();
  const select = (
    name: "destination" | "category" | "duration" | "sort",
    title: string,
    all: string,
    values: { value: string; label: string }[],
  ) => (
    <div>
      <Label htmlFor={`${id}-${name}`}>{title}</Label>
      <Select name={name} defaultValue={query[name] || "all"}>
        <SelectTrigger id={`${id}-${name}`}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{all}</SelectItem>
          {values.map((item) => (
            <SelectItem key={item.value} value={item.value}>
              {item.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
  const destinations = Array.from(
    new Set(tours.map((tour) => tour.data.destination).filter(Boolean)),
  );
  const categories = Array.from(
    new Set(tours.map((tour) => tour.data.category).filter(Boolean)),
  );
  const durations = Array.from(
    new Set(tours.map((tour) => tour.data.durationDays)),
  ).sort((a, b) => a - b);
  return (
    <form action={`${base}/tours`} className="sf-filter-form">
      <div>
        <Label htmlFor={`${id}-search`}>{labels.ui.search}</Label>
        <Input
          id={`${id}-search`}
          name="search"
          defaultValue={query.search}
          maxLength={200}
        />
      </div>
      {select(
        "destination",
        labels.ui.destination,
        labels.ui.anyDestination,
        destinations.map((value) => ({ value, label: value })),
      )}
      {categories.length > 0 &&
        select(
          "category",
          labels.ui.category,
          labels.ui.anyCategory,
          categories.map((value) => ({ value, label: value })),
        )}
      {durations.length > 1 &&
        select(
          "duration",
          labels.ui.duration,
          labels.ui.anyDuration,
          durations.map((value) => ({
            value: String(value),
            label: `${value} ${value === 1 ? labels.ui.durationDay : labels.days}`,
          })),
        )}
      {tours.some((tour) => tour.departures.length) && (
        <div>
          <Label htmlFor={`${id}-date`}>{labels.ui.departureDate}</Label>
          <Input
            id={`${id}-date`}
            name="date"
            type="date"
            defaultValue={query.date}
          />
        </div>
      )}
      {select("sort", labels.ui.sort, labels.ui.recommended, [
        { value: "price", label: labels.ui.priceLow },
        { value: "duration", label: labels.ui.durationShort },
      ])}
      <div className="sf-filter-actions">
        <Button type="submit">{labels.ui.applyFilters}</Button>
        <Button asChild variant="outline">
          <a href={`${base}/tours`}>{labels.ui.clear}</a>
        </Button>
      </div>
    </form>
  );
}
export function TourFilters(props: Parameters<typeof FilterForm>[0]) {
  const theme = useThemeDialog();
  return (
    <>
      <div className="sf-listing-desktop-filters">
        <FilterForm {...props} />
      </div>
      <div className="sf-listing-mobile-filters">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline">
              <SlidersHorizontal />
              {props.labels.ui.filters}
            </Button>
          </SheetTrigger>
          <SheetContent
            className={`${theme.className} sf-mobile-sheet`}
            style={theme.style}
            closeLabel={props.labels.ui.close}
          >
            <SheetHeader>
              <SheetTitle>{props.labels.ui.filters}</SheetTitle>
              <SheetDescription>{props.labels.tours}</SheetDescription>
            </SheetHeader>
            <FilterForm {...props} />
          </SheetContent>
        </Sheet>
      </div>
    </>
  );
}
