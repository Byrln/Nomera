import { z } from "zod";
import { resourceIdSchema } from "./security";

const id = resourceIdSchema;
const text = (max: number) => z.string().trim().max(max);
export const customerInputSchema = z
  .object({
    name: text(200).min(1),
    email: z.union([z.email().max(254), z.literal("")]),
    phone: text(80),
    country: text(120),
  })
  .strict();
export const saleStages = [
  "new",
  "follow_up",
  "proposal_sent",
  "negotiation",
  "won",
  "lost",
] as const;
export const bookingStatuses = [
  "pending",
  "confirmed",
  "completed",
  "cancelled",
] as const;
export const guestBookingSchema = z
  .object({
    operationId: id,
    departureId: id,
    customerName: text(200).min(1),
    customerEmail: z.email().max(254),
    customerPhone: text(80).default(""),
    travelers: z.number().int().min(1).max(100),
    promotionCode: text(64).default(""),
  })
  .strict();
const base = { operationId: id };
export const operationsMutationSchema = z.discriminatedUnion("type", [
  z
    .object({
      ...base,
      type: z.literal("customer"),
      id: id.optional(),
      version: z.number().int().positive().optional(),
      data: customerInputSchema,
    })
    .strict(),
  z
    .object({
      ...base,
      type: z.literal("archiveCustomer"),
      id,
      version: z.number().int().positive(),
    })
    .strict(),
  z
    .object({
      ...base,
      type: z.literal("activity"),
      customerId: id,
      kind: z.enum(["note", "interaction", "document"]),
      body: text(10000).min(1),
      url: z
        .union([
          z.url().refine((v) => {
            try {
              const u = new URL(v);
              return u.protocol === "https:" && !u.username && !u.password;
            } catch {
              return false;
            }
          }),
          z.literal(""),
        ])
        .default(""),
    })
    .strict(),
  z
    .object({
      ...base,
      type: z.literal("inquiry"),
      customerId: id,
      title: text(200).min(1),
      notes: text(10000).default(""),
    })
    .strict(),
  z
    .object({
      ...base,
      type: z.literal("stage"),
      id,
      version: z.number().int().positive(),
      stage: z.enum(saleStages),
      followUpAt: z.union([z.iso.date(), z.literal("")]),
      notes: text(10000),
    })
    .strict(),
  z
    .object({
      ...base,
      type: z.literal("quote"),
      inquiryId: id,
      departureId: id,
      travelers: z.number().int().min(1).max(100),
    })
    .strict(),
  z
    .object({
      ...base,
      type: z.literal("booking"),
      customerId: id,
      departureId: id,
      travelers: z.number().int().min(1).max(100),
      promotionCode: text(64).default(""),
      inquiryId: id.optional(),
      channel: z
        .enum(["direct", "website", "agent", "other"])
        .default("direct"),
    })
    .strict(),
  z
    .object({
      ...base,
      type: z.literal("bookingStatus"),
      id,
      version: z.number().int().positive(),
      status: z.enum(bookingStatuses),
    })
    .strict(),
]);
export type OperationsMutation = z.infer<typeof operationsMutationSchema>;
export type GuestBookingInput = z.infer<typeof guestBookingSchema>;
export type Customer = z.infer<typeof customerInputSchema> & {
  id: string;
  version: number;
  archived: boolean;
  createdAt: string;
};
export type Booking = {
  id: string;
  reference: string;
  customerId: string | null;
  customerName: string;
  departureId: string;
  tourTitle: string;
  startsOn: string;
  endsOn: string;
  status: (typeof bookingStatuses)[number];
  channel: string;
  travelers: number;
  totalMinor: number;
  currency: string;
  version: number;
  bookedAt: string;
};
export type Inquiry = {
  id: string;
  customerId: string | null;
  customerName: string;
  title: string;
  stage: (typeof saleStages)[number];
  followUpAt: string;
  notes: string;
  version: number;
  bookingId: string | null;
  quoteValue?: number;
  quoteCurrency?: string;
  updatedAt?: string;
};
export type OperationsData = {
  customers: Customer[];
  bookings: Booking[];
  inquiries: Inquiry[];
  departures: {
    id: string;
    title: string;
    startsOn: string;
    available: number;
    priceMinor: number;
    currency: string;
  }[];
};
export type CustomerDetail = {
  customer: Customer;
  bookings: Booking[];
  activities: {
    id: string;
    kind: string;
    body: string;
    url: string;
    createdAt: string;
  }[];
  quotes: {
    id: string;
    inquiryId: string;
    tourTitle: string;
    travelers: number;
    totalMinor: number;
    currency: string;
    createdAt: string;
  }[];
};
export type GuestBookingResult = {
  id: string;
  reference: string;
  status: "pending";
  totalMinor: number;
  currency: "MNT" | "USD";
  accessToken: string;
};
export type TravelerBooking = {
  tenantId: string;
  id: string;
  reference: string;
  status: (typeof bookingStatuses)[number];
  customerName: string;
  travelers: number;
  totalMinor: number;
  currency: string;
  bookedAt: string;
  departure: { id: string; startsOn: string; endsOn: string; status: string };
  tour: {
    id: string;
    title: string;
    destination: string;
    itinerary: { day: number; title: string; description: string }[];
    media: { url: string; alt: string }[];
  };
};
