import { financeFilterSchema } from "@nomera/schemas/finance";
import { describe, expect, it } from "vitest";
import { csvText } from "./export";

describe("finance report date boundaries", () => {
  it("keeps legacy unbounded repository reads valid", () =>
    expect(financeFilterSchema.parse({})).toEqual({ currency: "MNT" }));
  it("requires a complete inclusive date range of at most 92 days", () => {
    expect(financeFilterSchema.safeParse({ from: "2026-09-01" }).success).toBe(
      false,
    );
    expect(
      financeFilterSchema.safeParse({ from: "2026-09-12", to: "2026-09-01" })
        .success,
    ).toBe(false);
    expect(
      financeFilterSchema.safeParse({ from: "2026-01-01", to: "2026-05-01" })
        .success,
    ).toBe(false);
    expect(
      financeFilterSchema.safeParse({
        from: "2026-09-01",
        to: "2026-09-12",
        currency: "USD",
      }).success,
    ).toBe(true);
  });
});
describe("CSV export", () => {
  it("preserves commas, quotes and newlines", () =>
    expect(csvText([["A, B", 'A"B', "A\nB"]])).toBe('"A, B","A""B","A\nB"'));
  it("neutralizes user-entered formulas while keeping numeric negatives", () =>
    expect(csvText([['=HYPERLINK("bad")', "+SUM(A1)", "@A1", -12]])).toBe(
      '"\'=HYPERLINK(""bad"")","\'+SUM(A1)","\'@A1","-12"',
    ));
});
