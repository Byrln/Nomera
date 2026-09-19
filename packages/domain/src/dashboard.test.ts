import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { readDashboard } from "./dashboard";
import { resolveTenantContext } from "./tenancy";

const tenant = "33333333-3333-4333-8333-333333333333";
const filter = { from: "2026-09-12", to: "2026-09-12", currency: "MNT" };
function emptyResponse() {
  return {
    tenantId: tenant,
    generatedAt: "2026-09-12T00:00:00Z",
    timezone: "Asia/Ulaanbaatar",
    filter,
    previousPeriod: { from: "2026-09-11", to: "2026-09-11" },
    metrics: {
      bookings: { value: 0, previous: 0 },
      revenueMinor: { value: 0, previous: 0 },
      activeDepartures: { value: 0, previous: 0 },
      conversion: { value: null, previous: null },
    },
    trend: [{ date: "2026-09-12", bookings: 0, revenueMinor: 0 }],
    channels: [],
    departures: [],
    attention: { pendingBookings: 0 },
    recentBookings: [],
  };
}
async function context(role = "owner") {
  return resolveTenantContext(
    {
      getCurrentUser: async () => ({
        id: tenant,
        status: true,
        emailVerified: true,
      }),
      findMemberships: async () => [
        {
          id: tenant,
          tenantId: tenant,
          userId: tenant,
          active: true,
          roles: [role],
        },
      ],
      getTeam: async () => ({ id: tenant, name: "Operator" }),
    },
    tenant,
  );
}
describe("dashboard application boundary", () => {
  it("rejects non-administrative roles before reading business data", async () => {
    await expect(
      readDashboard(await context("sales"), filter, {
        read: async () => {
          throw new Error("Business data must not be read");
        },
      }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
  it("rejects invalid filters before reading business data", async () => {
    await expect(
      readDashboard(
        await context(),
        { ...filter, currency: "EUR" },
        {
          read: async () => {
            throw new Error("Business data must not be read");
          },
        },
      ),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
  });
  it("rejects malformed repository responses", async () => {
    await expect(
      readDashboard(await context(), filter, { read: async () => ({}) }),
    ).rejects.toMatchObject({ code: "UNAVAILABLE" });
  });
  it("returns validated data for administrators", async () => {
    const response = await readDashboard(await context("admin"), filter, {
      read: async () => emptyResponse(),
    });
    expect(response.tenantId).toBe(tenant);
    expect(response.metrics.conversion.value).toBeNull();
  });
  it("rejects a repository response belonging to a different tenant", async () => {
    await expect(
      readDashboard(await context(), filter, {
        read: async () => ({
          ...emptyResponse(),
          tenantId: "44444444-4444-4444-8444-444444444444",
        }),
      }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
  it("rejects a repository response for a different reporting filter", async () => {
    await expect(
      readDashboard(await context(), filter, {
        read: async () => ({
          ...emptyResponse(),
          filter: { ...filter, currency: "USD" },
        }),
      }),
    ).rejects.toMatchObject({ code: "UNAVAILABLE" });
  });
  it.each([-1, 0.5, Number.MAX_SAFE_INTEGER + 1])(
    "rejects unsafe monetary totals %s",
    async (value) => {
      const response = emptyResponse();
      response.metrics.revenueMinor.value = value;
      await expect(
        readDashboard(await context(), filter, { read: async () => response }),
      ).rejects.toMatchObject({ code: "UNAVAILABLE" });
    },
  );
});
