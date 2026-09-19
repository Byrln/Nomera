"use server";
import { type ErrorCode, toPublicError } from "@nomera/domain/errors";
import { createGuestBooking } from "@nomera/postgres/server/operations";
import {
  quoteStorefront,
  type StorefrontQuote,
} from "@nomera/postgres/server/storefront-quote";
import { cookies } from "next/headers";
import {
  travelerCookieName,
  travelerCookieOptions,
} from "@/features/traveler/access";

export async function checkout(
  slug: string,
  input: unknown,
): Promise<{ ok: true } | { ok: false; code: ErrorCode }> {
  try {
    const booking = await createGuestBooking(slug, input);
    (await cookies()).set(
      travelerCookieName(slug),
      booking.accessToken,
      travelerCookieOptions(slug),
    );
    return { ok: true };
  } catch (error) {
    return { ok: false, code: toPublicError(error).code };
  }
}

export async function previewPrice(
  slug: string,
  input: unknown,
): Promise<{ ok: true; quote: StorefrontQuote } | { ok: false }> {
  try {
    return { ok: true, quote: await quoteStorefront(slug, input) };
  } catch {
    return { ok: false };
  }
}
