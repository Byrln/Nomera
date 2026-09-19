"use client";
import type { PublicTour } from "@nomera/schemas/storefront";
import { Button } from "@nomera/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@nomera/ui/components/dialog";
import type { StorefrontLabels } from "../types";
import { useThemeDialog } from "./theme-context";
import { TravelImage } from "./travel-image";
export function TourGallery({
  media,
  labels,
}: {
  media: PublicTour["data"]["media"];
  labels: StorefrontLabels;
}) {
  const theme = useThemeDialog();
  if (!media.length) return null;
  return (
    <>
      <div className="sf-gallery" data-count={Math.min(media.length, 3)}>
        {media.slice(0, 3).map((item, index) => (
          <TravelImage
            key={item.url}
            src={item.url}
            alt={item.alt}
            priority={index === 0}
          />
        ))}
      </div>
      {media.length > 3 && (
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="outline">
              {labels.ui.gallery} ({media.length})
            </Button>
          </DialogTrigger>
          <DialogContent
            style={theme.style}
            className={`${theme.className} max-h-[90dvh] overflow-y-auto sm:max-w-4xl`}
            closeLabel={labels.ui.close}
          >
            <DialogTitle>{labels.ui.gallery}</DialogTitle>
            <DialogDescription>
              {media.length} · {labels.ui.gallery}
            </DialogDescription>
            <div className="sf-gallery-dialog">
              {media.map((item) => (
                <TravelImage key={item.url} src={item.url} alt={item.alt} />
              ))}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
