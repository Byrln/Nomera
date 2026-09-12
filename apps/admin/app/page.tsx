import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  Separator,
} from "@nomera/ui";
import { ArrowDown, Check, Layers, ShieldCheck } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Preferences } from "@/components/preferences";

export default async function AdminFoundation() {
  const t = await getTranslations("Page");
  return (
    <div className="min-h-svh">
      <header className="border-b bg-card">
        <div className="mx-auto flex max-w-admin items-center justify-between gap-4 px-5 py-4 md:px-8">
          <div className="flex items-center gap-3">
            <span className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Layers aria-hidden="true" className="size-5" />
            </span>
            <span className="text-lg font-semibold tracking-widest">
              NOMERA
            </span>
          </div>
          <Preferences />
        </div>
      </header>
      <main
        id="main"
        className="mx-auto flex max-w-admin flex-col gap-10 px-5 py-12 md:px-8 md:py-20"
      >
        <section className="flex flex-col items-start gap-5">
          <Badge variant="secondary">{t("eyebrow")}</Badge>
          <h1 className="max-w-3xl text-4xl font-semibold tracking-tight md:text-5xl">
            {t("title")}
          </h1>
          <p className="max-w-xl text-base leading-7 text-muted-foreground">
            {t("description")}
          </p>
          <Button asChild>
            <a href="#foundation">
              {t("cta")}
              <ArrowDown data-icon="inline-end" aria-hidden="true" />
            </a>
          </Button>
        </section>
        <div
          id="foundation"
          className="grid scroll-mt-6 gap-5 md:grid-cols-[1.4fr_1fr]"
        >
          <Card>
            <CardHeader>
              <CardTitle>
                <h2>{t("systemTitle")}</h2>
              </CardTitle>
              <CardDescription>{t("systemDescription")}</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="flex flex-col gap-5">
                {["primitives", "languages", "responsive"].map((key) => (
                  <li key={key} className="flex items-start gap-3">
                    <Check
                      className="mt-0.5 size-4 shrink-0 text-success"
                      aria-hidden="true"
                    />
                    <span>{t(key)}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
            <CardFooter>
              <Badge variant="outline">{t("preview")}</Badge>
            </CardFooter>
          </Card>
          <Card>
            <CardHeader>
              <ShieldCheck
                className="mb-3 size-6 text-primary"
                aria-hidden="true"
              />
              <CardTitle>
                <h2>{t("scopeTitle")}</h2>
              </CardTitle>
              <CardDescription>{t("scopeDescription")}</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-6 text-muted-foreground">
                {t("scopeNote")}
              </p>
            </CardContent>
            <CardFooter>
              <span className="text-xs text-muted-foreground">
                {t("stage")}
              </span>
            </CardFooter>
          </Card>
        </div>
        <footer className="flex flex-col gap-5">
          <Separator />
          <div className="flex flex-wrap justify-between gap-3 text-xs text-muted-foreground">
            <span>NOMERA</span>
            <span>{t("footer")}</span>
          </div>
        </footer>
      </main>
    </div>
  );
}
