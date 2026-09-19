import { describe, expect, it } from "vitest";
import {
  assertBookingTransition,
  assertCapacity,
  bookingPrice,
} from "./operations";

describe("booking rules", () => {
  it("calculates integer server prices without trusting browser totals", () => {
    expect(bookingPrice(12345, 3, 35)).toBe(37000);
    expect(() => bookingPrice(Number.MAX_SAFE_INTEGER, 2)).toThrow();
    expect(() => bookingPrice(10, 2, 21)).toThrow();
  });
  it("protects capacity and terminal states", () => {
    expect(() => assertCapacity(10, 8, 3)).toThrow();
    expect(() => assertCapacity(10, 8, 2)).not.toThrow();
    expect(() => assertBookingTransition("pending", "completed")).toThrow();
    expect(() => assertBookingTransition("cancelled", "confirmed")).toThrow();
    expect(() =>
      assertBookingTransition("confirmed", "completed"),
    ).not.toThrow();
  });
});
