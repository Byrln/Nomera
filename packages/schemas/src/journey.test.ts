import { describe, expect, it } from "vitest";
import { journeyInputSchema, journeyStepSchema } from "./journey";

const id = "33333333-3333-4333-8333-333333333333";
const step = {
  id,
  type: "CUSTOM",
  title: "Meeting",
  scheduledAt: "",
  visible: false,
  required: true,
  status: "planned",
  travelerNotes: "",
  internalNotes: "",
  details: {
    location: "",
    contact: "",
    flightNumber: "",
    vehicle: "",
    accommodation: "",
  },
  attachments: [],
};
describe("journey validation", () => {
  it("rejects duplicate step ids and browser tenant overrides", () => {
    expect(
      journeyInputSchema.safeParse({
        departureId: id,
        version: 0,
        steps: [step, step],
      }).success,
    ).toBe(false);
    expect(
      journeyInputSchema.safeParse({
        departureId: id,
        tenantId: id,
        version: 0,
        steps: [step],
      }).success,
    ).toBe(false);
  });
  it("rejects unsafe document URLs and URL credentials", () => {
    for (const url of [
      "javascript:alert(1)",
      "http://example.com/doc",
      "https://user:secret@example.com/doc",
    ]) {
      expect(
        journeyStepSchema.safeParse({
          ...step,
          attachments: [{ id, title: "Document", url }],
        }).success,
      ).toBe(false);
    }
    expect(
      journeyStepSchema.safeParse({
        ...step,
        attachments: [
          { id, title: "Document", url: "https://example.com/doc" },
        ],
      }).success,
    ).toBe(true);
  });
  it("requires valid scheduled times and constrained statuses", () => {
    expect(
      journeyStepSchema.safeParse({ ...step, scheduledAt: "tomorrow" }).success,
    ).toBe(false);
    expect(
      journeyStepSchema.safeParse({ ...step, status: "paid" }).success,
    ).toBe(false);
    expect(
      journeyStepSchema.safeParse({
        ...step,
        scheduledAt: "2026-10-01T09:00:00+08:00",
      }).success,
    ).toBe(true);
  });
});
