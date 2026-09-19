import { z } from "zod";
import { dashboardFilterSchema } from "./dashboard";
import { resourceIdSchema } from "./security";

export const settingsMutationSchema = z.object({
  name: z.string().trim().min(1).max(128),
  previousName: z.string().min(1).max(128),
});
export type SettingsData = {
  name: string;
  members: { email: string; role: string; active: boolean }[];
};

export const moneyMinorSchema = z
  .number()
  .int()
  .min(0)
  .max(Number.MAX_SAFE_INTEGER);
export const financeFilterSchema = z
  .object({
    currency: z.enum(["MNT", "USD"]).default("MNT"),
    from: z.iso.date().optional(),
    to: z.iso.date().optional(),
  })
  .superRefine((filter, ctx) => {
    if (filter.from === undefined && filter.to === undefined) return;
    const result = dashboardFilterSchema.safeParse({
      from: filter.from,
      to: filter.to,
      currency: filter.currency,
    });
    if (!result.success)
      for (const issue of result.error.issues)
        ctx.addIssue({
          code: "custom",
          path: issue.path,
          message: issue.message,
        });
  });
export const reportsFilterSchema = financeFilterSchema.safeExtend({
  destination: z.string().trim().max(160).optional(),
  channel: z.enum(["direct", "website", "agent", "other"]).optional(),
});
export const financeMutationSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("payment"),
    bookingId: resourceIdSchema,
    amountMinor: moneyMinorSchema.positive(),
    method: z.enum(["cash", "bank_transfer", "other"]),
    reference: z.string().trim().min(1).max(120),
    requestId: resourceIdSchema,
  }),
  z.object({
    action: z.literal("refund"),
    bookingId: resourceIdSchema,
    amountMinor: moneyMinorSchema.positive(),
    method: z.enum(["cash", "bank_transfer", "other"]),
    reference: z.string().trim().min(1).max(120),
    requestId: resourceIdSchema,
  }),
  z.object({ action: z.literal("reconcile"), entryId: resourceIdSchema }),
  z.object({
    action: z.literal("invoice"),
    bookingId: resourceIdSchema,
    dueOn: z.iso.date(),
  }),
]);
export const promotionInputSchema = z
  .object({
    code: z
      .string()
      .trim()
      .toUpperCase()
      .min(3)
      .max(40)
      .regex(/^[A-Z0-9_-]+$/),
    kind: z.enum(["percent", "fixed"]),
    value: moneyMinorSchema.positive(),
    currency: z.enum(["MNT", "USD"]),
    startsAt: z.iso.datetime(),
    endsAt: z.iso.datetime().nullable(),
    maxUses: z.number().int().min(1).max(1_000_000).nullable(),
  })
  .superRefine((v, ctx) => {
    if (v.kind === "percent" && v.value > 100)
      ctx.addIssue({
        code: "custom",
        path: ["value"],
        message: "Percentage cannot exceed 100.",
      });
    if (v.endsAt && v.endsAt <= v.startsAt)
      ctx.addIssue({
        code: "custom",
        path: ["endsAt"],
        message: "End must follow start.",
      });
  });
export const marketingMutationSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("promotion"), data: promotionInputSchema }),
  z.object({
    action: z.literal("togglePromotion"),
    id: resourceIdSchema,
    active: z.boolean(),
  }),
  z
    .object({
      action: z.literal("campaign"),
      name: z.string().trim().min(1).max(120),
      source: z.enum(["direct", "website", "agent", "other"]),
      budgetMinor: moneyMinorSchema,
      currency: z.enum(["MNT", "USD"]),
      startsOn: z.iso.date(),
      endsOn: z.iso.date(),
    })
    .refine((v) => v.endsOn >= v.startsOn, {
      path: ["endsOn"],
      message: "End must follow start.",
    }),
]);
export type FinanceMutation = z.infer<typeof financeMutationSchema>;
export type PromotionInput = z.infer<typeof promotionInputSchema>;
export type MarketingMutation = z.infer<typeof marketingMutationSchema>;
export type FinanceData = {
  currency: "MNT" | "USD";
  collectedMinor: number;
  refundedMinor: number;
  outstandingMinor: number;
  averageBookingMinor: number;
  bookings: {
    id: string;
    reference: string;
    customerName: string;
    totalMinor: number;
    paidMinor: number;
    status: string;
  }[];
  entries: {
    id: string;
    bookingReference: string;
    kind: "payment" | "refund";
    amountMinor: number;
    method: string;
    reference: string;
    createdAt: string;
    reconciledAt: string | null;
  }[];
  invoices: {
    id: string;
    number: string;
    bookingReference: string;
    customerName: string;
    totalMinor: number;
    dueOn: string;
    issuedAt: string;
    paidMinor: number;
  }[];
  cashFlow: { month: string; paymentsMinor: number; refundsMinor: number }[];
};
export type MarketingData = {
  promotions: (PromotionInput & {
    id: string;
    active: boolean;
    uses: number;
  })[];
  campaigns: {
    id: string;
    name: string;
    source: string;
    budgetMinor: number;
    currency: string;
    startsOn: string;
    endsOn: string;
    bookings: number;
    revenueMinor: number;
  }[];
  sources: { source: string; bookings: number; travelers: number }[];
};
export type ReportsData = {
  availableDestinations: string[];
  monthly: { month: string; bookings: number; revenueMinor: number }[];
  currency: "MNT" | "USD";
  bookings: number;
  travelers: number;
  revenueMinor: number;
  grossMarginMinor: number | null;
  costedBookings: number;
  destinations: {
    name: string;
    bookings: number;
    travelers: number;
    revenueMinor: number;
  }[];
  sources: {
    name: string;
    bookings: number;
    travelers: number;
    revenueMinor: number;
  }[];
  tours: {
    name: string;
    bookings: number;
    travelers: number;
    revenueMinor: number;
  }[];
};
