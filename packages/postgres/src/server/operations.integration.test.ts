import { createHash, randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import postgres from "postgres";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  createGuestBooking,
  getCustomerDetail,
  getOperations,
  getTravelerBooking,
  mutateOperations,
} from "./operations";
import { getStorefrontAdmin, mutateStorefront } from "./storefront";
import { mutateTour } from "./tours";

const url = process.env.TEST_DATABASE_URL,
  schema = `operations_test_${randomUUID().replaceAll("-", "")}`;
const tenant = randomUUID(),
  other = randomUUID(),
  user = randomUUID(),
  secret = randomUUID();
let sql: ReturnType<typeof postgres>,
  control: ReturnType<typeof postgres>,
  customer: string,
  departure: string,
  tourId: string;
const command = (value: Record<string, unknown>) =>
  mutateOperations(
    secret,
    tenant,
    { operationId: randomUUID(), ...value },
    sql,
  );
describe.skipIf(!url)("operations SQL security and checkout", () => {
  beforeAll(async () => {
    if (
      !["localhost", "127.0.0.1", "[::1]"].includes(new URL(url ?? "").hostname)
    )
      throw new Error("Local DB required");
    control = postgres(url ?? "", { max: 1, onnotice: () => {} });
    await control.unsafe(`CREATE SCHEMA ${schema}`);
    sql = postgres(url ?? "", {
      max: 5,
      connection: { search_path: schema },
      onnotice: () => {},
    });
    for (const file of [
      "0001_foundation.sql",
      "0002_dashboard.sql",
      "0003_tours_departures.sql",
      "0004_operations.sql",
      "0005_finance.sql",
      "0006_storefront.sql",
      "0007_journey.sql",
    ])
      await sql.unsafe(
        await readFile(
          new URL(`../../../../db/migrations/${file}`, import.meta.url),
          "utf8",
        ),
      );
    await sql`INSERT INTO organizations(id,name) VALUES(${tenant},'QA Operator'),(${other},'Other')`;
    await sql`INSERT INTO users(id,email,password_hash,email_verified) VALUES(${user},${`${user}@example.test`},'unusable',true)`;
    await sql`INSERT INTO memberships(id,tenant_id,user_id,role) VALUES(${randomUUID()},${tenant},${user},'owner')`;
    await sql`INSERT INTO sessions(id,user_id,token_digest,expires_at) VALUES(${randomUUID()},${user},${createHash("sha256").update(secret).digest("hex")},now()+interval '1 day')`;
    const data = {
      code: "TEST",
      title: "Published tour",
      destination: "Gobi",
      category: "Nature",
      durationDays: 1,
      description: "Trip",
      basePriceMinor: 12345,
      currency: "USD",
      itinerary: [{ day: 1, title: "Day", description: "Walk" }],
      media: [],
    };
    let tour = await mutateTour(
      secret,
      tenant,
      { type: "create", operationId: randomUUID(), data },
      sql,
    );
    tourId = tour.id;
    tour = await mutateTour(
      secret,
      tenant,
      {
        type: "saveDeparture",
        operationId: randomUUID(),
        tourId: tour.id,
        version: tour.version,
        departure: {
          startsOn: "2099-01-01",
          endsOn: "2099-01-01",
          capacity: 3,
          status: "scheduled",
          priceMinor: 12345,
          currency: "USD",
        },
      },
      sql,
    );
    departure = tour.departures[0]?.id ?? "";
    await mutateTour(
      secret,
      tenant,
      {
        type: "publish",
        operationId: randomUUID(),
        tourId: tour.id,
        version: tour.version,
      },
      sql,
    );
    let store = await getStorefrontAdmin(secret, tenant, sql);
    store = await mutateStorefront(
      secret,
      tenant,
      {
        type: "save",
        version: store.version,
        data: {
          ...store.draft,
          seo: { ...store.draft.seo, slug: "qa-operator" },
        },
      },
      sql,
    );
    await mutateStorefront(
      secret,
      tenant,
      { type: "publish", version: store.version },
      sql,
    );
  });
  afterAll(async () => {
    if (sql) await sql.end();
    if (control) {
      await control.unsafe(`DROP SCHEMA ${schema} CASCADE`);
      await control.end();
    }
  });
  it("isolates customers and idempotent mutations", async () => {
    const input = {
      type: "customer",
      operationId: randomUUID(),
      data: {
        name: "Customer",
        email: "customer@example.test",
        phone: "",
        country: "",
      },
    };
    const result = await mutateOperations(secret, tenant, input, sql);
    customer = result.id;
    expect(await mutateOperations(secret, tenant, input, sql)).toEqual(result);
    await expect(
      mutateOperations(
        secret,
        tenant,
        { ...input, data: { ...input.data, name: "Other" } },
        sql,
      ),
    ).rejects.toMatchObject({ code: "CONFLICT" });
    await expect(getOperations(secret, other, sql)).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
    const foreign = randomUUID();
    await sql`INSERT INTO customers(id,tenant_id,name) VALUES(${foreign},${other},'Foreign')`;
    await expect(
      getCustomerDetail(secret, tenant, foreign, sql),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(
      command({
        type: "booking",
        customerId: foreign,
        departureId: departure,
        travelers: 1,
      }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
  it("persists notes and interactions without requiring a document URL", async () => {
    for (const kind of ["note", "interaction"]) {
      const saved = await command({
        type: "activity",
        kind,
        customerId: customer,
        body: `Local ${kind}`,
        url: "",
      });
      expect(
        (await getCustomerDetail(secret, tenant, customer, sql)).activities,
      ).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: saved.id,
            kind,
            body: `Local ${kind}`,
            url: "",
          }),
        ]),
      );
    }
    await expect(
      command({
        type: "activity",
        kind: "document",
        customerId: customer,
        body: "Missing reference",
        url: "",
      }),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
  });
  it("creates server-priced quotes and bookings, rejects total injection and stale status", async () => {
    const inquiry = await command({
      type: "inquiry",
      customerId: customer,
      title: "Trip inquiry",
      notes: "internal secret",
    });
    await command({
      type: "quote",
      inquiryId: inquiry.id,
      departureId: departure,
      travelers: 2,
    });
    expect(
      (await getCustomerDetail(secret, tenant, customer, sql)).quotes[0]
        ?.totalMinor,
    ).toBe(24690);
    await command({
      type: "quote",
      inquiryId: inquiry.id,
      departureId: departure,
      travelers: 1,
    });
    expect(
      (await getOperations(secret, tenant, sql)).inquiries.find(
        (row) => row.id === inquiry.id,
      ),
    ).toMatchObject({ quoteValue: 12345, quoteCurrency: "USD" });
    await expect(
      command({
        type: "booking",
        customerId: customer,
        departureId: departure,
        travelers: 1,
        totalMinor: 1,
      }),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
    const booking = await command({
      type: "booking",
      customerId: customer,
      departureId: departure,
      travelers: 2,
      inquiryId: inquiry.id,
    });
    await command({
      type: "bookingStatus",
      id: booking.id,
      version: 1,
      status: "confirmed",
    });
    await expect(
      command({
        type: "bookingStatus",
        id: booking.id,
        version: 1,
        status: "cancelled",
      }),
    ).rejects.toMatchObject({ code: "CONFLICT" });
    expect(
      (await getOperations(secret, tenant, sql)).inquiries.find(
        (i) => i.id === inquiry.id,
      )?.stage,
    ).toBe("won");
  });
  it("serializes competing confirmations against remaining capacity", async () => {
    const first = await command({
      type: "booking",
      customerId: customer,
      departureId: departure,
      travelers: 1,
    });
    const second = await command({
      type: "booking",
      customerId: customer,
      departureId: departure,
      travelers: 1,
    });
    const results = await Promise.allSettled(
      [first, second].map((b) =>
        command({
          type: "bookingStatus",
          id: b.id,
          version: 1,
          status: "confirmed",
        }),
      ),
    );
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    const confirmed = results[0]?.status === "fulfilled" ? first : second;
    await command({
      type: "bookingStatus",
      id: confirmed.id,
      version: 2,
      status: "cancelled",
    });
  });
  it("issues booking-scoped hashed access and exposes only public snapshots", async () => {
    const input = {
      operationId: randomUUID(),
      departureId: departure,
      customerName: "Traveler",
      customerEmail: "traveler@example.test",
      customerPhone: "",
      travelers: 1,
      promotionCode: "",
    };
    const booked = await createGuestBooking("qa-operator", input, sql);
    expect(booked.totalMinor).toBe(12345);
    expect(booked.status).toBe("pending");
    const replay = await createGuestBooking("qa-operator", input, sql);
    expect(replay.id).toBe(booked.id);
    expect(replay.accessToken).not.toBe(booked.accessToken);
    const [stored] =
      await sql`SELECT token_digest FROM booking_access_tokens WHERE booking_id=${booked.id}`;
    expect(stored?.token_digest).not.toBe(booked.accessToken);
    await sql`UPDATE tours SET title='INTERNAL DRAFT' WHERE tenant_id=${tenant} AND id=${tourId}`;
    const view = await getTravelerBooking(
      "qa-operator",
      booked.accessToken,
      sql,
    );
    expect(view.tour.title).toBe("Published tour");
    expect(JSON.stringify(view)).not.toContain("internal secret");
    expect(view).not.toHaveProperty("customerEmail");
    await expect(
      getTravelerBooking("unknown-operator", booked.accessToken, sql),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(
      getTravelerBooking("qa-operator", randomUUID(), sql),
    ).rejects.toMatchObject({ code: "UNAUTHENTICATED" });
    await sql`UPDATE booking_access_tokens SET revoked_at=now() WHERE token_digest=${createHash("sha256").update(booked.accessToken).digest("hex")}`;
    await expect(
      getTravelerBooking("qa-operator", booked.accessToken, sql),
    ).rejects.toMatchObject({ code: "UNAUTHENTICATED" });
    await sql`UPDATE booking_access_tokens SET expires_at=now()-interval '1 second' WHERE token_digest=${createHash("sha256").update(replay.accessToken).digest("hex")}`;
    await expect(
      getTravelerBooking("qa-operator", replay.accessToken, sql),
    ).rejects.toMatchObject({ code: "UNAUTHENTICATED" });
  });
  it("rejects unpublished and foreign departures for guest bookings", async () => {
    const unpublished = await mutateTour(
      secret,
      tenant,
      {
        type: "create",
        operationId: randomUUID(),
        data: {
          code: "DRAFT",
          title: "Draft",
          destination: "Gobi",
          category: "Nature",
          durationDays: 1,
          description: "Draft",
          basePriceMinor: 100,
          currency: "USD",
          itinerary: [],
          media: [],
        },
      },
      sql,
    );
    const result = await mutateTour(
      secret,
      tenant,
      {
        type: "saveDeparture",
        operationId: randomUUID(),
        tourId: unpublished.id,
        version: unpublished.version,
        departure: {
          startsOn: "2099-01-01",
          endsOn: "2099-01-01",
          capacity: 10,
          status: "scheduled",
          priceMinor: 100,
          currency: "USD",
        },
      },
      sql,
    );
    await expect(
      createGuestBooking(
        "qa-operator",
        {
          operationId: randomUUID(),
          departureId: result.departures[0]?.id,
          customerName: "Guest",
          customerEmail: "guest@example.test",
          travelers: 1,
        },
        sql,
      ),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});
