import "server-only";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { DomainError, parseInput } from "@nomera/domain/errors";
import {
  resolveTenantContext,
  type TenantSummary,
} from "@nomera/domain/tenancy";
import {
  accountIdentitySchema,
  loginCredentialsSchema,
  membershipIdentitySchema,
  resourceIdSchema,
  teamIdentitySchema,
} from "@nomera/schemas";
import { type DatabaseClient, getDatabase } from "../server";
import { databaseRead } from "./errors";
import { hashPassword, verifyPassword } from "./password";

const sessionLifetimeMs = 1000 * 60 * 60 * 24 * 30;

type UserRow = {
  id: string;
  email: string;
  password_hash: string;
  status: boolean;
  email_verified: boolean;
};
type WorkspaceRow = {
  membership_id: string;
  tenant_id: string;
  tenant_name: string;
  user_id: string;
  role: string;
  status: boolean;
  email_verified: boolean;
};

function digestSession(secret: string) {
  return createHash("sha256").update(secret).digest("hex");
}

export async function createLoginSession(
  input: unknown,
  sql: DatabaseClient = getDatabase(),
) {
  const credentials = parseInput(loginCredentialsSchema, input);
  const rows = await databaseRead(
    () =>
      sql<UserRow[]>`
      SELECT id, email, password_hash, status, email_verified
      FROM users
      WHERE lower(email) = lower(${credentials.email})
      LIMIT 1
    `,
  );
  const user = rows[0];
  if (!user?.status || !user.email_verified) {
    throw new DomainError("UNAUTHENTICATED");
  }
  if (!(await verifyPassword(credentials.password, user.password_hash))) {
    throw new DomainError("UNAUTHENTICATED");
  }
  const secret = randomBytes(32).toString("base64url");
  const expires = new Date(Date.now() + sessionLifetimeMs);
  await databaseRead(
    () =>
      sql`
      INSERT INTO sessions (id, user_id, token_digest, expires_at)
      VALUES (${randomUUID()}, ${user.id}, ${digestSession(secret)}, ${expires})
    `,
  );
  return { secret, expires };
}

export async function revokeLoginSession(
  secret: string,
  sql: DatabaseClient = getDatabase(),
) {
  if (!secret.trim()) throw new DomainError("UNAUTHENTICATED");
  await databaseRead(
    () =>
      sql`
      UPDATE sessions
      SET revoked_at = now()
      WHERE token_digest = ${digestSession(secret)}
        AND revoked_at IS NULL
    `,
  );
}

export async function listWorkspaces(
  secret: string,
  after?: string,
  sql: DatabaseClient = getDatabase(),
) {
  if (!secret.trim()) throw new DomainError("UNAUTHENTICATED");
  const cursor = after ? parseInput(resourceIdSchema, after) : undefined;
  const query = cursor
    ? sql<WorkspaceRow[]>`
      SELECT m.id AS membership_id, m.tenant_id, o.name AS tenant_name,
             m.user_id, m.role, u.status, u.email_verified
      FROM sessions s
      JOIN users u ON u.id = s.user_id AND u.status = true AND u.email_verified = true
      JOIN memberships m ON m.user_id = s.user_id AND m.active = true
      JOIN organizations o ON o.id = m.tenant_id
      WHERE s.token_digest = ${digestSession(secret)}
        AND s.revoked_at IS NULL
        AND s.expires_at > now()
        AND m.tenant_id > ${cursor}
      ORDER BY m.tenant_id ASC
      LIMIT 21
    `
    : sql<WorkspaceRow[]>`
      SELECT m.id AS membership_id, m.tenant_id, o.name AS tenant_name,
             m.user_id, m.role, u.status, u.email_verified
      FROM sessions s
      JOIN users u ON u.id = s.user_id
      JOIN memberships m ON m.user_id = s.user_id AND m.active = true
      JOIN organizations o ON o.id = m.tenant_id
      WHERE s.token_digest = ${digestSession(secret)}
        AND s.revoked_at IS NULL
        AND s.expires_at > now()
      ORDER BY m.tenant_id ASC
      LIMIT 21
    `;
  const rows = await databaseRead(() => query);
  if (rows.length === 0 && !after) {
    const session = await databaseRead(
      () =>
        sql<{ user_id: string }[]>`
        SELECT user_id FROM sessions
        WHERE token_digest = ${digestSession(secret)}
          AND revoked_at IS NULL AND expires_at > now()
      `,
    );
    if (!session[0]) throw new DomainError("UNAUTHENTICATED");
  }
  const workspaces: TenantSummary[] = [];
  for (const row of rows.slice(0, 20)) {
    const account = accountIdentitySchema.parse({
      id: row.user_id,
      status: row.status,
      emailVerified: row.email_verified,
    });
    const membership = membershipIdentitySchema.parse({
      id: row.membership_id,
      tenantId: row.tenant_id,
      userId: row.user_id,
      active: true,
      roles: [row.role],
    });
    const team = teamIdentitySchema.parse({
      id: row.tenant_id,
      name: row.tenant_name,
    });
    const context = await resolveTenantContext(
      {
        getCurrentUser: async () => account,
        findMemberships: async () => [membership],
        getTeam: async () => team,
      },
      row.tenant_id,
    );
    workspaces.push({
      id: context.tenantId,
      name: team.name,
      roles: context.roles,
    });
  }
  const last = rows[19];
  return {
    workspaces,
    nextCursor: rows.length > 20 && last ? last.tenant_id : null,
  };
}

export { hashPassword };
