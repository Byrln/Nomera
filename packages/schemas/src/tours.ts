import { z } from "zod";
import { dashboardCurrencySchema, departureStatusSchema } from "./dashboard";
import { resourceIdSchema } from "./security";

const amount = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER);
const version = z.number().int().min(1).max(2147483647);
const text = z.string().trim();
export const tourStatusSchema = z.enum(["draft", "published", "archived"]);
export const tourInputSchema = z
  .strictObject({
    code: text
      .min(1)
      .max(64)
      .regex(/^[\p{L}\p{N}_-]+$/u),
    title: text.min(1).max(200),
    destination: text.max(120),
    category: text.max(80),
    durationDays: z.number().int().min(1).max(365),
    description: text.max(20000),
    basePriceMinor: amount,
    currency: dashboardCurrencySchema,
    itinerary: z
      .array(
        z.strictObject({
          day: z.number().int().min(1).max(365),
          title: text.min(1).max(200),
          description: text.max(10000),
        }),
      )
      .max(365),
    media: z
      .array(
        z.strictObject({
          url: z
            .url({ protocol: /^https$/ })
            .max(2048)
            .refine((value) => {
              const url = new URL(value);
              return !url.username && !url.password;
            }),
          alt: text.min(1).max(300),
        }),
      )
      .max(30),
  })
  .superRefine((value, context) => {
    if (
      new Set(value.itinerary.map((item) => item.day)).size !==
        value.itinerary.length ||
      value.itinerary.some((item) => item.day > value.durationDays)
    ) {
      context.addIssue({
        code: "custom",
        path: ["itinerary"],
        message: "Itinerary days must be unique and within the duration.",
      });
    }
  });
export type TourInput = z.infer<typeof tourInputSchema>;
const departureFields = {
  startsOn: z.iso.date().refine((value) => value >= "0001-01-01"),
  endsOn: z.iso.date().refine((value) => value >= "0001-01-01"),
  status: departureStatusSchema,
  capacity: z.number().int().min(0).max(2147483647),
  priceMinor: amount,
  currency: dashboardCurrencySchema,
};
export const departureInputSchema = z
  .strictObject({
    ...departureFields,
    id: resourceIdSchema.optional(),
    version: version.optional(),
  })
  .refine((value) => value.endsOn >= value.startsOn, {
    path: ["endsOn"],
    message: "End date must follow start date.",
  })
  .refine((value) => Boolean(value.id) === Boolean(value.version), {
    path: ["version"],
    message: "Existing departures require a version.",
  });
export type DepartureInput = z.infer<typeof departureInputSchema>;
const mutation = {
  operationId: resourceIdSchema,
  tourId: resourceIdSchema,
  version,
};
export const tourMutationSchema = z.discriminatedUnion("type", [
  z.strictObject({
    type: z.literal("create"),
    operationId: resourceIdSchema,
    data: tourInputSchema,
  }),
  z.strictObject({
    type: z.literal("update"),
    ...mutation,
    data: tourInputSchema,
  }),
  z.strictObject({ type: z.literal("publish"), ...mutation }),
  z.strictObject({ type: z.literal("archive"), ...mutation }),
  z.strictObject({
    type: z.literal("saveDeparture"),
    ...mutation,
    departure: departureInputSchema,
  }),
]);
export type TourMutation = z.infer<typeof tourMutationSchema>;
export const tourCatalogFilterSchema = z.strictObject({
  search: text.max(200).default(""),
  status: z.enum(["all", "draft", "published", "archived"]).default("all"),
  destination: text.max(120).default(""),
  category: text.max(80).default(""),
  page: z.number().int().min(1).max(100000).default(1),
  pageSize: z.number().int().min(1).max(50).default(20),
});
export type TourCatalogFilter = z.infer<typeof tourCatalogFilterSchema>;
export const tourDepartureSchema = z.object({
  ...departureFields,
  id: resourceIdSchema,
  version,
  reserved: amount,
});
export type TourDeparture = z.infer<typeof tourDepartureSchema>;
export const tourDetailSchema = z.object({
  id: resourceIdSchema,
  tenantId: resourceIdSchema,
  version,
  status: tourStatusSchema,
  data: tourInputSchema,
  updatedAt: z.iso.datetime(),
  published: z
    .object({ version, publishedAt: z.iso.datetime(), data: tourInputSchema })
    .nullable(),
  departures: z.array(tourDepartureSchema),
});
export type TourDetail = z.infer<typeof tourDetailSchema>;
export const tourCatalogSchema = z.object({
  tenantId: resourceIdSchema,
  filter: tourCatalogFilterSchema,
  total: amount,
  items: z
    .array(
      z.object({
        id: resourceIdSchema,
        title: text,
        code: text,
        destination: text,
        category: text,
        status: tourStatusSchema,
        durationDays: z.number().int(),
        basePriceMinor: amount,
        currency: dashboardCurrencySchema,
        version,
        departureCount: amount,
        confirmedTravelers: amount,
        confirmedBookings: amount.default(0),
        revenueMinor: amount.default(0),
        nextDeparture: z.iso.date().nullable().default(null),
        media: tourInputSchema.shape.media.default([]),
        updatedAt: z.iso.datetime(),
      }),
    )
    .max(50),
  summary: z
    .object({
      bookings: amount.default(0),
      topCategory: z.string().nullable().default(null),
      topCategoryBookings: amount.default(0),
      basic: amount.default(0),
      itinerary: amount.default(0),
      media: amount.default(0),
      pricing: amount.default(0),
    })
    .default({
      bookings: 0,
      topCategory: null,
      topCategoryBookings: 0,
      basic: 0,
      itinerary: 0,
      media: 0,
      pricing: 0,
    }),
  facets: z.object({
    destinations: z.array(z.string()),
    categories: z.array(z.string()),
  }),
  counts: z.object({
    total: amount,
    draft: amount,
    published: amount,
    archived: amount,
  }),
});
export type TourCatalog = z.infer<typeof tourCatalogSchema>;
