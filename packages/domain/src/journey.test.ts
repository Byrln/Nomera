import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import type { JourneyStep } from "@nomera/schemas/journey";
import { authorizeJourneyMutation, travelerJourney } from "./journey";
import { resolveTenantContext } from "./tenancy";

const id = "33333333-3333-4333-8333-333333333333";
const step: JourneyStep = {
  id,
  type: "AIRPORT_PICKUP",
  title: "Airport meeting",
  scheduledAt: "",
  visible: true,
  required: true,
  status: "ready",
  travelerNotes: "Meet at arrivals",
  internalNotes: "Staff-only vendor price",
  details: {
    location: "Arrival hall",
    contact: "Guide",
    flightNumber: "",
    vehicle: "Van",
    accommodation: "",
  },
  attachments: [
    { id, title: "Meeting guide", url: "https://example.com/meeting.pdf" },
  ],
};
async function context(role: string) {
  return resolveTenantContext(
    {
      getCurrentUser: async () => ({ id, status: true, emailVerified: true }),
      findMemberships: async () => [
        { id, tenantId: id, userId: id, active: true, roles: [role] },
      ],
      getTeam: async () => ({ id, name: "Operator" }),
    },
    id,
  );
}
describe("traveler journey boundaries", () => {
  it("excludes hidden steps and internal notes from every visible step", () => {
    const output = travelerJourney([
      step,
      {
        ...step,
        id: "44444444-4444-4444-8444-444444444444",
        visible: false,
        title: "Private planning",
      },
    ]);
    expect(output).toHaveLength(1);
    expect(output[0]).toMatchObject({
      title: step.title,
      travelerNotes: step.travelerNotes,
      details: step.details,
      attachments: step.attachments,
    });
    expect(JSON.stringify(output)).not.toContain("Staff-only");
    expect(JSON.stringify(output)).not.toContain("internalNotes");
    expect(JSON.stringify(output)).not.toContain("Private planning");
    expect(output[0]).not.toHaveProperty("visible");
  });
  it("requires a verified operations-capable context", async () => {
    const input = { departureId: id, version: 0, steps: [step] };
    expect(
      authorizeJourneyMutation(await context("operations"), input),
    ).toEqual(input);
    for (const role of ["sales", "viewer", "finance"]) {
      const tenant = await context(role);
      expect(() => authorizeJourneyMutation(tenant, input)).toThrowError(
        expect.objectContaining({ code: "FORBIDDEN" }),
      );
    }
  });
});
