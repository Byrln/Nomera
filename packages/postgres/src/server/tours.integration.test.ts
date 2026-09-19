import { createHash, randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import postgres from "postgres";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { getTourCatalog, getTourDetail, mutateTour } from "./tours";

const url = process.env.TEST_DATABASE_URL;
const tenant = randomUUID(),
  other = randomUUID(),
  user = randomUUID(),
  secret = randomUUID();
const schema = `tours_test_${randomUUID().replaceAll("-", "")}`;
const legacyTour = randomUUID(),
  legacyDeparture = randomUUID();
let sql: ReturnType<typeof postgres>, control: ReturnType<typeof postgres>;
const data = {
  code: "GOBI",
  title: "Gobi",
  destination: "Gobi",
  category: "Adventure",
  durationDays: 1,
  description: "Desert journey",
  basePriceMinor: 100,
  currency: "MNT",
  itinerary: [{ day: 1, title: "Arrival", description: "Arrive" }],
  media: [],
};
describe.skipIf(!url)("tour PostgreSQL mutations", () => {
  beforeAll(async () => {
    if (
      !["localhost", "127.0.0.1", "[::1]"].includes(new URL(url ?? "").hostname)
    )
      throw new Error("Local PostgreSQL required.");
    control = postgres(url ?? "", { max: 1, onnotice: () => {} });
    await control.unsafe(`CREATE SCHEMA ${schema}`);
    sql = postgres(url ?? "", {
      max: 4,
      connection: { search_path: schema },
      onnotice: () => {},
    });
    for (const name of [
      "0001_foundation.sql",
      "0002_dashboard.sql",
      "0003_tours_departures.sql",
    ]) {
      await sql.unsafe(
        await readFile(
          new URL(`../../../../db/migrations/${name}`, import.meta.url),
          "utf8",
        ),
      );
      if (name === "0002_dashboard.sql") {
        await sql`INSERT INTO organizations(id,name) VALUES (${other},'Other')`;
        await sql`INSERT INTO tours(id,tenant_id,title) VALUES (${legacyTour},${other},'Legacy title')`;
        await sql`INSERT INTO departures(id,tenant_id,tour_id,starts_on,ends_on,status,capacity) VALUES (${legacyDeparture},${other},${legacyTour},'2026-10-01','2026-10-02','confirmed',10)`;
        await sql`INSERT INTO bookings(id,tenant_id,departure_id,reference,customer_name,status,channel,total_minor,currency,travelers) VALUES (${randomUUID()},${other},${legacyDeparture},'LEGACY','Guest','confirmed','direct',900,'USD',3)`;
      }
    }
    await sql`INSERT INTO organizations(id,name) VALUES (${tenant},'Operator')`;
    await sql`INSERT INTO users(id,email,password_hash,email_verified) VALUES (${user},${`${user}@example.test`},'unusable',true)`;
    await sql`INSERT INTO memberships(id,tenant_id,user_id,role) VALUES (${randomUUID()},${tenant},${user},'owner')`;
    await sql`INSERT INTO sessions(id,user_id,token_digest,expires_at) VALUES (${randomUUID()},${user},${createHash("sha256").update(secret).digest("hex")},now()+interval '1 day')`;
  });
  afterAll(async () => {
    if (sql) await sql.end();
    if (control) {
      await control.unsafe(`DROP SCHEMA IF EXISTS ${schema} CASCADE`);
      await control.end();
    }
  });
  it("preserves existing dashboard records and composite tenant ownership during migration", async () => {
    const [row] =
      await sql`SELECT t.title,t.status,t.code,d.capacity,b.total_minor::text,b.currency,b.travelers FROM tours t JOIN departures d ON d.tour_id=t.id JOIN bookings b ON b.departure_id=d.id WHERE t.id=${legacyTour}`;
    expect(row).toMatchObject({
      title: "Legacy title",
      status: "draft",
      code: legacyTour,
      capacity: 10,
      total_minor: "900",
      currency: "USD",
      travelers: 3,
    });
    await expect(
      getTourDetail(secret, tenant, legacyTour, sql),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(
      sql`INSERT INTO departures(id,tenant_id,tour_id,starts_on,ends_on,status,capacity) VALUES (${randomUUID()},${tenant},${legacyTour},'2026-10-01','2026-10-02','scheduled',2)`,
    ).rejects.toMatchObject({ code: "23503" });
    const catalog = await getTourCatalog(secret, tenant, {}, sql);
    expect(catalog.items).toEqual([]);
    expect(catalog.total).toBe(0);
    expect(catalog.facets.destinations).toEqual([]);
  });
  it("atomically persists draft, immutable publication, audit and operation replay", async () => {
    const operationId = randomUUID();
    const tour = await mutateTour(
      secret,
      tenant,
      { type: "create", operationId, data },
      sql,
    );
    expect(tour).toMatchObject({
      status: "draft",
      version: 1,
      data: { title: "Gobi" },
    });
    const replay = await mutateTour(
      secret,
      tenant,
      { type: "create", operationId, data },
      sql,
    );
    expect(replay.id).toBe(tour.id);
    await expect(
      mutateTour(
        secret,
        tenant,
        { type: "create", operationId, data: { ...data, title: "Different" } },
        sql,
      ),
    ).rejects.toMatchObject({ code: "CONFLICT" });
    const published = await mutateTour(
      secret,
      tenant,
      {
        type: "publish",
        operationId: randomUUID(),
        tourId: tour.id,
        version: 1,
      },
      sql,
    );
    expect(published.published?.data.title).toBe("Gobi");
    await expect(
      sql`UPDATE tour_publications SET data='{}' WHERE tenant_id=${tenant} AND tour_id=${tour.id}`,
    ).rejects.toMatchObject({ code: "23514" });
    const edited = await mutateTour(
      secret,
      tenant,
      {
        type: "update",
        operationId: randomUUID(),
        tourId: tour.id,
        version: 2,
        data: { ...data, title: "New draft" },
      },
      sql,
    );
    expect(edited.data.title).toBe("New draft");
    expect(edited.published?.data.title).toBe("Gobi");
    await expect(
      mutateTour(
        secret,
        tenant,
        {
          type: "archive",
          operationId: randomUUID(),
          tourId: tour.id,
          version: 2,
        },
        sql,
      ),
    ).rejects.toMatchObject({ code: "CONFLICT" });
    const [audit] =
      await sql`SELECT count(*)::int AS count FROM audit_logs WHERE resource_id=${tour.id}`;
    expect(audit?.count).toBe(3);
    const catalog = await getTourCatalog(
      secret,
      tenant,
      { search: "New", pageSize: 1 },
      sql,
    );
    expect(catalog.total).toBe(1);
    expect(catalog.items[0]?.id).toBe(tour.id);
    expect(catalog.counts.published).toBe(1);
    await expect(
      getTourDetail(secret, other, tour.id, sql),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
  it("serializes concurrent changes and preserves capacity and terminal states", async () => {
    const tour = await mutateTour(
      secret,
      tenant,
      {
        type: "create",
        operationId: randomUUID(),
        data: { ...data, code: "CAPACITY" },
      },
      sql,
    );
    const departure = {
      startsOn: "2026-10-10",
      endsOn: "2026-10-11",
      status: "scheduled",
      capacity: 10,
      priceMinor: 100,
      currency: "MNT",
    };
    const withDeparture = await mutateTour(
      secret,
      tenant,
      {
        type: "saveDeparture",
        operationId: randomUUID(),
        tourId: tour.id,
        version: 1,
        departure,
      },
      sql,
    );
    const dep = withDeparture.departures[0];
    expect(dep).toBeDefined();
    await sql`INSERT INTO bookings(id,tenant_id,departure_id,reference,customer_name,status,channel,total_minor,currency,travelers) VALUES (${randomUUID()},${tenant},${dep?.id ?? ""},'CAP','Guest','confirmed','direct',500,'MNT',5)`;
    await expect(
      mutateTour(
        secret,
        tenant,
        {
          type: "saveDeparture",
          operationId: randomUUID(),
          tourId: tour.id,
          version: 2,
          departure: { ...departure, id: dep?.id, version: 1, capacity: 4 },
        },
        sql,
      ),
    ).rejects.toMatchObject({ code: "CONFLICT" });
    const results = await Promise.allSettled(
      ["One", "Two"].map((title) =>
        mutateTour(
          secret,
          tenant,
          {
            type: "update",
            operationId: randomUUID(),
            tourId: tour.id,
            version: 2,
            data: { ...data, code: "CAPACITY", title },
          },
          sql,
        ),
      ),
    );
    expect(
      results.filter((result) => result.status === "fulfilled"),
    ).toHaveLength(1);
    expect(
      results.filter((result) => result.status === "rejected"),
    ).toHaveLength(1);
    expect(
      (await getTourDetail(secret, tenant, tour.id, sql)).departures[0]
        ?.reserved,
    ).toBe(5);
  });
  it("enforces capacity at the database boundary for concurrent booking writers", async () => {
    const tour = await mutateTour(
      secret,
      tenant,
      {
        type: "create",
        operationId: randomUUID(),
        data: { ...data, code: "DB-CAP" },
      },
      sql,
    );
    const result = await mutateTour(
      secret,
      tenant,
      {
        type: "saveDeparture",
        operationId: randomUUID(),
        tourId: tour.id,
        version: 1,
        departure: {
          startsOn: "2026-10-10",
          endsOn: "2026-10-11",
          status: "scheduled",
          capacity: 2,
          priceMinor: 100,
          currency: "MNT",
        },
      },
      sql,
    );
    const departureId = result.departures[0]?.id ?? "";
    const results = await Promise.allSettled(
      ["A", "B"].map(
        (reference) =>
          sql`INSERT INTO bookings(id,tenant_id,departure_id,reference,customer_name,status,channel,total_minor,currency,travelers) VALUES (${randomUUID()},${tenant},${departureId},${reference},'Guest','confirmed','direct',200,'MNT',2)`,
      ),
    );
    expect(
      results.filter((result) => result.status === "fulfilled"),
    ).toHaveLength(1);
    await expect(
      sql`UPDATE departures SET capacity=1 WHERE id=${departureId}`,
    ).rejects.toMatchObject({ code: "23514" });
  });
  it("denies write escalation, foreign resources and unsafe cancellation without audit effects", async () => {
    const tour = await mutateTour(
      secret,
      tenant,
      {
        type: "create",
        operationId: randomUUID(),
        data: { ...data, code: "ROLES" },
      },
      sql,
    );
    await sql`UPDATE memberships SET role='viewer' WHERE tenant_id=${tenant} AND user_id=${user}`;
    expect((await getTourDetail(secret, tenant, tour.id, sql)).id).toBe(
      tour.id,
    );
    await expect(
      mutateTour(
        secret,
        tenant,
        {
          type: "archive",
          operationId: randomUUID(),
          tourId: tour.id,
          version: 1,
        },
        sql,
      ),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    await sql`UPDATE memberships SET role='operations' WHERE tenant_id=${tenant} AND user_id=${user}`;
    await expect(
      mutateTour(
        secret,
        tenant,
        {
          type: "publish",
          operationId: randomUUID(),
          tourId: tour.id,
          version: 1,
        },
        sql,
      ),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    await sql`UPDATE memberships SET role='owner' WHERE tenant_id=${tenant} AND user_id=${user}`;
    await expect(
      getTourDetail(secret, tenant, randomUUID(), sql),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(
      mutateTour(
        secret,
        tenant,
        {
          type: "update",
          operationId: randomUUID(),
          tourId: tour.id,
          version: 1,
          data: {
            ...data,
            code: "ROLES",
            media: [{ url: "http://example.test/a.png", alt: "A" }],
          },
        },
        sql,
      ),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
    const archived = await mutateTour(
      secret,
      tenant,
      {
        type: "archive",
        operationId: randomUUID(),
        tourId: tour.id,
        version: 1,
      },
      sql,
    );
    expect(archived.status).toBe("archived");
    await expect(
      mutateTour(
        secret,
        tenant,
        {
          type: "publish",
          operationId: randomUUID(),
          tourId: tour.id,
          version: 2,
        },
        sql,
      ),
    ).rejects.toMatchObject({ code: "CONFLICT" });
    const [audit] =
      await sql`SELECT count(*)::int count FROM audit_logs WHERE resource_id=${tour.id}`;
    expect(audit?.count).toBe(2);
  });
  it("returns tenant-scoped media, next departure, booking performance and completeness", async () => {
    const before = await getTourCatalog(secret, tenant, {}, sql);
    const media = [
      { url: "https://example.test/tour.jpg", alt: "Tour landscape" },
    ];
    const tour = await mutateTour(
      secret,
      tenant,
      {
        type: "create",
        operationId: randomUUID(),
        data: {
          ...data,
          code: "CATALOG-SUMMARY",
          category: "Catalog category",
          media,
        },
      },
      sql,
    );
    const departure = randomUUID();
    await sql`INSERT INTO departures(id,tenant_id,tour_id,starts_on,ends_on,status,capacity) VALUES(${departure},${tenant},${tour.id},'2099-01-02','2099-01-03','confirmed',20)`;
    for (const [status, currency, amount, travelers] of [
      ["confirmed", "MNT", 500, 2],
      ["completed", "USD", 700, 3],
      ["cancelled", "MNT", 999, 4],
    ] as const) {
      const id = randomUUID();
      await sql`INSERT INTO bookings(id,tenant_id,departure_id,reference,customer_name,status,channel,total_minor,currency,travelers) VALUES(${id},${tenant},${departure},${id},'Catalog guest',${status},'direct',${amount},${currency},${travelers})`;
    }
    const catalog = await getTourCatalog(
      secret,
      tenant,
      { search: "CATALOG-SUMMARY" },
      sql,
    );
    expect(catalog.total).toBe(1);
    expect(catalog.items[0]).toMatchObject({
      media,
      nextDeparture: "2099-01-02",
      confirmedBookings: 2,
      confirmedTravelers: 5,
      revenueMinor: 500,
      departureCount: 1,
    });
    expect(catalog.summary.bookings).toBe(before.summary.bookings + 2);
    expect(catalog.summary.basic).toBe(before.summary.basic + 1);
    expect(catalog.summary.itinerary).toBe(before.summary.itinerary + 1);
    expect(catalog.summary.media).toBe(before.summary.media + 1);
    expect(catalog.summary.pricing).toBe(before.summary.pricing + 1);
    expect(catalog.items.some((row) => row.id === legacyTour)).toBe(false);
  });
  it("rolls back the complete mutation when audit persistence fails", async () => {
    await sql.unsafe(
      "CREATE FUNCTION reject_test_audit() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'test audit failure'; END; $$",
    );
    await sql.unsafe(
      "CREATE TRIGGER reject_test_audit BEFORE INSERT ON audit_logs FOR EACH ROW EXECUTE FUNCTION reject_test_audit()",
    );
    try {
      await expect(
        mutateTour(
          secret,
          tenant,
          {
            type: "create",
            operationId: randomUUID(),
            data: { ...data, code: "ROLLBACK" },
          },
          sql,
        ),
      ).rejects.toMatchObject({ code: "UNAVAILABLE" });
      const [row] =
        await sql`SELECT count(*)::int count FROM tours WHERE code='ROLLBACK'`;
      expect(row?.count).toBe(0);
    } finally {
      await sql.unsafe("DROP TRIGGER reject_test_audit ON audit_logs");
      await sql.unsafe("DROP FUNCTION reject_test_audit()");
    }
  });
});
