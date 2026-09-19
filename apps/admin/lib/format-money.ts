export function formatMoney(
  minor: number,
  currency: string,
  locale: string,
): string {
  const exact = BigInt(minor);
  const fraction = exact % 100n;
  const formatter = new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    currencyDisplay: "narrowSymbol",
    minimumFractionDigits: fraction ? 2 : 0,
    maximumFractionDigits: fraction ? 2 : 0,
  });
  return (
    formatter
      .formatToParts(exact / 100n)
      // Supported locales use compact narrow-symbol amounts. ICU versions differ
      // on Mongolian currency spacing; normalize it for identical SSR/hydration.
      .filter(
        (part) =>
          !(
            /^(mn|en)(-|$)/i.test(locale) &&
            part.type === "literal" &&
            /^\s+$/.test(part.value)
          ),
      )
      .map((part) =>
        part.type === "fraction"
          ? String(fraction).padStart(2, "0")
          : part.value,
      )
      .join("")
  );
}
