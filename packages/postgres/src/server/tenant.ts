import "server-only";
import { createHash } from "node:crypto";
import { DomainError } from "@nomera/domain/errors";
import {
  getTenantSummary,
  type IdentityGateway,
  resolveTenantContext,
} from "@nomera/domain/tenancy";
import {
  accountIdentitySchema,
  membershipIdentitySchema,
  resourceIdSchema,
  teamIdentitySchema,
} from "@nomera/schemas";
import type { TransactionSql } from "postgres";
import { type DatabaseClient, getDatabase } from "../server";
import { databaseRead } from "./errors";

function digestSession(secret: string) {
  return createHash("sha256").update(secret).digest("hex");
}

export async function createTenantRepository(
  session: string,
  selectedTenant: unknown,
  sql: DatabaseClient | TransactionSql = getDatabase(),
) {
  if (!session.trim()) throw new DomainError("UNAUTHENTICATED");
  const tenantId = resourceIdSchema.safeParse(selectedTenant);
  if (!tenantId.success) throw new DomainError("VALIDATION_ERROR");
  const rows = await databaseRead(
    () =>
      sql<
        Array<{
          user_id: string;
          membership_id: string | null;
          tenant_id: string | null;
          tenant_name: string | null;
          role: string | null;
          status: boolean;
          email_verified: boolean;
        }>
      >`
      SELECT s.user_id, m.id AS membership_id, m.tenant_id,
             o.name AS tenant_name, m.role, u.status, u.email_verified
      FROM sessions s
      JOIN users u ON u.id = s.user_id
      LEFT JOIN memberships m ON m.user_id = s.user_id
        AND m.tenant_id = ${tenantId.data}
        AND m.active = true
      LEFT JOIN organizations o ON o.id = m.tenant_id
      WHERE s.token_digest = ${digestSession(session)}
        AND s.revoked_at IS NULL
        AND s.expires_at > now()
      LIMIT 2
    `,
  );
  if (rows.length !== 1) throw new DomainError("UNAUTHENTICATED");
  const row = rows[0];
  if (!row) throw new DomainError("UNAUTHENTICATED");
  if (!row.status) throw new DomainError("UNAUTHENTICATED");
  if (!row.email_verified) throw new DomainError("FORBIDDEN");
  if (!row.membership_id || !row.tenant_id || !row.tenant_name || !row.role)
    throw new DomainError("FORBIDDEN");
  const gateway: IdentityGateway = {
    getCurrentUser: async () =>
      accountIdentitySchema.parse({
        id: row.user_id,
        status: row.status,
        emailVerified: row.email_verified,
      }),
    findMemberships: async () => [
      membershipIdentitySchema.parse({
        id: row.membership_id,
        tenantId: row.tenant_id,
        userId: row.user_id,
        active: true,
        roles: [row.role],
      }),
    ],
    getTeam: async () =>
      teamIdentitySchema.parse({ id: row.tenant_id, name: row.tenant_name }),
  };
  const context = await resolveTenantContext(gateway, tenantId.data);
  return Object.freeze({
    context,
    getSummary: () => getTenantSummary(context, gateway),
  });
}
