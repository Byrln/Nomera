import {
  financeMutationSchema,
  marketingMutationSchema,
  promotionInputSchema,
} from "@nomera/schemas/finance";
import { describe, expect, it } from "vitest";
import { majorToMinor } from "../tours/request";

describe("exact financial form amounts", () => {
  it("keeps adjacent cents distinct at the safe integer boundary", () => {
    expect(majorToMinor("90071992547409.90")).toBe(9007199254740990);
    expect(majorToMinor("90071992547409.91")).toBe(Number.MAX_SAFE_INTEGER);
    expect(majorToMinor("90071992547409.92")).toBeNaN();
  });
  it("accepts the same exact minor units in payments, fixed promotions and campaign budgets", () => {
    const amountMinor = majorToMinor("90071992547409.90");
    expect(
      financeMutationSchema.parse({
        action: "payment",
        bookingId: "11111111-1111-4111-8111-111111111111",
        amountMinor,
        method: "cash",
        reference: "Receipt",
        requestId: "22222222-2222-4222-8222-222222222222",
      }),
    ).toMatchObject({ amountMinor: 9007199254740990 });
    expect(
      promotionInputSchema.parse({
        code: "FIXED",
        kind: "fixed",
        value: amountMinor,
        currency: "MNT",
        startsAt: "2026-01-01T00:00:00Z",
        endsAt: null,
        maxUses: null,
      }),
    ).toMatchObject({ value: 9007199254740990 });
    expect(
      marketingMutationSchema.parse({
        action: "campaign",
        name: "Campaign",
        source: "website",
        budgetMinor: amountMinor,
        currency: "MNT",
        startsOn: "2026-01-01",
        endsOn: "2026-02-01",
      }),
    ).toMatchObject({ budgetMinor: 9007199254740990 });
  });
  it("rejects fractional minor units and exponent notation instead of rounding", () => {
    for (const value of ["1.005", "1e3", "-0.01", "", "90071992547409.92"])
      expect(majorToMinor(value)).toBeNaN();
    expect(majorToMinor("0.29")).toBe(29);
    expect(majorToMinor("1.2")).toBe(120);
  });
});
