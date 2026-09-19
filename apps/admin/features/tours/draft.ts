import type { TourInput } from "@nomera/schemas/tours";

export type StoredTourDraft = {
  data: TourInput;
  price: string;
  version: number | null;
};

export function clearTourDrafts(
  storage?: Pick<Storage, "length" | "key" | "removeItem">,
): void {
  try {
    const target =
      storage ??
      (typeof sessionStorage === "undefined" ? undefined : sessionStorage);
    if (!target) return;
    for (let index = target.length - 1; index >= 0; index--) {
      const key = target.key(index);
      if (key?.startsWith("nomera:tour-draft:")) target.removeItem(key);
    }
  } catch {
    /* Auth flows must still complete when browser storage is unavailable. */
  }
}

// Validate untrusted recovery storage while allowing unfinished form values.
// Restored values still pass the authoritative mutation schema before saving.
export function readStoredTourDraft(raw: string): StoredTourDraft | null {
  function record(value: unknown): Record<string, unknown> {
    if (!value || typeof value !== "object" || Array.isArray(value))
      throw new Error("Invalid draft");
    return value as Record<string, unknown>;
  }
  function text(value: unknown, maximum: number): string {
    if (typeof value !== "string" || value.length > maximum)
      throw new Error("Invalid draft text");
    return value;
  }
  function integer(value: unknown, minimum: number, maximum: number): number {
    if (
      typeof value !== "number" ||
      !Number.isInteger(value) ||
      value < minimum ||
      value > maximum
    )
      throw new Error("Invalid draft number");
    return value;
  }
  try {
    const saved = record(JSON.parse(raw));
    const input = record(saved.data);
    if (input.currency !== "MNT" && input.currency !== "USD") return null;
    if (
      !Array.isArray(input.itinerary) ||
      input.itinerary.length > 365 ||
      !Array.isArray(input.media) ||
      input.media.length > 30
    )
      return null;
    return {
      version:
        saved.version === null ? null : integer(saved.version, 1, 2147483647),
      price: text(saved.price, 100),
      data: {
        title: text(input.title, 200),
        code: text(input.code, 64),
        destination: text(input.destination, 120),
        category: text(input.category, 80),
        description: text(input.description, 20000),
        durationDays:
          input.durationDays === null
            ? Number.NaN
            : integer(input.durationDays, -1_000_000, 1_000_000),
        currency: input.currency,
        basePriceMinor: integer(
          input.basePriceMinor,
          0,
          Number.MAX_SAFE_INTEGER,
        ),
        itinerary: input.itinerary.map((entry: unknown) => {
          const item = record(entry);
          return {
            day: integer(item.day, 1, 365),
            title: text(item.title, 200),
            description: text(item.description, 10000),
          };
        }),
        media: input.media.map((entry: unknown) => {
          const item = record(entry);
          const url = text(item.url, 2048);
          const parsed = new URL(url);
          if (
            parsed.protocol !== "https:" ||
            parsed.username ||
            parsed.password
          )
            throw new Error("Invalid draft image");
          return { url, alt: text(item.alt, 300) };
        }),
      },
    };
  } catch {
    return null;
  }
}
