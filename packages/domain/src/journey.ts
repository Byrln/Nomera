import "server-only";
import {
  type JourneyStep,
  journeyInputSchema,
  type TravelerJourneyStep,
} from "@nomera/schemas/journey";
import { parseInput } from "./errors";
import { assertCapability, type TenantContext } from "./tenancy";

export function authorizeJourneyMutation(
  context: TenantContext,
  input: unknown,
) {
  assertCapability(context, "journey:manage");
  return parseInput(journeyInputSchema, input);
}

// Explicit allow-list: staff notes and hidden steps never enter traveler props.
export function travelerJourney(steps: JourneyStep[]): TravelerJourneyStep[] {
  return steps
    .filter((step) => step.visible)
    .map((step) => ({
      id: step.id,
      type: step.type,
      title: step.title,
      scheduledAt: step.scheduledAt,
      required: step.required,
      status: step.status,
      travelerNotes: step.travelerNotes,
      details: step.details,
      attachments: step.attachments,
    }));
}
