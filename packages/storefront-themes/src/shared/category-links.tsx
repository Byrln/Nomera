import { Button } from "@nomera/ui/components/button";
import { Compass } from "lucide-react";
import type { HomeProps } from "../types";
export function CategoryLinks({
  tours,
  base,
  labels,
}: Pick<HomeProps, "tours" | "base" | "labels">) {
  const categories = Array.from(
    new Set(tours.map((tour) => tour.data.category).filter(Boolean)),
  );
  if (!categories.length) return null;
  return (
    <nav className="sf-category-links" aria-label={labels.ui.category}>
      {categories.map((category) => (
        <Button asChild variant="outline" key={category}>
          <a href={`${base}/tours?category=${encodeURIComponent(category)}`}>
            <Compass />
            {category}
          </a>
        </Button>
      ))}
    </nav>
  );
}
