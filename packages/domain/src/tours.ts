import "server-only";
import {
  type DepartureInput,
  type TourDeparture,
  type TourInput,
  tourMutationSchema,
} from "@nomera/schemas/tours";
import { DomainError, parseInput } from "./errors";
import { assertCapability, type TenantContext } from "./tenancy";

export function authorizeTourMutation(context: TenantContext, input: unknown) {
  assertCapability(context, "tours:manage");
  const command = parseInput(tourMutationSchema, input);
  if (command.type === "publish" || command.type === "archive")
    assertCapability(context, "tours:publish");
  return command;
}

export function assertPublishable(data: TourInput) {
  const days = new Set(data.itinerary.map((item) => item.day));
  if (
    !data.destination ||
    !data.category ||
    !data.description ||
    data.itinerary.length !== data.durationDays ||
    Array.from({ length: data.durationDays }, (_, index) => index + 1).some(
      (day) => !days.has(day),
    ) ||
    data.itinerary.some((item) => !item.description)
  )
    throw new DomainError("VALIDATION_ERROR");
}

const transitions: Record<
  TourDeparture["status"],
  readonly TourDeparture["status"][]
> = {
  scheduled: ["scheduled", "confirmed", "cancelled"],
  confirmed: ["confirmed", "in_progress", "cancelled"],
  in_progress: ["in_progress", "completed"],
  completed: [],
  cancelled: [],
};
export function assertDepartureChange(
  existing: TourDeparture | undefined,
  next: DepartureInput,
) {
  if (!existing) {
    if (next.status !== "scheduled") throw new DomainError("VALIDATION_ERROR");
    return;
  }
  if (
    next.version !== existing.version ||
    next.capacity < existing.reserved ||
    !transitions[existing.status].includes(next.status)
  )
    throw new DomainError("CONFLICT");
  if (
    existing.reserved > 0 &&
    (next.status === "cancelled" ||
      next.startsOn !== existing.startsOn ||
      next.endsOn !== existing.endsOn ||
      next.currency !== existing.currency)
  )
    throw new DomainError("CONFLICT");
}
