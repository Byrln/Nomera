import { describe, expect, it } from "vitest";
import {
  dashboardFilterSchema,
  defaultDashboardFilter,
  previousDashboardPeriod,
} from "./dashboard";

describe("dashboard reporting dates", () => {
  it("defaults to 30 inclusive calendar days in Ulaanbaatar", () => {
    expect(defaultDashboardFilter(new Date("2026-09-11T16:30:00Z"))).toEqual({
      from: "2026-08-14",
      to: "2026-09-12",
      currency: "MNT",
    });
  });
  it.each([
    ["2026-02-30", "2026-03-01"],
    ["2026-09-12", "2026-09-11"],
    ["2026-01-01", "2026-04-03"],
    ["2026-1-01", "2026-01-02"],
  ])("rejects invalid or unbounded dates %s to %s", (from, to) => {
    expect(
      dashboardFilterSchema.safeParse({ from, to, currency: "MNT" }).success,
    ).toBe(false);
  });
  it("accepts one day and 92 inclusive days", () => {
    expect(
      dashboardFilterSchema.safeParse({
        from: "2026-09-12",
        to: "2026-09-12",
        currency: "USD",
      }).success,
    ).toBe(true);
    expect(
      dashboardFilterSchema.safeParse({
        from: "2026-01-01",
        to: "2026-04-02",
        currency: "MNT",
      }).success,
    ).toBe(true);
  });
  it.each([
    ["0000-09-10", "0000-09-12"],
    ["0001-01-01", "0001-01-01"],
    ["0001-01-02", "0001-01-03"],
    ["9999-12-31", "9999-12-31"],
  ])(
    "rejects reporting periods that exceed supported AD boundaries: %s to %s",
    (from, to) => {
      expect(
        dashboardFilterSchema.safeParse({ from, to, currency: "MNT" }).success,
      ).toBe(false);
    },
  );
  it("accepts the earliest complete AD comparison and the latest supported reporting date", () => {
    const earliest = dashboardFilterSchema.parse({
      from: "0001-01-03",
      to: "0001-01-04",
      currency: "MNT",
    });
    expect(previousDashboardPeriod(earliest)).toEqual({
      from: "0001-01-01",
      to: "0001-01-02",
    });
    expect(
      dashboardFilterSchema.safeParse({
        from: "9998-12-31",
        to: "9998-12-31",
        currency: "MNT",
      }).success,
    ).toBe(true);
  });
  it("rejects unsupported currency and extra filter fields", () => {
    expect(
      dashboardFilterSchema.safeParse({
        from: "2026-09-12",
        to: "2026-09-12",
        currency: "EUR",
      }).success,
    ).toBe(false);
    expect(
      dashboardFilterSchema.safeParse({
        from: "2026-09-12",
        to: "2026-09-12",
        currency: "MNT",
        tenantId: "injected",
      }).success,
    ).toBe(false);
  });
});
