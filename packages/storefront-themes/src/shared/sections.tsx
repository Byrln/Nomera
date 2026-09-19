import { Button } from "@nomera/ui/components/button";
import { Card, CardContent } from "@nomera/ui/components/card";
import { ArrowUpRight, Mail, Phone } from "lucide-react";
import { destinations, featuredTours } from "../data";
import type { HomeProps, HomeSection } from "../types";
import { CategoryLinks } from "./category-links";
import { TourCollection } from "./tour-card";
import { TravelImage } from "./travel-image";
export function HomeContent({
  section,
  ...props
}: HomeProps & { section: HomeSection }) {
  const { data, tours, base, labels, preview } = props;
  const title = section.title || labels.sections[section.kind];
  if (section.kind === "featured") {
    const selected = featuredTours(data, tours);
    if (!selected.length)
      return preview ? (
        <p className="sf-section sf-empty">{labels.ui.previewEmpty}</p>
      ) : null;
    return (
      <section className="sf-section sf-featured" id="featured">
        <div className="sf-section-heading">
          <div>
            <h2>{title}</h2>
            {section.body && <p className="sf-copy">{section.body}</p>}
          </div>
          <Button asChild variant="link">
            <a href={`${base}/tours`}>
              {labels.ui.allTours}
              <ArrowUpRight />
            </a>
          </Button>
        </div>
        <TourCollection {...props} tours={selected} />
        {(data.theme === "atlas" || data.theme === "minimal") && (
          <CategoryLinks {...props} />
        )}
      </section>
    );
  }
  if (section.kind === "destinations") {
    const items = destinations(tours);
    if (!items.length) return null;
    return (
      <section className="sf-section" id="destinations">
        <div className="sf-section-heading">
          <h2>{title}</h2>
          <span>
            {items.length} {labels.destinations}
          </span>
        </div>
        <div
          className="sf-destination-grid"
          data-count={Math.min(items.length, 4)}
        >
          {items.map(({ name, tour }) => (
            <Card key={name} className="sf-destination">
              <a href={`${base}/tours?destination=${encodeURIComponent(name)}`}>
                {tour?.data.media[0] && (
                  <TravelImage
                    src={tour.data.media[0].url}
                    alt={tour.data.media[0].alt}
                  />
                )}
                <CardContent>
                  <h3>{name}</h3>
                  <span>
                    {labels.ui.exploreDestination}
                    <ArrowUpRight />
                  </span>
                </CardContent>
              </a>
            </Card>
          ))}
        </div>
      </section>
    );
  }
  if (section.kind === "stats") {
    if (!tours.length) return null;
    return (
      <section className="sf-section sf-stats">
        <h2>{title}</h2>
        <p>
          <strong>{tours.length}</strong>
          {labels.availableTours}
        </p>
        {destinations(tours).length > 0 && (
          <p>
            <strong>{destinations(tours).length}</strong>
            {labels.destinations}
          </p>
        )}
      </section>
    );
  }
  if (section.kind === "contact") {
    if (!data.email && !data.phone && !section.body) return null;
    return (
      <section className="sf-section sf-contact" id="contact">
        {section.image && <TravelImage src={section.image} alt={title} />}
        <div>
          <h2>{title}</h2>
          {section.body && <p className="sf-copy">{section.body}</p>}
          <div className="sf-contact-actions">
            {data.email && (
              <Button asChild variant="outline">
                <a href={`mailto:${data.email}`}>
                  <Mail />
                  {data.email}
                </a>
              </Button>
            )}
            {data.phone && (
              <Button asChild variant="outline">
                <a href={`tel:${data.phone}`}>
                  <Phone />
                  {data.phone}
                </a>
              </Button>
            )}
          </div>
        </div>
      </section>
    );
  }
  if (!section.body) return null;
  return (
    <section
      id={section.kind}
      className={`sf-section sf-story sf-${section.kind} sf-layout-${section.layout}${section.image ? " sf-story-image" : ""}`}
    >
      <div>
        <h2>{title}</h2>
        <p className="sf-copy">{section.body}</p>
        {section.kind === "about" && (
          <Button asChild variant="outline">
            <a href={`${base}/tours`}>
              {labels.tours}
              <ArrowUpRight />
            </a>
          </Button>
        )}
      </div>
      {section.image && <TravelImage src={section.image} alt={title} />}
    </section>
  );
}
