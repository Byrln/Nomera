import { createHash, randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import postgres from "postgres";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { getAdminHeader, searchAdmin } from "./admin";

const url = process.env.TEST_DATABASE_URL;
const schema = `admin_test_${randomUUID().replaceAll("-", "")}`;
const tenant = randomUUID(),
  other = randomUUID(),
  empty = randomUUID();
const user = randomUUID(),
  session = randomUUID(),
  membership = randomUUID();
const secret = randomUUID();
const ownTour = randomUUID(),
  foreignTour = randomUUID(),
  literalTour = randomUUID();
const ownCustomer = randomUUID(),
  foreignCustomer = randomUUID();
const ownBooking = randomUUID(),
  foreignBooking = randomUUID();
const ownDeparture = randomUUID(),
  foreignDeparture = randomUUID();
let sql: ReturnType<typeof postgres>, control: ReturnType<typeof postgres>;

describe.skipIf(!url)("admin header and search tenant isolation", () => {
  beforeAll(async () => {
    if (
      !["localhost", "127.0.0.1", "[::1]"].includes(new URL(url ?? "").hostname)
    )
      throw new Error("Local DB required");
    control = postgres(url ?? "", { max: 1, onnotice: () => {} });
    await control.unsafe(`CREATE SCHEMA ${schema}`);
    sql = postgres(url ?? "", {
      max: 3,
      connection: { search_path: schema },
      onnotice: () => {},
    });
    for (const name of [
      "0001_foundation.sql",
      "0002_dashboard.sql",
      "0003_tours_departures.sql",
      "0004_operations.sql",
      "0005_finance.sql",
      "0006_storefront.sql",
      "0007_journey.sql",
    ]) {
      await sql.unsafe(
        await readFile(
          new URL(`../../../../db/migrations/${name}`, import.meta.url),
          "utf8",
        ),
      );
    }
    await sql`INSERT INTO organizations(id,name) VALUES(${tenant},'Search operator'),(${other},'Other operator'),(${empty},'Unpublished operator')`;
    await sql`INSERT INTO users(id,email,password_hash,email_verified) VALUES(${user},${`${user}@example.test`},'not-a-login-password',true)`;
    await sql`INSERT INTO memberships(id,tenant_id,user_id,role) VALUES(${membership},${tenant},${user},'owner'),(${randomUUID()},${empty},${user},'admin')`;
    await sql`INSERT INTO sessions(id,user_id,token_digest,expires_at) VALUES(${session},${user},${createHash("sha256").update(secret).digest("hex")},now()+interval '1 day')`;
    await sql`INSERT INTO tours(id,tenant_id,title,code,destination) VALUES(${ownTour},${tenant},'Aurora expedition','AURORA','Gobi'),(${foreignTour},${other},'Aurora foreign expedition','AURORA','Foreign'),(${literalTour},${tenant},'Literal %x and _x markers','LITERAL','Gobi')`;
    await sql`INSERT INTO customers(id,tenant_id,name,email) VALUES(${ownCustomer},${tenant},'Aurora customer','aurora@example.test'),(${foreignCustomer},${other},'Aurora foreign customer','foreign@example.test')`;
    await sql`INSERT INTO departures(id,tenant_id,tour_id,starts_on,ends_on,status,capacity) VALUES(${ownDeparture},${tenant},${ownTour},'2099-01-01','2099-01-01','scheduled',10),(${foreignDeparture},${other},${foreignTour},'2099-01-01','2099-01-01','scheduled',10)`;
    for (const fixture of [
      {
        id: ownBooking,
        tenant,
        departure: ownDeparture,
        customer: ownCustomer,
      },
      {
        id: foreignBooking,
        tenant: other,
        departure: foreignDeparture,
        customer: foreignCustomer,
      },
    ]) {
      await sql`INSERT INTO bookings(id,tenant_id,departure_id,customer_id,reference,customer_name,status,channel,total_minor,currency,travelers) VALUES(${fixture.id},${fixture.tenant},${fixture.departure},${fixture.customer},'AURORA-BOOK','Aurora traveler','pending','direct',100,'USD',1)`;
    }
    await sql`INSERT INTO bookings(id,tenant_id,departure_id,reference,customer_name,status,channel,total_minor,currency,travelers) VALUES(${randomUUID()},${tenant},${ownDeparture},'CONFIRMED','Other traveler','confirmed','direct',100,'USD',1)`;
  });
  afterAll(async () => {
    await sql?.end();
    if (control) {
      await control.unsafe(`DROP SCHEMA IF EXISTS ${schema} CASCADE`);
      await control.end();
    }
  });
  it("searches all three types case-insensitively and only within the authorized tenant", async () => {
    const rows = await searchAdmin(secret, tenant, "  aUrOrA  ", sql);
    expect(rows).toHaveLength(3);
    expect(rows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: ownTour,
          kind: "tour",
          href: `/tours/${ownTour}`,
        }),
        expect.objectContaining({
          id: ownCustomer,
          kind: "customer",
          href: `/customers/${ownCustomer}`,
        }),
        expect.objectContaining({
          id: ownBooking,
          kind: "booking",
          href: "/bookings?search=AURORA-BOOK",
        }),
      ]),
    );
    expect(
      rows.some((row) =>
        ([foreignTour, foreignCustomer, foreignBooking] as string[]).includes(
          row.id,
        ),
      ),
    ).toBe(false);
    expect(await searchAdmin(secret, empty, "Aurora", sql)).toEqual([]);
  });
  it("treats SQL wildcard characters literally instead of broadening the search", async () => {
    for (const query of ["%x", "_x"]) {
      expect(
        (await searchAdmin(secret, tenant, query, sql)).map((row) => row.id),
      ).toEqual([literalTour]);
    }
    expect(await searchAdmin(secret, tenant, "%_", sql)).toEqual([]);
    expect(await searchAdmin(secret, tenant, "' OR 1=1 --", sql)).toEqual([]);
    expect(await searchAdmin(secret, tenant, " a ", sql)).toEqual([]);
  });
  it("limits each type independently and escapes booking references in navigation URLs", async () => {
    for (let index = 0; index < 8; index++) {
      await sql`INSERT INTO customers(id,tenant_id,name) VALUES(${randomUUID()},${tenant},${`Limit customer ${index}`})`;
    }
    expect(
      await searchAdmin(secret, tenant, "Limit customer", sql),
    ).toHaveLength(5);
    const id = randomUUID();
    await sql`INSERT INTO bookings(id,tenant_id,departure_id,reference,customer_name,status,channel,total_minor,currency,travelers) VALUES(${id},${tenant},${ownDeparture},'SPECIAL & / ?','Special traveler','cancelled','direct',100,'USD',1)`;
    expect(await searchAdmin(secret, tenant, "SPECIAL", sql)).toEqual([
      expect.objectContaining({
        id,
        href: "/bookings?search=SPECIAL%20%26%20%2F%20%3F",
      }),
    ]);
  });
  it("reads current user and tenant pending count without counting confirmed or foreign bookings", async () => {
    expect(await getAdminHeader(secret, tenant, sql)).toEqual({
      email: `${user}@example.test`,
      pending: 1,
      slug: null,
    });
    expect(await getAdminHeader(secret, empty, sql)).toEqual({
      email: `${user}@example.test`,
      pending: 0,
      slug: null,
    });
  });
  it("returns only a due uncancelled publication slug from the selected tenant", async () => {
    await sql`INSERT INTO storefront_routes(slug,tenant_id) VALUES('future-only',${empty}),('older-live',${tenant}),('current-live',${tenant}),('future-live',${tenant}),('cancelled-live',${tenant}),('foreign-live',${other})`;
    await sql`INSERT INTO storefront_publications(tenant_id,version,slug,data,effective_at) VALUES(${empty},1,'future-only','{}',now()+interval '1 day'),(${other},1,'foreign-live','{}',now()-interval '1 day')`;
    expect((await getAdminHeader(secret, empty, sql)).slug).toBeNull();
    await sql`INSERT INTO storefront_publications(tenant_id,version,slug,data,effective_at,cancelled_at) VALUES(${tenant},1,'older-live','{}',now()-interval '2 days',NULL),(${tenant},2,'current-live','{}',now()-interval '1 day',NULL),(${tenant},3,'future-live','{}',now()+interval '1 day',NULL),(${tenant},4,'cancelled-live','{}',now()-interval '1 hour',now())`;
    expect((await getAdminHeader(secret, tenant, sql)).slug).toBe(
      "current-live",
    );
  });
  it("rejects absent and inactive membership for both reads, including short search text", async () => {
    await expect(
      searchAdmin(secret, other, "Aurora", sql),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(getAdminHeader(secret, other, sql)).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
    await sql`UPDATE memberships SET active=false WHERE id=${membership}`;
    try {
      await expect(searchAdmin(secret, tenant, "a", sql)).rejects.toMatchObject(
        { code: "FORBIDDEN" },
      );
      await expect(getAdminHeader(secret, tenant, sql)).rejects.toMatchObject({
        code: "FORBIDDEN",
      });
    } finally {
      await sql`UPDATE memberships SET active=true WHERE id=${membership}`;
    }
  });
  it("rejects revoked sessions on both read paths", async () => {
    await sql`UPDATE sessions SET revoked_at=now() WHERE id=${session}`;
    try {
      await expect(
        searchAdmin(secret, tenant, "Aurora", sql),
      ).rejects.toMatchObject({ code: "UNAUTHENTICATED" });
      await expect(getAdminHeader(secret, tenant, sql)).rejects.toMatchObject({
        code: "UNAUTHENTICATED",
      });
    } finally {
      await sql`UPDATE sessions SET revoked_at=NULL WHERE id=${session}`;
    }
  });
});
