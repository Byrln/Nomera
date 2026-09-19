// Chrome installations without Mongolian ICU data fall back to English. Keep
// the supported MN date representation identical during server/client rendering.
export function travelDate(value: string, locale: string) {
  const [year, month, day] = value.slice(0, 10).split("-").map(Number);
  if (locale.startsWith("mn")) return `${year} оны ${month}-р сарын ${day}`;
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeZone: "UTC",
  }).format(new Date(`${value.slice(0, 10)}T00:00:00Z`));
}
export function travelEventDate(value: string, locale: string) {
  const utc = new Date(value).toISOString();
  return `${travelDate(utc, locale)} · ${utc.slice(11, 16)} UTC`;
}
