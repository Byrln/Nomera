import { describe, expect, it } from "vitest";
import {
  departureInputSchema,
  tourInputSchema,
  tourMutationSchema,
} from "./tours";

const data = {
  code: "GOBI",
  title: "Gobi",
  destination: "",
  category: "",
  durationDays: 1,
  description: "",
  basePriceMinor: 0,
  currency: "MNT",
  itinerary: [],
  media: [],
};
describe("tour input boundaries", () => {
  it("accepts incomplete metadata as a draft but rejects unsafe media references", () => {
    expect(tourInputSchema.safeParse(data).success).toBe(true);
    for (const url of [
      "http://example.com/a.jpg",
      "javascript:alert(1)",
      "https://user:password@example.com/a.jpg",
    ]) {
      expect(
        tourInputSchema.safeParse({ ...data, media: [{ url, alt: "Image" }] })
          .success,
      ).toBe(false);
    }
  });
  it("rejects duplicate itinerary days and unsafe monetary amounts", () => {
    expect(
      tourInputSchema.safeParse({
        ...data,
        itinerary: [
          { day: 1, title: "A", description: "" },
          { day: 1, title: "B", description: "" },
        ],
      }).success,
    ).toBe(false);
    expect(
      tourInputSchema.safeParse({ ...data, basePriceMinor: 1.5 }).success,
    ).toBe(false);
  });
  it("requires departure version for updates and valid date order", () => {
    const departure = {
      startsOn: "2026-09-12",
      endsOn: "2026-09-13",
      status: "scheduled",
      capacity: 10,
      priceMinor: 0,
      currency: "MNT",
    };
    expect(departureInputSchema.safeParse(departure).success).toBe(true);
    expect(
      departureInputSchema.safeParse({ ...departure, endsOn: "2026-09-11" })
        .success,
    ).toBe(false);
    expect(
      departureInputSchema.safeParse({
        ...departure,
        id: "33333333-3333-4333-8333-333333333333",
      }).success,
    ).toBe(false);
  });
  it("rejects tenant and role injection in a mutation", () => {
    expect(
      tourMutationSchema.safeParse({
        type: "create",
        operationId: "33333333-3333-4333-8333-333333333333",
        data,
        tenantId: "forged",
      }).success,
    ).toBe(false);
  });
});
