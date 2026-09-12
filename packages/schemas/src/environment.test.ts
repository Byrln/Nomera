import { describe, expect, it } from "vitest";
import { databaseEnvironmentSchema, publicEnvironmentSchema } from "./index";

describe("Railway PostgreSQL environment boundary", () => {
  it("keeps public configuration empty", () => {
    expect(publicEnvironmentSchema.parse({ DATABASE_URL: "secret" })).toEqual(
      {},
    );
  });

  it.each(["postgres://db", "postgresql://db"])(
    "accepts a PostgreSQL connection string %s",
    (DATABASE_URL) => {
      expect(
        databaseEnvironmentSchema.safeParse({ DATABASE_URL }).success,
      ).toBe(true);
    },
  );

  it.each([undefined, "", "https://db.example", "mysql://db"])(
    "rejects an invalid DATABASE_URL %s",
    (DATABASE_URL) => {
      expect(
        databaseEnvironmentSchema.safeParse({ DATABASE_URL }).success,
      ).toBe(false);
    },
  );
});
