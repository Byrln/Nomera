import { z } from "zod";
import { resourceIdSchema } from "./security";

export const dashboardTimezone = "Asia/Ulaanbaatar";
const dayMs = 86_400_000;
const firstSupportedDay = Date.parse("0001-01-01");
const dateSchema = z.iso.date();
const integer = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER);
export const dashboardCurrencySchema = z.enum(["MNT", "USD"]);
export const bookingStatusSchema = z.enum([
  "pending",
  "confirmed",
  "completed",
  "cancelled",
]);
export const departureStatusSchema = z.enum([
  "scheduled",
  "confirmed",
  "in_progress",
  "completed",
  "cancelled",
]);
export const bookingChannelSchema = z.enum([
  "direct",
  "website",
  "agent",
  "other",
]);

export const dashboardFilterSchema = z
  .strictObject({
    from: dateSchema,
    to: dateSchema,
    currency: dashboardCurrencySchema,
  })
  .refine(
    ({ from, to }) => {
      const days = (Date.parse(to) - Date.parse(from)) / dayMs + 1;
      return days >= 1 && days <= 92;
    },
    { message: "Use an inclusive date range of 1 to 92 days.", path: ["to"] },
  )
  .refine(
    ({ from, to }) => {
      const starts = Date.parse(from);
      const days = (Date.parse(to) - starts) / dayMs + 1;
      // PostgreSQL has no year zero. Keep the previous interval in AD as well,
      // and reserve year 9999 for the exclusive next-day SQL boundary.
      return starts - days * dayMs >= firstSupportedDay && to <= "9998-12-31";
    },
    {
      message:
        "Current and preceding reporting periods must fit within AD 1 to 9998.",
      path: ["from"],
    },
  );
export type DashboardFilter = z.infer<typeof dashboardFilterSchema>;

export function dashboardDate(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: dashboardTimezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}
export function shiftDashboardDate(date: string, days: number): string {
  return new Date(Date.parse(date) + days * dayMs).toISOString().slice(0, 10);
}
export function defaultDashboardFilter(now = new Date()): DashboardFilter {
  const to = dashboardDate(now);
  return { from: shiftDashboardDate(to, -29), to, currency: "MNT" };
}
export function previousDashboardPeriod(filter: DashboardFilter) {
  const days = (Date.parse(filter.to) - Date.parse(filter.from)) / dayMs + 1;
  return {
    from: shiftDashboardDate(filter.from, -days),
    to: shiftDashboardDate(filter.from, -1),
  };
}

const metric = z.object({ value: integer, previous: integer });
const percentage = z.number().min(0).max(100).nullable();
export const dashboardResponseSchema = z.object({
  tenantId: resourceIdSchema,
  generatedAt: z.iso.datetime(),
  timezone: z.literal(dashboardTimezone),
  filter: dashboardFilterSchema,
  previousPeriod: z.object({ from: dateSchema, to: dateSchema }),
  metrics: z.object({
    bookings: metric,
    revenueMinor: metric,
    activeDepartures: metric,
    conversion: z.object({ value: percentage, previous: percentage }),
  }),
  trend: z
    .array(
      z.object({ date: dateSchema, bookings: integer, revenueMinor: integer }),
    )
    .max(92),
  channels: z
    .array(z.object({ channel: bookingChannelSchema, bookings: integer }))
    .max(4),
  departures: z
    .array(
      z.object({
        id: resourceIdSchema,
        title: z.string().min(1).max(200),
        startsOn: dateSchema,
        endsOn: dateSchema,
        status: departureStatusSchema,
        capacity: integer,
        reserved: integer,
      }),
    )
    .max(5),
  attention: z.object({ pendingBookings: integer }),
  departureSummary: z
    .object({
      onTrack: integer,
      lowCapacity: integer,
      atRisk: integer,
      completed: integer,
    })
    .default({ onTrack: 0, lowCapacity: 0, atRisk: 0, completed: 0 }),
  recentBookings: z
    .array(
      z.object({
        id: resourceIdSchema,
        reference: z.string().min(1).max(64),
        customerName: z.string().min(1).max(200),
        tourTitle: z.string().min(1).max(200),
        bookedAt: z.iso.datetime(),
        startsOn: dateSchema.optional(),
        status: bookingStatusSchema,
        channel: bookingChannelSchema,
        totalMinor: integer,
        currency: dashboardCurrencySchema,
        travelers: integer,
      }),
    )
    .max(10),
});
export type DashboardResponse = z.infer<typeof dashboardResponseSchema>;
