import { randomUUID } from "node:crypto";
import postgres from "postgres";
import { hashPassword } from "../packages/postgres/src/server/password";
import {
  dashboardDate,
  shiftDashboardDate,
} from "../packages/schemas/src/dashboard";

// Explicit, isolated QA fixture. This is never part of deployment or migration startup.
const url = new URL(process.env.DATABASE_URL ?? "");
if (
  !["127.0.0.1", "localhost", "[::1]"].includes(url.hostname) ||
  url.pathname !== "/nomera_dashboard_preview"
) {
  throw new Error(
    "Dashboard fixtures require the local nomera_dashboard_preview database.",
  );
}
// biome-ignore lint/suspicious/noUndeclaredEnvVars: this explicit local fixture script is never run or cached by Turbo.
const password = process.env.NOMERA_QA_PASSWORD;
if (!password || password.length < 12)
  throw new Error(
    "Set a temporary NOMERA_QA_PASSWORD with at least 12 characters.",
  );
const sql = postgres(url.toString(), { max: 1, prepare: false });
try {
  const hash = await hashPassword(password);
  const today = dashboardDate();
  await sql.begin(async (tx) => {
    const userId = randomUUID();
    const tenantId = randomUUID();
    const emptyId = randomUUID();
    await tx`INSERT INTO users(id,email,password_hash,email_verified) VALUES (${userId},'dashboard.qa@example.test',${hash},true)`;
    await tx`INSERT INTO organizations(id,name) VALUES (${tenantId},'NOMERA · Local QA'),(${emptyId},'Empty workspace · Local QA')`;
    for (const id of [tenantId, emptyId]) {
      await tx`INSERT INTO memberships(id,tenant_id,user_id,role) VALUES (${randomUUID()},${id},${userId},'owner')`;
    }
    const departures: string[] = [];
    for (const [index, title] of [
      "Говийн аялал",
      "Хөвсгөл нуурын аялал",
      "Алтайн уулсын аялал",
    ].entries()) {
      const tour = randomUUID();
      const departure = randomUUID();
      departures.push(departure);
      await tx`INSERT INTO tours(id,tenant_id,title) VALUES (${tour},${tenantId},${title})`;
      await tx`INSERT INTO departures(id,tenant_id,tour_id,starts_on,ends_on,status,capacity) VALUES (${departure},${tenantId},${tour},${shiftDashboardDate(today, index * 5)},${shiftDashboardDate(today, index * 5 + 6)},'confirmed',24)`;
    }
    for (let index = 0; index < 60; index++) {
      const booking = randomUUID();
      const bookedAt = `${shiftDashboardDate(today, -index)}T04:00:00Z`;
      const status =
        index % 13 === 0
          ? "pending"
          : index % 17 === 0
            ? "cancelled"
            : "confirmed";
      await tx`INSERT INTO bookings(id,tenant_id,departure_id,reference,customer_name,booked_at,status,channel,total_minor,currency,travelers) VALUES (${booking},${tenantId},${departures[index % 3] ?? ""},${`QA-${String(1060 - index).padStart(4, "0")}`},${`Туршилтын аялагч ${index + 1}`},${bookedAt},${status},${["website", "agent", "direct", "website", "other"][index % 5] ?? "other"},${((index % 7) + 1) * 12000000},${index % 8 === 0 ? "USD" : "MNT"},${(index % 3) + 1})`;
      await tx`INSERT INTO inquiries(id,tenant_id,created_at,booking_id) VALUES (${randomUUID()},${tenantId},${bookedAt},${index % 3 === 0 ? null : booking})`;
    }
  });
  console.info(
    "Local dashboard QA fixtures created. Account: dashboard.qa@example.test. These are synthetic test records.",
  );
} finally {
  await sql.end({ timeout: 5 });
}
