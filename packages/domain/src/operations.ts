import { DomainError } from "./errors";
export function bookingPrice(
  unitMinor: number,
  travelers: number,
  discountMinor = 0,
) {
  if (
    !Number.isSafeInteger(unitMinor) ||
    unitMinor < 0 ||
    !Number.isInteger(travelers) ||
    travelers < 1 ||
    travelers > 100 ||
    !Number.isSafeInteger(discountMinor) ||
    discountMinor < 0
  )
    throw new DomainError("VALIDATION_ERROR");
  const gross = BigInt(unitMinor) * BigInt(travelers);
  if (gross > BigInt(Number.MAX_SAFE_INTEGER) || BigInt(discountMinor) > gross)
    throw new DomainError("VALIDATION_ERROR");
  return Number(gross - BigInt(discountMinor));
}
export function assertBookingTransition(from: string, to: string) {
  const allowed: Record<string, readonly string[]> = {
    pending: ["confirmed", "cancelled"],
    confirmed: ["completed", "cancelled"],
    completed: [],
    cancelled: [],
  };
  if (!allowed[from]?.includes(to)) throw new DomainError("CONFLICT");
}
export function assertCapacity(
  capacity: number,
  reserved: number,
  travelers: number,
) {
  if (reserved + travelers > capacity) throw new DomainError("CONFLICT");
}
