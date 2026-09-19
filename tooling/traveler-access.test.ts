import { describe, expect, it } from "vitest";

import {
  travelerCookieName,
  travelerCookieOptions,
} from "../apps/storefront/features/traveler/cookie-policy";
import {
  travelDate,
  travelEventDate,
} from "../apps/storefront/features/traveler/format-date";

describe("traveler browser access", () => {
  it("keeps Mongolian dates independent of browser ICU support and event timezone", () => {
    expect(travelDate("2026-10-10", "mn")).toBe("2026 оны 10-р сарын 10");
    expect(travelDate("2026-10-10", "en")).toBe("Oct 10, 2026");
    expect(travelEventDate("2026-10-10T10:00:00+08:00", "mn")).toBe(
      "2026 оны 10-р сарын 10 · 02:00 UTC",
    );
  });
  it("scopes opaque cookies per tenant and prevents script access", () => {
    expect(travelerCookieName("operator-a")).not.toBe(
      travelerCookieName("operator-b"),
    );
    expect(travelerCookieName("operator-a")).toMatch(
      /^nomera_trip_[a-f0-9]{20}$/,
    );
    expect(travelerCookieOptions("operator-a")).toMatchObject({
      httpOnly: true,
      sameSite: "lax",
      path: "/o/operator-a",
      maxAge: 7776000,
    });
  });
});
