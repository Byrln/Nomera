import { DomainError } from "./errors";

export function assertLedgerAmount(
  kind: "payment" | "refund",
  amountMinor: number,
  totalMinor: number,
  paidMinor: number,
  status: string,
) {
  if (
    ![amountMinor, totalMinor, paidMinor].every(Number.isSafeInteger) ||
    amountMinor <= 0 ||
    totalMinor < 0 ||
    paidMinor < 0
  )
    throw new DomainError("VALIDATION_ERROR");
  if (
    kind === "payment" &&
    (status === "cancelled" || amountMinor > totalMinor - paidMinor)
  )
    throw new DomainError("CONFLICT");
  if (kind === "refund" && amountMinor > paidMinor)
    throw new DomainError("CONFLICT");
}

export function calculatePromotionDiscount(
  promotion: {
    kind: "percent" | "fixed";
    value: number;
    currency: string;
    active: boolean;
    startsAt: string;
    endsAt: string | null;
    maxUses: number | null;
    uses: number;
  },
  subtotalMinor: number,
  currency: string,
  now = new Date(),
): number {
  if (
    !Number.isSafeInteger(subtotalMinor) ||
    subtotalMinor < 0 ||
    !Number.isSafeInteger(promotion.value) ||
    promotion.value <= 0 ||
    !Number.isFinite(now.getTime()) ||
    !Number.isFinite(Date.parse(promotion.startsAt)) ||
    (promotion.endsAt !== null &&
      !Number.isFinite(Date.parse(promotion.endsAt))) ||
    !Number.isSafeInteger(promotion.uses) ||
    promotion.uses < 0 ||
    (promotion.maxUses !== null &&
      (!Number.isSafeInteger(promotion.maxUses) || promotion.maxUses <= 0)) ||
    (promotion.kind === "percent" && promotion.value > 100)
  )
    throw new DomainError("VALIDATION_ERROR");
  if (
    !promotion.active ||
    now < new Date(promotion.startsAt) ||
    (promotion.endsAt !== null && now >= new Date(promotion.endsAt)) ||
    promotion.currency !== currency ||
    (promotion.maxUses !== null && promotion.uses >= promotion.maxUses)
  )
    throw new DomainError("CONFLICT");
  return promotion.kind === "fixed"
    ? Math.min(subtotalMinor, promotion.value)
    : Number((BigInt(subtotalMinor) * BigInt(promotion.value)) / 100n);
}
