import { createHash, randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import postgres from "postgres";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { getDashboard } from "./dashboard";

// An explicit, local test database is required. Never fall back to DATABASE_URL.
const url = process.env.TEST_DATABASE_URL;
const ids = {
  tenant: randomUUID(),
  other: randomUUID(),
  empty: randomUUID(),
  user: randomUUID(),
  session: randomUUID(),
  tour: randomUUID(),
  foreignTour: randomUUID(),
  departure: randomUUID(),
  foreignDeparture: randomUUID(),
};
const secret = randomUUID();
const filter = { from: "2026-09-10", to: "2026-09-12", currency: "MNT" };
const digest = createHash("sha256").update(secret).digest("hex");
let sql: ReturnType<typeof postgres>;
let control: ReturnType<typeof postgres>;
const schema = `dashboard_test_${randomUUID().replaceAll("-", "")}`;

describe.skipIf(!url)("dashboard PostgreSQL isolation and aggregates", () => {
  beforeAll(async () => {
    const target = new URL(url ?? "");
    if (!["localhost", "127.0.0.1", "[::1]"].includes(target.hostname))
      throw new Error(
        "Dashboard integration tests require a loopback PostgreSQL server.",
      );
    control = postgres(url ?? "", { max: 1, onnotice: () => {} });
    await control.unsafe(`CREATE SCHEMA ${schema}`);
    sql = postgres(url ?? "", {
      max: 3,
      connection: { search_path: schema, application_name: schema },
      onnotice: () => {},
    });
    for (const name of ["0001_foundation.sql", "0002_dashboard.sql"]) {
      await sql.unsafe(
        await readFile(
          new URL(`../../../../db/migrations/${name}`, import.meta.url),
          "utf8",
        ),
      );
    }
    await sql`INSERT INTO organizations (id,name) VALUES (${ids.tenant}, 'Operator A'), (${ids.other}, 'Operator B'), (${ids.empty}, 'Empty operator')`;
    await sql`INSERT INTO users (id,email,password_hash,email_verified) VALUES (${ids.user}, ${`${ids.user}@example.test`}, 'not-a-login-password', true)`;
    await sql`INSERT INTO memberships (id,tenant_id,user_id,role) VALUES (${randomUUID()}, ${ids.tenant}, ${ids.user}, 'owner'), (${randomUUID()}, ${ids.empty}, ${ids.user}, 'admin')`;
    await sql`INSERT INTO sessions (id,user_id,token_digest,expires_at) VALUES (${ids.session}, ${ids.user}, ${digest}, now() + interval '1 day')`;
    await sql`INSERT INTO tours (id,tenant_id,title) VALUES (${ids.tour}, ${ids.tenant}, 'Gobi expedition'), (${ids.foreignTour}, ${ids.other}, 'Foreign tour')`;
    await sql`INSERT INTO departures (id,tenant_id,tour_id,starts_on,ends_on,status,capacity) VALUES
      (${ids.departure}, ${ids.tenant}, ${ids.tour}, '2026-09-09', '2026-09-10', 'confirmed', 12),
      (${ids.foreignDeparture}, ${ids.other}, ${ids.foreignTour}, '2026-09-10', '2026-09-12', 'confirmed', 99),
      (${randomUUID()}, ${ids.tenant}, ${ids.tour}, '2026-09-12', '2026-09-15', 'scheduled', 10),
      (${randomUUID()}, ${ids.tenant}, ${ids.tour}, '2026-09-10', '2026-09-12', 'completed', 10),
      (${randomUUID()}, ${ids.tenant}, ${ids.tour}, '2026-09-10', '2026-09-12', 'cancelled', 10)`;
    const rows = [
      {
        ref: "FIRST",
        at: "2026-09-09T16:00:00Z",
        status: "confirmed",
        channel: "website",
        amount: 100,
        currency: "MNT",
      },
      {
        ref: "LAST",
        at: "2026-09-12T15:59:59.999Z",
        status: "completed",
        channel: "direct",
        amount: 250,
        currency: "MNT",
      },
      {
        ref: "PENDING",
        at: "2026-09-11T00:00:00Z",
        status: "pending",
        channel: "agent",
        amount: 999,
        currency: "MNT",
      },
      {
        ref: "CANCELLED",
        at: "2026-09-11T00:00:00Z",
        status: "cancelled",
        channel: "other",
        amount: 999,
        currency: "MNT",
      },
      {
        ref: "USD",
        at: "2026-09-11T00:00:00Z",
        status: "confirmed",
        channel: "website",
        amount: 300,
        currency: "USD",
      },
      {
        ref: "BEFORE",
        at: "2026-09-09T15:59:59.999Z",
        status: "confirmed",
        channel: "direct",
        amount: 50,
        currency: "MNT",
      },
      {
        ref: "AFTER",
        at: "2026-09-12T16:00:00Z",
        status: "confirmed",
        channel: "direct",
        amount: 700,
        currency: "MNT",
      },
      {
        ref: "OLD_PENDING",
        at: "2025-01-01T00:00:00Z",
        status: "pending",
        channel: "direct",
        amount: 200,
        currency: "MNT",
      },
    ];
    for (const row of rows) {
      const booking = randomUUID();
      await sql`INSERT INTO bookings (id,tenant_id,departure_id,reference,customer_name,booked_at,status,channel,total_minor,currency,travelers)
        VALUES (${booking}, ${ids.tenant}, ${ids.departure}, ${row.ref}, 'Test traveler', ${row.at}, ${row.status}, ${row.channel}, ${row.amount}, ${row.currency}, 2)`;
      if (["FIRST", "CANCELLED", "PENDING"].includes(row.ref)) {
        await sql`INSERT INTO inquiries (id,tenant_id,created_at,booking_id) VALUES (${randomUUID()}, ${ids.tenant}, '2026-09-11T00:00:00Z', ${booking})`;
      }
    }
    await sql`INSERT INTO inquiries (id,tenant_id,created_at) VALUES (${randomUUID()}, ${ids.tenant}, '2026-09-11T00:00:00Z'), (${randomUUID()}, ${ids.tenant}, '2026-09-08T00:00:00Z')`;
    await sql`INSERT INTO bookings (id,tenant_id,departure_id,reference,customer_name,booked_at,status,channel,total_minor,currency,travelers)
      VALUES (${randomUUID()}, ${ids.other}, ${ids.foreignDeparture}, 'FOREIGN', 'Foreign traveler', '2026-09-11T00:00:00Z', 'confirmed', 'direct', 99999, 'MNT', 20)`;
  });
  afterAll(async () => {
    await sql?.end();
    if (control) {
      await control.unsafe(`DROP SCHEMA IF EXISTS ${schema} CASCADE`);
      await control.end();
    }
  });
  it("uses inclusive Ulaanbaatar dates, safe totals and equal previous interval", async () => {
    const result = await getDashboard(secret, ids.tenant, filter, sql);
    expect(result.previousPeriod).toEqual({
      from: "2026-09-07",
      to: "2026-09-09",
    });
    expect(result.metrics).toEqual({
      bookings: { value: 3, previous: 1 },
      revenueMinor: { value: 350, previous: 50 },
      activeDepartures: { value: 2, previous: 1 },
      conversion: { value: 25, previous: 0 },
    });
    expect(result.trend).toEqual([
      { date: "2026-09-10", bookings: 1, revenueMinor: 100 },
      { date: "2026-09-11", bookings: 1, revenueMinor: 0 },
      { date: "2026-09-12", bookings: 1, revenueMinor: 250 },
    ]);
    expect(result.channels).toEqual([
      { channel: "direct", bookings: 1 },
      { channel: "website", bookings: 1 },
      { channel: "agent", bookings: 1 },
      { channel: "other", bookings: 0 },
    ]);
    expect(result.attention.pendingBookings).toBe(2);
    expect(result.recentBookings.map((row) => row.reference)).toEqual(
      expect.arrayContaining(["FIRST", "LAST", "PENDING", "CANCELLED"]),
    );
    expect(result.recentBookings).toHaveLength(4);
  });
  it("keeps monetary and booking filters in one currency without filtering inquiry conversion", async () => {
    const result = await getDashboard(
      secret,
      ids.tenant,
      { ...filter, currency: "USD" },
      sql,
    );
    expect(result.metrics.bookings.value).toBe(1);
    expect(result.metrics.revenueMinor.value).toBe(300);
    expect(result.metrics.conversion.value).toBe(25);
    expect(result.attention.pendingBookings).toBe(0);
  });
  it("returns genuine empty values with null conversion and complete zero days", async () => {
    const result = await getDashboard(secret, ids.empty, filter, sql);
    expect(result.metrics).toEqual({
      bookings: { value: 0, previous: 0 },
      revenueMinor: { value: 0, previous: 0 },
      activeDepartures: { value: 0, previous: 0 },
      conversion: { value: null, previous: null },
    });
    expect(result.trend).toHaveLength(3);
    expect(result.departures).toEqual([]);
    expect(result.recentBookings).toEqual([]);
  });
  it("denies a foreign tenant without exposing its data", async () => {
    await expect(
      getDashboard(secret, ids.other, filter, sql),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
  it("denies disabled or unverified accounts", async () => {
    await sql`UPDATE users SET status = false WHERE id = ${ids.user}`;
    await expect(
      getDashboard(secret, ids.tenant, filter, sql),
    ).rejects.toMatchObject({ code: "UNAUTHENTICATED" });
    await sql`UPDATE users SET status = true, email_verified = false WHERE id = ${ids.user}`;
    await expect(
      getDashboard(secret, ids.tenant, filter, sql),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    await sql`UPDATE users SET email_verified = true WHERE id = ${ids.user}`;
  });
  it("bounds upcoming operations independently of the historical filter and reserves across currencies", async () => {
    const tour = randomUUID();
    const firstDeparture = randomUUID();
    await sql`INSERT INTO tours (id,tenant_id,title) VALUES (${tour}, ${ids.empty}, 'Upcoming route')`;
    await sql`INSERT INTO departures (id,tenant_id,tour_id,starts_on,ends_on,status,capacity) VALUES
      (${firstDeparture}, ${ids.empty}, ${tour}, (now() AT TIME ZONE 'Asia/Ulaanbaatar')::date, (now() AT TIME ZONE 'Asia/Ulaanbaatar')::date + 2, 'confirmed', 20)`;
    for (let offset = 1; offset <= 7; offset++) {
      await sql`INSERT INTO departures (id,tenant_id,tour_id,starts_on,ends_on,status,capacity) VALUES
        (${randomUUID()}, ${ids.empty}, ${tour}, (now() AT TIME ZONE 'Asia/Ulaanbaatar')::date + ${offset}::integer, (now() AT TIME ZONE 'Asia/Ulaanbaatar')::date + ${offset}::integer, 'scheduled', 20)`;
    }
    for (const [status, currency, travelers] of [
      ["confirmed", "MNT", 2],
      ["completed", "USD", 5],
      ["pending", "MNT", 4],
      ["cancelled", "MNT", 99],
    ] as const) {
      await sql`INSERT INTO bookings (id,tenant_id,departure_id,reference,customer_name,booked_at,status,channel,total_minor,currency,travelers)
        VALUES (${randomUUID()}, ${ids.empty}, ${firstDeparture}, ${status}, 'Upcoming traveler', '2025-01-01T00:00:00Z', ${status}, 'direct', 100, ${currency}, ${travelers})`;
    }
    const result = await getDashboard(
      secret,
      ids.empty,
      { from: "2024-01-01", to: "2024-01-01", currency: "MNT" },
      sql,
    );
    expect(result.metrics.bookings.value).toBe(0);
    expect(result.departures).toHaveLength(5);
    expect(result.departures[0]).toMatchObject({
      id: firstDeparture,
      capacity: 20,
      reserved: 7,
    });
    expect(result.attention.pendingBookings).toBe(1);
    expect(result.recentBookings).toEqual([]);
  });
  it("denies invalid, expired and revoked sessions as unauthenticated", async () => {
    await expect(
      getDashboard("invalid-secret", ids.tenant, filter, sql),
    ).rejects.toMatchObject({ code: "UNAUTHENTICATED" });
    await sql`UPDATE sessions SET expires_at = now() - interval '1 second' WHERE id = ${ids.session}`;
    await expect(
      getDashboard(secret, ids.tenant, filter, sql),
    ).rejects.toMatchObject({ code: "UNAUTHENTICATED" });
    await sql`UPDATE sessions SET expires_at = now() + interval '1 day', revoked_at = now() WHERE id = ${ids.session}`;
    await expect(
      getDashboard(secret, ids.tenant, filter, sql),
    ).rejects.toMatchObject({ code: "UNAUTHENTICATED" });
    await sql`UPDATE sessions SET revoked_at = NULL WHERE id = ${ids.session}`;
  });
  it("rechecks role and active membership on every request", async () => {
    for (const role of ["viewer", "operations", "sales", "finance"]) {
      await sql`UPDATE memberships SET role = ${role} WHERE tenant_id = ${ids.tenant}`;
      await expect(
        getDashboard(secret, ids.tenant, filter, sql),
      ).rejects.toMatchObject({ code: "FORBIDDEN" });
    }
    await sql`UPDATE memberships SET role = 'admin', active = false WHERE tenant_id = ${ids.tenant}`;
    await expect(
      getDashboard(secret, ids.tenant, filter, sql),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    await sql`UPDATE memberships SET active = true WHERE tenant_id = ${ids.tenant}`;
    expect((await getDashboard(secret, ids.tenant, filter, sql)).tenantId).toBe(
      ids.tenant,
    );
  });
  it("rejects cross-tenant relationship writes at the database boundary", async () => {
    await expect(
      sql`INSERT INTO departures (id,tenant_id,tour_id,starts_on,ends_on,status,capacity) VALUES (${randomUUID()}, ${ids.tenant}, ${ids.foreignTour}, '2026-09-12','2026-09-12','scheduled',1)`,
    ).rejects.toMatchObject({ code: "23503" });
    await expect(
      sql`UPDATE bookings SET departure_id = ${ids.foreignDeparture} WHERE tenant_id = ${ids.tenant} AND reference = 'FIRST'`,
    ).rejects.toMatchObject({ code: "23503" });
    const [foreign] = await sql<
      { id: string }[]
    >`SELECT id FROM bookings WHERE tenant_id = ${ids.other}`;
    await expect(
      sql`INSERT INTO inquiries (id,tenant_id,booking_id) VALUES (${randomUUID()}, ${ids.tenant}, ${foreign?.id ?? ""})`,
    ).rejects.toMatchObject({ code: "23503" });
  });
  it("keeps authorization and all reads in one consistent snapshot", async () => {
    let pending: ReturnType<typeof getDashboard> | undefined;
    try {
      await sql.begin(async (writer) => {
        await writer`LOCK TABLE bookings IN ACCESS EXCLUSIVE MODE`;
        pending = getDashboard(secret, ids.tenant, filter, sql);
        // Wait until authorization has finished and its first business read is blocked.
        let blocked = false;
        for (let attempt = 0; attempt < 100; attempt++) {
          await writer`SELECT pg_stat_clear_snapshot()`;
          const [activity] = await writer<{ blocked: boolean }[]>`
            SELECT EXISTS (SELECT 1 FROM pg_stat_activity
              WHERE application_name = ${schema} AND wait_event_type = 'Lock'
                AND pid <> pg_backend_pid()) AS blocked`;
          if (activity?.blocked) {
            blocked = true;
            break;
          }
          await new Promise((resolve) => setTimeout(resolve, 20));
        }
        if (!blocked)
          throw new Error(
            "Dashboard did not reach the coordinated database read",
          );
        await writer`UPDATE bookings SET total_minor = 101 WHERE tenant_id = ${ids.tenant} AND reference = 'FIRST'`;
        await writer`UPDATE memberships SET role = 'sales' WHERE tenant_id = ${ids.tenant}`;
      });
      const result = await pending;
      expect(result?.metrics.revenueMinor.value).toBe(350);
      expect(result?.trend[0]?.revenueMinor).toBe(100);
      expect(
        result?.recentBookings.find((row) => row.reference === "FIRST")
          ?.totalMinor,
      ).toBe(100);
      await expect(
        getDashboard(secret, ids.tenant, filter, sql),
      ).rejects.toMatchObject({ code: "FORBIDDEN" });
    } finally {
      await pending?.catch(() => undefined);
      await sql`UPDATE memberships SET role = 'admin' WHERE tenant_id = ${ids.tenant}`;
      await sql`UPDATE bookings SET total_minor = 100 WHERE tenant_id = ${ids.tenant} AND reference = 'FIRST'`;
    }
  });
  it("rejects invalid dates, amounts and currencies in persisted records", async () => {
    await expect(
      sql`UPDATE departures SET ends_on = starts_on - 1 WHERE id = ${ids.departure}`,
    ).rejects.toMatchObject({ code: "23514" });
    await expect(
      sql`UPDATE bookings SET total_minor = -1 WHERE tenant_id = ${ids.tenant}`,
    ).rejects.toMatchObject({ code: "23514" });
    await expect(
      sql`UPDATE bookings SET currency = 'EUR' WHERE tenant_id = ${ids.tenant}`,
    ).rejects.toMatchObject({ code: "23514" });
  });
  it.each([
    { table: "tours", column: "title", maximum: 200 },
    { table: "bookings", column: "reference", maximum: 64 },
    { table: "bookings", column: "customer_name", maximum: 200 },
  ])(
    "rejects padded overlong $table column $column before it can break the wire response",
    async ({ table, column, maximum }) => {
      await expect(
        sql.begin(async (transaction) => {
          await transaction`UPDATE ${transaction(table)} SET ${transaction(column)} = ${`x${" ".repeat(maximum)}`} WHERE id = (SELECT id FROM ${transaction(table)} WHERE tenant_id = ${ids.tenant} LIMIT 1)`;
          throw new Error("Missing raw text length constraint");
        }),
      ).rejects.toMatchObject({ code: "23514" });
    },
  );
  it("fails closed when an aggregate exceeds JavaScript safe integers", async () => {
    await sql`UPDATE bookings SET total_minor = 9007199254740991 WHERE tenant_id = ${ids.tenant} AND reference = 'FIRST'`;
    await expect(
      getDashboard(secret, ids.tenant, filter, sql),
    ).rejects.toMatchObject({ code: "UNAVAILABLE" });
    await sql`UPDATE bookings SET total_minor = 100 WHERE tenant_id = ${ids.tenant} AND reference = 'FIRST'`;
  });
  it("returns only the ten most recent filtered bookings, including cancellations", async () => {
    for (let index = 0; index < 12; index++) {
      const bookedAt = new Date(Date.UTC(2024, 1, 1, 0, index));
      await sql`INSERT INTO bookings (id,tenant_id,departure_id,reference,customer_name,booked_at,status,channel,total_minor,currency,travelers)
        VALUES (${randomUUID()}, ${ids.tenant}, ${ids.departure}, ${`RECENT-${index}`}, 'Historical traveler', ${bookedAt}, ${index % 2 ? "cancelled" : "confirmed"}, 'direct', 1, 'MNT', 1)`;
    }
    const result = await getDashboard(
      secret,
      ids.tenant,
      { from: "2024-02-01", to: "2024-02-01", currency: "MNT" },
      sql,
    );
    expect(result.recentBookings.map((row) => row.reference)).toEqual([
      "RECENT-11",
      "RECENT-10",
      "RECENT-9",
      "RECENT-8",
      "RECENT-7",
      "RECENT-6",
      "RECENT-5",
      "RECENT-4",
      "RECENT-3",
      "RECENT-2",
    ]);
    expect(result.metrics.bookings.value).toBe(6);
    expect(result.metrics.revenueMinor.value).toBe(6);
  });
  it("classifies every overlapping departure once at the exact 80 percent and capacity boundaries", async () => {
    const tenant = randomUUID(),
      tour = randomUUID();
    await sql`INSERT INTO organizations(id,name) VALUES(${tenant},'Classification operator')`;
    await sql`INSERT INTO memberships(id,tenant_id,user_id,role) VALUES(${randomUUID()},${tenant},${ids.user},'owner')`;
    await sql`INSERT INTO tours(id,tenant_id,title) VALUES(${tour},${tenant},'Classification route')`;
    const fixtures = [
      { status: "scheduled", capacity: 10, reserved: 7 },
      { status: "confirmed", capacity: 10, reserved: 8 },
      { status: "in_progress", capacity: 10, reserved: 10 },
      { status: "confirmed", capacity: 10, reserved: 11 },
      { status: "scheduled", capacity: 0, reserved: 0 },
      { status: "completed", capacity: 0, reserved: 0 },
      { status: "cancelled", capacity: 0, reserved: 0 },
    ];
    for (const [index, fixture] of fixtures.entries()) {
      const departure = randomUUID();
      await sql`INSERT INTO departures(id,tenant_id,tour_id,starts_on,ends_on,status,capacity) VALUES(${departure},${tenant},${tour},'2026-09-12','2026-09-12',${fixture.status},${fixture.capacity})`;
      if (fixture.reserved) {
        await sql`INSERT INTO bookings(id,tenant_id,departure_id,reference,customer_name,status,channel,total_minor,currency,travelers) VALUES(${randomUUID()},${tenant},${departure},${`CLASS-${index}`},'Class traveler','confirmed','direct',1,'USD',${fixture.reserved})`;
      }
      if (fixture.status !== "cancelled") {
        for (const status of ["pending", "cancelled"]) {
          await sql`INSERT INTO bookings(id,tenant_id,departure_id,reference,customer_name,status,channel,total_minor,currency,travelers) VALUES(${randomUUID()},${tenant},${departure},${`IGNORED-${index}-${status}`},'Ignored traveler',${status},'direct',1,'MNT',99)`;
        }
      }
    }
    await sql`INSERT INTO departures(id,tenant_id,tour_id,starts_on,ends_on,status,capacity) VALUES(${randomUUID()},${tenant},${tour},'2026-09-13','2026-09-13','scheduled',0)`;
    const result = await getDashboard(secret, tenant, filter, sql);
    expect(result.departureSummary).toEqual({
      onTrack: 1,
      lowCapacity: 2,
      atRisk: 2,
      completed: 1,
    });
    expect(
      Object.values(result.departureSummary).reduce(
        (sum, count) => sum + count,
        0,
      ),
    ).toBe(6);
  });
});
