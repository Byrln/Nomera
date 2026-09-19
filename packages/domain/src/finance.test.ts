import { describe, expect, it } from "vitest";
import { assertLedgerAmount, calculatePromotionDiscount } from "./finance";

const promotion = {
  kind: "percent" as const,
  value: 10,
  currency: "MNT",
  active: true,
  startsAt: "2026-01-01T00:00:00Z",
  endsAt: "2027-01-01T00:00:00Z",
  maxUses: 2,
  uses: 0,
};
describe("financial domain rules", () => {
  it("allows exact remaining collection and exact full refund", () => {
    expect(() =>
      assertLedgerAmount("payment", 50, 100, 50, "confirmed"),
    ).not.toThrow();
    expect(() =>
      assertLedgerAmount("refund", 50, 100, 50, "cancelled"),
    ).not.toThrow();
  });
  it("rejects overpayment, over-refunds and collection on cancellation", () => {
    expect(() =>
      assertLedgerAmount("payment", 51, 100, 50, "confirmed"),
    ).toThrow();
    expect(() =>
      assertLedgerAmount("refund", 51, 100, 50, "confirmed"),
    ).toThrow();
    expect(() =>
      assertLedgerAmount("payment", 1, 100, 0, "cancelled"),
    ).toThrow();
  });
  it("rejects unsafe or fractional ledger money", () => {
    expect(() =>
      assertLedgerAmount("payment", 0.5, 100, 0, "pending"),
    ).toThrow();
    expect(() =>
      assertLedgerAmount(
        "payment",
        Number.MAX_SAFE_INTEGER + 1,
        100,
        0,
        "pending",
      ),
    ).toThrow();
  });
  it("calculates percentage using exact integer arithmetic", () => {
    expect(
      calculatePromotionDiscount(promotion, 999, "MNT", new Date("2026-05-01")),
    ).toBe(99);
    expect(
      calculatePromotionDiscount(
        { ...promotion, value: 100 },
        Number.MAX_SAFE_INTEGER,
        "MNT",
        new Date("2026-05-01"),
      ),
    ).toBe(Number.MAX_SAFE_INTEGER);
  });
  it("caps fixed promotions and rejects incompatible eligibility", () => {
    const now = new Date("2026-05-01");
    expect(
      calculatePromotionDiscount(
        { ...promotion, kind: "fixed", value: 500 },
        100,
        "MNT",
        now,
      ),
    ).toBe(100);
    for (const p of [
      { ...promotion, active: false },
      { ...promotion, uses: 2 },
      { ...promotion, currency: "USD" },
      { ...promotion, startsAt: "2026-06-01T00:00:00Z" },
      { ...promotion, endsAt: "2026-05-01T00:00:00Z" },
    ])
      expect(() => calculatePromotionDiscount(p, 100, "MNT", now)).toThrow();
  });
});
