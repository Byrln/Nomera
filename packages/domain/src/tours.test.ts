import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { resolveTenantContext } from "./tenancy";
import {
  assertDepartureChange,
  assertPublishable,
  authorizeTourMutation,
} from "./tours";

const id = "33333333-3333-4333-8333-333333333333";
const data = {
  code: "GOBI",
  title: "Gobi",
  destination: "Gobi",
  category: "Adventure",
  durationDays: 1,
  description: "Desert journey",
  basePriceMinor: 100,
  currency: "MNT" as const,
  itinerary: [{ day: 1, title: "Arrival", description: "Arrive" }],
  media: [],
};
async function context(role: string) {
  return resolveTenantContext(
    {
      getCurrentUser: async () => ({ id, status: true, emailVerified: true }),
      findMemberships: async () => [
        { id, tenantId: id, userId: id, active: true, roles: [role] },
      ],
      getTeam: async () => ({ id, name: "A" }),
    },
    id,
  );
}
describe("tour rules", () => {
  it("allows operations edits but rejects their publication and viewer edits", async () => {
    const operations = await context("operations");
    expect(
      authorizeTourMutation(operations, {
        type: "create",
        operationId: id,
        data,
      }).type,
    ).toBe("create");
    expect(() =>
      authorizeTourMutation(operations, {
        type: "publish",
        operationId: id,
        tourId: id,
        version: 1,
      }),
    ).toThrowError(expect.objectContaining({ code: "FORBIDDEN" }));
    const viewer = await context("viewer");
    expect(() =>
      authorizeTourMutation(viewer, { type: "create", operationId: id, data }),
    ).toThrowError(expect.objectContaining({ code: "FORBIDDEN" }));
  });
  it("requires complete sequential itinerary and descriptive metadata for publication", () => {
    expect(() => assertPublishable(data)).not.toThrow();
    expect(() => assertPublishable({ ...data, itinerary: [] })).toThrowError(
      expect.objectContaining({ code: "VALIDATION_ERROR" }),
    );
    expect(() => assertPublishable({ ...data, destination: "" })).toThrow();
  });
  it("protects booked capacity and terminal departure states", () => {
    const existing = {
      id,
      version: 1,
      startsOn: "2026-09-12",
      endsOn: "2026-09-13",
      status: "confirmed" as const,
      capacity: 10,
      reserved: 5,
      priceMinor: 100,
      currency: "MNT" as const,
    };
    expect(() =>
      assertDepartureChange(existing, { ...existing, capacity: 4 }),
    ).toThrowError(expect.objectContaining({ code: "CONFLICT" }));
    expect(() =>
      assertDepartureChange(existing, { ...existing, status: "cancelled" }),
    ).toThrow();
    expect(() =>
      assertDepartureChange(
        { ...existing, status: "completed" },
        { ...existing, status: "scheduled" },
      ),
    ).toThrow();
    expect(() =>
      assertDepartureChange(existing, { ...existing, status: "in_progress" }),
    ).not.toThrow();
  });
});
