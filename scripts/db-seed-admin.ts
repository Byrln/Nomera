import { randomUUID } from "node:crypto";
import { getServerEnvironment } from "@nomera/config/server";
import { hashPassword } from "@nomera/postgres/server/auth";
import postgres from "postgres";

const email = process.env.SEED_ADMIN_EMAIL?.trim().toLowerCase();
const password = process.env.SEED_ADMIN_PASSWORD;
const tenantName = process.env.SEED_TENANT_NAME?.trim();
if (!email || !password || !tenantName) {
  throw new Error(
    "Set SEED_ADMIN_EMAIL, SEED_ADMIN_PASSWORD and SEED_TENANT_NAME before running db:seed:admin.",
  );
}

const database = postgres(getServerEnvironment().DATABASE_URL, {
  max: 1,
  connect_timeout: 10,
  prepare: false,
});
try {
  const passwordHash = await hashPassword(password);
  await database.begin(async (transaction) => {
    const users = await transaction<{ id: string }[]>`
      INSERT INTO users (id, email, password_hash, email_verified)
      VALUES (${randomUUID()}, ${email}, ${passwordHash}, true)
      ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash,
        status = true, email_verified = true
      RETURNING id
    `;
    const user = users[0];
    if (!user) throw new Error("Failed to create seed user.");
    const organizations = await transaction<{ id: string }[]>`
      INSERT INTO organizations (id, name) VALUES (${randomUUID()}, ${tenantName})
      RETURNING id
    `;
    const organization = organizations[0];
    if (!organization) throw new Error("Failed to create seed organization.");
    await transaction`
      INSERT INTO memberships (id, tenant_id, user_id, role)
      VALUES (${randomUUID()}, ${organization.id}, ${user.id}, 'owner')
      ON CONFLICT (tenant_id, user_id) DO UPDATE SET role = 'owner', active = true
    `;
  });
  console.info(`[NOMERA] Seeded owner access for ${email}.`);
} finally {
  await database.end({ timeout: 5 });
}
