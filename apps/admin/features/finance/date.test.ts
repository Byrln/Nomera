import { describe, expect, it } from "vitest";
import { operatorDate } from "./date";

describe("operator calendar dates", () => {
  it("keeps Ulaanbaatar midnight on the selected date", () => {
    expect(operatorDate("2026-09-11T16:00:00.000Z")).toBe("2026-09-12");
    expect(operatorDate("2026-09-11T15:59:59.000Z")).toBe("2026-09-11");
  });
  it("formats the date deterministically across year boundaries", () => {
    expect(operatorDate("2026-12-31T16:00:00.000Z")).toBe("2027-01-01");
    expect(operatorDate("2026-09-13T15:59:59.000Z")).toBe("2026-09-13");
  });
});
