import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { operationsMutationSchema } from "./operations";

const activity = {
  operationId: randomUUID(),
  type: "activity",
  customerId: randomUUID(),
  kind: "note",
  body: "A customer note.",
};
describe("customer activity URL validation", () => {
  it("accepts note and interaction submissions with an empty or omitted URL", () => {
    for (const kind of ["note", "interaction"]) {
      expect(
        operationsMutationSchema.safeParse({ ...activity, kind, url: "" })
          .success,
      ).toBe(true);
      expect(
        operationsMutationSchema.safeParse({ ...activity, kind }).success,
      ).toBe(true);
    }
  });
  it("accepts HTTPS references while rejecting malformed, credentialed and unsafe URLs without throwing", () => {
    expect(
      operationsMutationSchema.safeParse({
        ...activity,
        kind: "document",
        url: "https://example.test/document.pdf",
      }).success,
    ).toBe(true);
    for (const url of [
      "not a URL",
      "http://example.test/a",
      "javascript:alert(1)",
      "https://user:password@example.test/a",
    ]) {
      expect(
        operationsMutationSchema.safeParse({
          ...activity,
          kind: "document",
          url,
        }).success,
      ).toBe(false);
    }
  });
});
