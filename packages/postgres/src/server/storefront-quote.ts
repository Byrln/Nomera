import "server-only";
import { DomainError, parseInput } from "@nomera/domain/errors";
import { calculatePromotionDiscount } from "@nomera/domain/finance";
import { bookingPrice } from "@nomera/domain/operations";
import { guestBookingSchema } from "@nomera/schemas/operations";
import { type DatabaseClient, getDatabase } from "../server";
import { databaseRead } from "./errors";
import { getPublishedStorefront } from "./storefront";

const quoteInput = guestBookingSchema.pick({
  departureId: true,
  travelers: true,
  promotionCode: true,
});
export type StorefrontQuote = {
  subtotalMinor: number;
  discountMinor: number;
  totalMinor: number;
  currency: string;
};

// A quote never reserves capacity, creates a customer, or consumes a promotion.
// Booking submission independently revalidates price, capacity and promotion use.
export async function quoteStorefront(
  slug: unknown,
  input: unknown,
  sql?: DatabaseClient,
): Promise<StorefrontQuote> {
  const request = parseInput(quoteInput, input);
  return databaseRead(async () => {
    const db = sql ?? getDatabase();
    const store = await getPublishedStorefront(slug, db);
    const departure = store?.tours
      .flatMap((tour) => tour.departures)
      .find((item) => item.id === request.departureId);
    if (!store || !departure) throw new DomainError("NOT_FOUND");
    if (request.travelers > departure.available)
      throw new DomainError("CONFLICT");
    const subtotalMinor = bookingPrice(departure.priceMinor, request.travelers);
    let discountMinor = 0;
    if (request.promotionCode) {
      const [promotion] = await db<
        {
          kind: "percent" | "fixed";
          value: string;
          currency: string;
          active: boolean;
          starts_at: Date;
          ends_at: Date | null;
          max_uses: number | null;
          uses: number;
        }[]
      >`SELECT kind,value::text,currency,active,starts_at,ends_at,max_uses,uses FROM promotions WHERE tenant_id=${store.tenantId} AND code=${request.promotionCode.toUpperCase()}`;
      if (!promotion) throw new DomainError("VALIDATION_ERROR");
      discountMinor = calculatePromotionDiscount(
        {
          kind: promotion.kind,
          value: Number(promotion.value),
          currency: promotion.currency,
          active: promotion.active,
          startsAt: promotion.starts_at.toISOString(),
          endsAt: promotion.ends_at?.toISOString() ?? null,
          maxUses: promotion.max_uses,
          uses: promotion.uses,
        },
        subtotalMinor,
        departure.currency,
      );
    }
    return {
      subtotalMinor,
      discountMinor,
      totalMinor: bookingPrice(
        departure.priceMinor,
        request.travelers,
        discountMinor,
      ),
      currency: departure.currency,
    };
  });
}
