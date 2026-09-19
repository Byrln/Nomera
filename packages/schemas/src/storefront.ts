import { z } from "zod";
import { resourceIdSchema } from "./security";
import { tourInputSchema } from "./tours";

const text = z.string().trim();
export const storefrontSlugSchema = text
  .min(3)
  .max(80)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
const media = z.union([
  z.literal(""),
  z
    .url({ protocol: /^https$/ })
    .max(2048)
    .refine((value) => {
      const u = new URL(value);
      return !u.username && !u.password;
    }),
]);
export const sectionKinds = [
  "hero",
  "featured",
  "about",
  "destinations",
  "testimonials",
  "stats",
  "faq",
  "contact",
] as const;
export const policyKinds = [
  "cancellation",
  "booking",
  "payment",
  "refund",
  "requirements",
  "rules",
  "children",
  "included",
  "terms",
] as const;
export const storefrontInputSchema = z.strictObject({
  theme: z.enum(["atlas", "nomad", "horizon", "editorial", "minimal"]),
  storeName: text.min(1).max(120),
  tagline: text.max(300),
  logo: media,
  primaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  accentColor: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  font: z.enum(["sans", "serif"]),
  brandVoice: text.max(500),
  email: z.union([z.literal(""), z.email()]),
  phone: text.max(60),
  cta: text.max(60),
  featuredTourIds: z.array(resourceIdSchema).max(30),
  sections: z
    .array(
      z.strictObject({
        kind: z.enum(sectionKinds),
        visible: z.boolean(),
        layout: z.enum(["standard", "split", "compact"]),
        title: text.max(160),
        body: text.max(10000),
        image: media,
      }),
    )
    .length(8)
    .refine((v) => new Set(v.map((s) => s.kind)).size === 8),
  policies: z.strictObject(
    Object.fromEntries(policyKinds.map((k) => [k, text.max(20000)])) as Record<
      (typeof policyKinds)[number],
      z.ZodString
    >,
  ),
  seo: z.strictObject({
    slug: storefrontSlugSchema,
    siteTitle: text.max(160),
    metaTitle: text.max(160),
    description: text.max(500),
    canonicalUrl: media,
    ogImage: media,
    favicon: media,
    keywords: text.max(1000),
    indexing: z.boolean(),
    structuredData: z.boolean(),
  }),
});
export type StorefrontInput = z.infer<typeof storefrontInputSchema>;
export function defaultStorefront(
  name: string,
  tenantId: string,
): StorefrontInput {
  return {
    theme: "atlas",
    storeName: name.slice(0, 120),
    tagline: "",
    logo: "",
    primaryColor: "#24483d",
    accentColor: "#e5ecdf",
    font: "serif",
    brandVoice: "",
    email: "",
    phone: "",
    cta: "",
    featuredTourIds: [],
    sections: sectionKinds.map((kind) => ({
      kind,
      visible: ["hero", "featured", "contact"].includes(kind),
      layout: "standard",
      title: "",
      body: "",
      image: "",
    })),
    policies: {
      cancellation: "",
      booking: "",
      payment: "",
      refund: "",
      requirements: "",
      rules: "",
      children: "",
      included: "",
      terms: "",
    },
    seo: {
      slug: `operator-${tenantId.slice(0, 8)}`,
      siteTitle: name,
      metaTitle: "",
      description: "",
      canonicalUrl: "",
      ogImage: "",
      favicon: "",
      keywords: "",
      indexing: false,
      structuredData: true,
    },
  };
}
export const storefrontMutationSchema = z.discriminatedUnion("type", [
  z.strictObject({
    type: z.literal("save"),
    version: z.number().int().nonnegative(),
    data: storefrontInputSchema,
  }),
  z.strictObject({
    type: z.literal("publish"),
    version: z.number().int().nonnegative(),
    scheduledAt: z.iso.datetime({ offset: true }).optional(),
  }),
  z.strictObject({
    type: z.literal("restore"),
    version: z.number().int().nonnegative(),
    sourceVersion: z.number().int().positive(),
  }),
]);
export const publicTourSchema = z.object({
  id: resourceIdSchema,
  data: tourInputSchema,
  departures: z.array(
    z.object({
      id: resourceIdSchema,
      startsOn: z.iso.date(),
      endsOn: z.iso.date(),
      priceMinor: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
      currency: z.string(),
      available: z.number().int().nonnegative(),
    }),
  ),
});
export type PublicTour = z.infer<typeof publicTourSchema>;
export interface PublishedStorefront {
  tenantId: string;
  slug: string;
  version: number;
  data: StorefrontInput;
  tours: PublicTour[];
}
export interface StorefrontAdmin {
  tenantId: string;
  version: number;
  draft: StorefrontInput;
  published: { version: number; slug: string; effectiveAt: string } | null;
  history: Array<{
    version: number;
    effectiveAt: string;
    createdAt: string;
    cancelled: boolean;
  }>;
  tours: PublicTour[];
}
