import { expect, it } from "vitest";
import { storefrontMoney } from "./money";

it("preserves cents and the largest safe minor amount in storefront prices", () => {
  expect(storefrontMoney(12345, "USD", "en")).toBe("$123.45");
  expect(storefrontMoney(12300, "USD", "en")).toBe("$123");
  expect(storefrontMoney(9007199254740991, "USD", "en")).toBe(
    "$90,071,992,547,409.91",
  );
  expect(storefrontMoney(12345, "MNT", "mn")).toBe("₮123.45");
  expect(storefrontMoney(12345, "MNT", "en")).toBe("₮123.45");
});
