import { Button } from "@nomera/ui/components/button";
import { ArrowUpRight } from "lucide-react";
import { featuredTours, heroImage } from "../data";
import { themeDefinition } from "../registry";
import type { HomeProps, HomeSection } from "../types";
import { SearchBar } from "./search-bar";
import { TravelImage } from "./travel-image";
export function Hero({
  section,
  ...props
}: HomeProps & { section: HomeSection }) {
  const { data, tours, base, labels } = props;
  const media = heroImage(data, tours);
  const selected = featuredTours(data, tours);
  const recipe = themeDefinition(data.theme).hero;
  const title = section.title || labels.sections.hero;
  return (
    <section
      className={`sf-hero sf-hero-${recipe}${media ? " sf-hero-photographic" : " sf-hero-no-image"}`}
    >
      {media && (
        <TravelImage
          src={media.url}
          alt={media.alt}
          priority
          className="sf-hero-image"
          sizes="100vw"
        />
      )}
      <div className="sf-hero-copy">
        <p className="sf-hero-brand">{data.storeName}</p>
        <h1 data-long={title.length > 85}>{title}</h1>
        {(section.body || data.tagline) && (
          <p className="sf-hero-description">{section.body || data.tagline}</p>
        )}
        <Button asChild size="lg">
          <a href={`${base}/tours`}>
            {data.cta || labels.tours}
            <ArrowUpRight />
          </a>
        </Button>
      </div>
      {recipe === "immersive" && media && selected[0] && (
        <a
          className="sf-horizon-caption"
          href={`${base}/tours/${selected[0].id}`}
        >
          {selected[0].data.title}
          <ArrowUpRight />
        </a>
      )}
      {recipe === "immersive" &&
        selected.filter((tour) => tour.data.media.length).length > 1 && (
          <nav
            className="sf-hero-thumbnails"
            aria-label={labels.sections.featured}
          >
            {selected
              .filter((tour) => tour.data.media.length)
              .slice(0, 3)
              .map((tour) => (
                <a
                  key={tour.id}
                  href={`${base}/tours/${tour.id}`}
                  aria-label={tour.data.title}
                >
                  <TravelImage
                    src={tour.data.media[0]?.url ?? ""}
                    alt={tour.data.title}
                    sizes="80px"
                  />
                </a>
              ))}
          </nav>
        )}
      <SearchBar base={base} labels={labels} />
    </section>
  );
}
