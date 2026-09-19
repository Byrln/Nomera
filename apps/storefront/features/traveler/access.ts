import "server-only";
import { getTravelerBooking } from "@nomera/postgres/server/operations";
import { cookies } from "next/headers";

import { travelerCookieName } from "./cookie-policy";

export { travelerCookieName, travelerCookieOptions } from "./cookie-policy";
export async function readTraveler(slug: string) {
  const token = (await cookies()).get(travelerCookieName(slug))?.value;
  if (!token) return null;
  const booking = await getTravelerBooking(slug, token);
  return { booking, token };
}
