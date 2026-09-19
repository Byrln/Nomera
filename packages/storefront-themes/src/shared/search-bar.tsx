import { Button } from "@nomera/ui/components/button";
import { Input } from "@nomera/ui/components/input";
import { Label } from "@nomera/ui/components/label";
import { ArrowUpRight, MapPin, Search } from "lucide-react";
import type { HomeProps } from "../types";
export function SearchBar({
  base,
  labels,
}: Pick<HomeProps, "base" | "labels">) {
  return (
    <form action={`${base}/tours`} className="sf-search-bar">
      <div className="sf-search-field">
        <Search aria-hidden="true" />
        <div>
          <Label htmlFor="sf-search">{labels.ui.search}</Label>
          <Input
            id="sf-search"
            name="search"
            placeholder={labels.ui.allTours}
            maxLength={200}
          />
        </div>
      </div>
      <div className="sf-search-field">
        <MapPin aria-hidden="true" />
        <div>
          <Label htmlFor="sf-destination">{labels.ui.destination}</Label>
          <Input
            id="sf-destination"
            name="destination"
            placeholder={labels.ui.anyDestination}
            maxLength={120}
          />
        </div>
      </div>
      <Button type="submit" size="lg">
        {labels.ui.search}
        <ArrowUpRight aria-hidden="true" />
      </Button>
    </form>
  );
}
