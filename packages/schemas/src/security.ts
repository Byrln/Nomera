import { z } from "zod";

export const resourceIdSchema = z.uuid();
export const tenantRoleSchema = z.enum([
  "owner",
  "admin",
  "operations",
  "sales",
  "finance",
  "viewer",
]);
export type TenantRole = z.infer<typeof tenantRoleSchema>;

export const accountIdentitySchema = z.object({
  id: resourceIdSchema,
  status: z.boolean(),
  emailVerified: z.boolean(),
});
export const membershipIdentitySchema = z.object({
  id: resourceIdSchema,
  tenantId: resourceIdSchema,
  userId: resourceIdSchema,
  active: z.boolean(),
  roles: z.array(z.string()).max(100),
});
export const membershipsSchema = z.array(membershipIdentitySchema);
export const teamIdentitySchema = z.object({
  id: resourceIdSchema,
  name: z.string().min(1).max(128),
});
export const auditInputSchema = z.strictObject({
  eventId: resourceIdSchema,
  operationId: resourceIdSchema,
  action: z.enum([
    "tenant.membership_changed",
    "asset.created",
    "asset.deleted",
  ]),
  resourceId: resourceIdSchema,
});
