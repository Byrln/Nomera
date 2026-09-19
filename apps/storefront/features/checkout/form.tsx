"use client";
import { storefrontMoney } from "@nomera/storefront-themes/money";
import {
  PromotionDialog,
  StorefrontSelectContent as SelectContent,
  TravelImage,
} from "@nomera/storefront-themes/renderer";
import { Alert, AlertDescription } from "@nomera/ui/components/alert";
import { Button } from "@nomera/ui/components/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@nomera/ui/components/card";
import { Checkbox } from "@nomera/ui/components/checkbox";
import { Input } from "@nomera/ui/components/input";
import { Label } from "@nomera/ui/components/label";
import {
  Select,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@nomera/ui/components/select";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useRef, useState, useTransition } from "react";
import { travelDate } from "@/features/traveler/format-date";
import { checkout, previewPrice } from "./actions";

export type CheckoutOption = {
  image?: { url: string; alt: string };
  id: string;
  title: string;
  startsOn: string;
  endsOn: string;
  priceMinor: number;
  currency: string;
  available: number;
};
export function CheckoutForm({
  slug,
  options,
  initialDeparture,
  initialPromotion = "",
  initialTravelers = 1,
  policies = [],
}: {
  slug: string;
  options: CheckoutOption[];
  initialDeparture?: string;
  initialPromotion?: string;
  initialTravelers?: number;
  policies?: { title: string; body: string }[];
}) {
  const t = useTranslations("Checkout");
  const p = useTranslations("PublicStorefront");
  const [promotionCode, setPromotionCode] = useState(
    initialPromotion.slice(0, 64),
  );
  const [acknowledged, setAcknowledged] = useState(false);
  const errorRef = useRef<HTMLDivElement>(null);
  const locale = useLocale();
  const router = useRouter();
  const [departureId, setDeparture] = useState(
    options.find((option) => option.id === initialDeparture)?.id ??
      options[0]?.id ??
      "",
  );
  const [travelers, setTravelers] = useState(
    Number.isInteger(initialTravelers) &&
      initialTravelers >= 1 &&
      initialTravelers <= 100
      ? initialTravelers
      : 1,
  );
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [operationId, setOperationId] = useState("");
  const [quote, setQuote] = useState<{
    key: string;
    subtotalMinor: number;
    discountMinor: number;
    totalMinor: number;
    currency: string;
  } | null>(null);
  const [quoteError, setQuoteError] = useState("");
  const [quoteAttempt, setQuoteAttempt] = useState(0);
  const quoteKey = JSON.stringify([
    departureId,
    travelers,
    promotionCode,
    quoteAttempt,
  ]);
  useEffect(() => {
    let current = true;
    const timer = setTimeout(async () => {
      const result = await previewPrice(slug, {
        departureId,
        travelers,
        promotionCode,
      });
      if (!current) return;
      if (result.ok) {
        setQuote({ key: quoteKey, ...result.quote });
        setQuoteError("");
      } else {
        setQuote(null);
        setQuoteError(quoteKey);
      }
    }, 250);
    return () => {
      current = false;
      clearTimeout(timer);
    };
  }, [slug, departureId, travelers, promotionCode, quoteKey]);
  const activeQuote = quote?.key === quoteKey ? quote : null;
  const departure = options.find((option) => option.id === departureId);
  if (!departure)
    return (
      <Alert>
        <AlertDescription>{t("empty")}</AlertDescription>
      </Alert>
    );
  const date = (value: string) => travelDate(value, locale);
  return (
    <div className="grid min-w-0 gap-8 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <form
        className="space-y-6"
        onSubmit={(event) => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          const id = operationId || crypto.randomUUID();
          setOperationId(id);
          setError("");
          startTransition(async () => {
            const result = await checkout(slug, {
              operationId: id,
              departureId,
              travelers,
              customerName: form.get("customerName"),
              customerEmail: form.get("customerEmail"),
              customerPhone: form.get("customerPhone"),
              promotionCode,
            });
            if (!result.ok) {
              setError(t("failed"));
              requestAnimationFrame(() => errorRef.current?.focus());
              return;
            }
            router.push(`/o/${slug}/booking-success`);
            router.refresh();
          });
        }}
      >
        <Card>
          <CardHeader>
            <CardTitle>{t("trip")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Label htmlFor="departure">{t("departure")}</Label>
            <Select
              value={departureId}
              onValueChange={(value) => {
                setDeparture(value);
                setOperationId("");
              }}
              disabled={pending}
            >
              <SelectTrigger id="departure" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {options.map((option) => (
                  <SelectItem key={option.id} value={option.id}>
                    {option.title} · {date(option.startsOn)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="space-y-2">
              <Label htmlFor="travelers">{t("travelers")}</Label>
              <Input
                id="travelers"
                type="number"
                min={1}
                max={Math.min(departure.available, 100)}
                required
                value={travelers}
                disabled={pending}
                onChange={(event) => {
                  setTravelers(Number(event.target.value));
                  setOperationId("");
                }}
              />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{t("contact")}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="customerName">{t("name")}</Label>
              <Input
                id="customerName"
                name="customerName"
                autoComplete="name"
                maxLength={200}
                required
                disabled={pending}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="customerEmail">{t("email")}</Label>
              <Input
                id="customerEmail"
                name="customerEmail"
                type="email"
                autoComplete="email"
                maxLength={254}
                required
                disabled={pending}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="customerPhone">{t("phone")}</Label>
              <Input
                id="customerPhone"
                name="customerPhone"
                type="tel"
                autoComplete="tel"
                maxLength={50}
                disabled={pending}
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <PromotionDialog
                title={p("promotion")}
                description={p("promotionHelp")}
                apply={t("applyCode")}
                close={p("close")}
                value={promotionCode}
                onApply={(code) => {
                  setPromotionCode(code);
                  setOperationId("");
                }}
              />
              {promotionCode && activeQuote && (
                <p className="text-sm text-muted-foreground" role="status">
                  {t("codeApplied")}
                </p>
              )}
              {quoteError === quoteKey && (
                <p role="alert" className="text-sm text-destructive">
                  {t("quoteFailed")}
                </p>
              )}
              {quoteError === quoteKey && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setQuoteError("");
                    setQuoteAttempt((value) => value + 1);
                  }}
                >
                  {t("retryPrice")}
                </Button>
              )}
              {promotionCode && (
                <Button
                  type="button"
                  variant="link"
                  onClick={() => {
                    setPromotionCode("");
                    setOperationId("");
                  }}
                >
                  {t("removeCode")}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
        {error && (
          <Alert variant="destructive" ref={errorRef} tabIndex={-1}>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        {policies.length > 0 && (
          <section>
            <h2 className="text-xl">{t("reviewPolicies")}</h2>
            {policies.map((policy) => (
              <div key={policy.title} className="sf-checkout-policy">
                <h3>{policy.title}</h3>
                <p className="sf-copy">{policy.body}</p>
              </div>
            ))}
            <div className="mt-4 flex items-start gap-3">
              <Checkbox
                id="policy-acknowledgement"
                checked={acknowledged}
                onCheckedChange={(checked) => setAcknowledged(checked === true)}
                required
                disabled={pending}
              />
              <Label
                htmlFor="policy-acknowledgement"
                className="leading-relaxed"
              >
                {t("policyAcknowledge")}
              </Label>
            </div>
            <Button asChild variant="link">
              <a href={`/o/${slug}/policies`}>{t("policies")}</a>
            </Button>
          </section>
        )}
        <p className="text-sm leading-relaxed text-muted-foreground">
          {t("paymentNotice")}
        </p>
        <Button
          type="submit"
          className="h-12 w-full sm:w-auto"
          disabled={
            pending ||
            travelers < 1 ||
            travelers > departure.available ||
            !activeQuote ||
            (policies.length > 0 && !acknowledged)
          }
        >
          {pending ? t("submitting") : t("submit")}
          <ArrowRight className="size-4" />
        </Button>
      </form>
      <aside className="order-first min-w-0 lg:order-last">
        <Card className="lg:sticky lg:top-6">
          {departure.image && (
            <TravelImage src={departure.image.url} alt={departure.image.alt} />
          )}
          <CardHeader>
            <CardTitle>{departure.title}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="flex justify-between gap-4 text-sm">
              <span>{t("unitPrice")}</span>
              <strong>
                {storefrontMoney(
                  departure.priceMinor,
                  departure.currency,
                  locale,
                )}
              </strong>
            </div>
            <p className="text-sm text-muted-foreground">
              {date(departure.startsOn)} — {date(departure.endsOn)}
            </p>
            <div className="flex justify-between gap-4 text-sm">
              <span>{t("travelers")}</span>
              <span>{travelers}</span>
            </div>
            <div className="flex justify-between gap-4 border-t pt-4">
              <span>{t("estimate")}</span>
              <strong>
                {activeQuote
                  ? storefrontMoney(
                      activeQuote.totalMinor,
                      activeQuote.currency,
                      locale,
                    )
                  : quoteError === quoteKey
                    ? t("priceUnavailable")
                    : t("checkingPrice")}
              </strong>
            </div>
            {activeQuote && activeQuote.discountMinor > 0 && (
              <div className="flex justify-between gap-4 text-sm">
                <span>{t("discount")}</span>
                <strong>
                  −
                  {storefrontMoney(
                    activeQuote.discountMinor,
                    activeQuote.currency,
                    locale,
                  )}
                </strong>
              </div>
            )}
            <p className="text-xs leading-relaxed text-muted-foreground">
              {t("serverPrice")}
            </p>
            <p className="flex gap-2 text-sm">
              <ShieldCheck className="size-4 shrink-0" />
              {t("guestFirst")}
            </p>
          </CardContent>
        </Card>
      </aside>
    </div>
  );
}
