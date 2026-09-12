import { Badge, Button, Separator } from "@nomera/ui";
import { ArrowDown, Compass } from "lucide-react";
import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { Preferences } from "@/components/preferences";

export default async function StorefrontFoundation() {
  const t = await getTranslations("Page");
  return (
    <div className="min-h-svh">
      <header className="mx-auto flex max-w-storefront items-center justify-between gap-4 px-6 py-6 md:px-12">
        <div className="flex items-center gap-2">
          <Compass className="size-5 text-primary" aria-hidden="true" />
          <span className="font-serif text-xl tracking-widest">NOMERA</span>
        </div>
        <Preferences />
      </header>
      <main id="main" className="mx-auto max-w-storefront px-6 pb-10 md:px-12">
        <section className="grid items-center gap-10 py-10 md:grid-cols-2 md:gap-14 md:py-20">
          <div className="flex flex-col items-start gap-7">
            <Badge variant="outline">{t("eyebrow")}</Badge>
            <h1 className="text-balance font-serif text-5xl leading-tight tracking-tight lg:text-6xl">
              {t("title")}
            </h1>
            <p className="max-w-md text-base leading-8 text-muted-foreground">
              {t("description")}
            </p>
            <Button size="lg" asChild>
              <a href="#foundation">
                {t("cta")}
                <ArrowDown data-icon="inline-end" aria-hidden="true" />
              </a>
            </Button>
          </div>
          <figure className="flex min-w-0 flex-col gap-4">
            <div className="relative aspect-[4/5] overflow-hidden rounded-t-full bg-muted">
              <Image
                src="/foundation.svg"
                alt={t("imageAlt")}
                fill
                priority
                sizes="(max-width: 767px) 100vw, 50vw"
                className="object-cover"
              />
            </div>
            <figcaption className="flex justify-between gap-4 text-xs text-muted-foreground">
              <span>{t("imageCaption")}</span>
              <span aria-hidden="true">01 / 01</span>
            </figcaption>
          </figure>
        </section>
        <section id="foundation" className="scroll-mt-8 pb-16">
          <Separator />
          <div className="grid gap-8 py-10 md:grid-cols-3">
            {["type", "space", "shared"].map((key, index) => (
              <div key={key} className="flex flex-col gap-3">
                <span className="text-xs text-muted-foreground">
                  0{index + 1}
                </span>
                <h2 className="font-serif text-2xl">{t(`${key}Title`)}</h2>
                <p className="max-w-sm text-sm leading-7 text-muted-foreground">
                  {t(`${key}Description`)}
                </p>
              </div>
            ))}
          </div>
        </section>
        <footer className="flex flex-col gap-5">
          <Separator />
          <div className="flex flex-wrap justify-between gap-3 text-xs text-muted-foreground">
            <span>NOMERA Storefront</span>
            <span>{t("footer")}</span>
          </div>
        </footer>
      </main>
    </div>
  );
}
