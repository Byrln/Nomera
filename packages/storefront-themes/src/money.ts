export function storefrontMoney(
  minor: number,
  currency: string,
  _locale: string,
) {
  const amount = BigInt(minor);
  const fraction = amount % 100n;
  // EN/MN share decimal/grouping conventions. Explicit symbols avoid browser
  // ICU fallbacks from Mongolian to English during hydration.
  const symbol =
    currency === "MNT" ? "₮" : currency === "USD" ? "$" : `${currency} `;
  const whole = new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
  }).format(amount / 100n);
  return `${symbol}${whole}${fraction ? `.${String(fraction).padStart(2, "0")}` : ""}`;
}
