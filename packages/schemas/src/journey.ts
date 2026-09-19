import { z } from "zod";
import { resourceIdSchema } from "./security";

export const journeyStepTypes = [
  "BOOKING_CONFIRMED",
  "FLIGHT_ARRIVAL",
  "AIRPORT_PICKUP",
  "TRANSFER",
  "HOTEL_CHECKIN",
  "HOTEL_CHECKOUT",
  "TOUR_DAY",
  "ACTIVITY",
  "MEETING_POINT",
  "MEAL",
  "FREE_TIME",
  "OPTIONAL_EXCURSION",
  "RETURN_TRANSFER",
  "FLIGHT_DEPARTURE",
  "CUSTOM",
] as const;
export const journeyStepSchema = z.strictObject({
  id: resourceIdSchema,
  type: z.enum(journeyStepTypes),
  title: z.string().trim().min(1).max(200),
  scheduledAt: z.union([z.iso.datetime({ offset: true }), z.literal("")]),
  visible: z.boolean(),
  required: z.boolean(),
  status: z.enum(["planned", "ready", "completed", "cancelled"]),
  travelerNotes: z.string().trim().max(10000),
  internalNotes: z.string().trim().max(10000),
  details: z.strictObject({
    location: z.string().trim().max(300),
    contact: z.string().trim().max(300),
    flightNumber: z.string().trim().max(50),
    vehicle: z.string().trim().max(200),
    accommodation: z.string().trim().max(300),
  }),
  attachments: z
    .array(
      z.strictObject({
        id: resourceIdSchema,
        title: z.string().trim().min(1).max(200),
        url: z
          .url({ protocol: /^https$/ })
          .max(2048)
          .refine((value) => {
            const url = new URL(value);
            return !url.username && !url.password;
          }),
      }),
    )
    .max(20),
});
export const journeyInputSchema = z
  .strictObject({
    departureId: resourceIdSchema,
    version: z.number().int().nonnegative().max(2147483646),
    steps: z.array(journeyStepSchema).max(200),
  })
  .refine(
    (value) =>
      new Set(value.steps.map((step) => step.id)).size === value.steps.length,
    { message: "Step identifiers must be unique." },
  );
export type JourneyStep = z.infer<typeof journeyStepSchema>;
export type JourneyInput = z.infer<typeof journeyInputSchema>;
export type TravelerJourneyStep = Omit<
  JourneyStep,
  "internalNotes" | "visible"
>;
export type JourneyData = JourneyInput & { departureTitle: string };
