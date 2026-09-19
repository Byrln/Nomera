export function storefrontDate(value: string, locale: string) {
  const [year, month, day] = value.slice(0, 10).split("-").map(Number);
  if (locale.startsWith("mn")) return `${year} оны ${month}-р сарын ${day}`;
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeZone: "UTC",
  }).format(new Date(`${value.slice(0, 10)}T00:00:00Z`));
}
