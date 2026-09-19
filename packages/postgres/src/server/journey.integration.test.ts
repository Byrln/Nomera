import { createHash, randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import postgres from "postgres";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { getJourney, getTravelerJourney, saveJourney } from "./journey";
import { createGuestBooking } from "./operations";
import { getStorefrontAdmin, mutateStorefront } from "./storefront";
import { mutateTour } from "./tours";

const url = process.env.TEST_DATABASE_URL;
const schema = `journey_test_${randomUUID().replaceAll("-", "")}`;
const tenant = randomUUID(),
  other = randomUUID(),
  user = randomUUID(),
  secret = randomUUID();
let sql: ReturnType<typeof postgres>,
  control: ReturnType<typeof postgres>,
  departure: string,
  token: string;
describe.skipIf(!url)("journey PostgreSQL authorization", () => {
  beforeAll(async () => {
    if (
      !["localhost", "127.0.0.1", "[::1]"].includes(new URL(url ?? "").hostname)
    )
      throw new Error("Local database required");
    control = postgres(url ?? "", { max: 1, onnotice: () => {} });
    await control.unsafe(`CREATE SCHEMA ${schema}`);
    sql = postgres(url ?? "", {
      max: 4,
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
    await sql`INSERT INTO organizations(id,name) VALUES(${tenant},'Journey operator'),(${other},'Other operator')`;
    await sql`INSERT INTO users(id,email,password_hash,email_verified) VALUES(${user},${`${user}@example.test`},'unusable',true)`;
    await sql`INSERT INTO memberships(id,tenant_id,user_id,role) VALUES(${randomUUID()},${tenant},${user},'owner')`;
    await sql`INSERT INTO sessions(id,user_id,token_digest,expires_at) VALUES(${randomUUID()},${user},${createHash("sha256").update(secret).digest("hex")},now()+interval '1 day')`;
    let tour = await mutateTour(
      secret,
      tenant,
      {
        type: "create",
        operationId: randomUUID(),
        data: {
          code: "JOURNEY",
          title: "Public trip",
          destination: "Gobi",
          category: "Nature",
          durationDays: 1,
          description: "Trip",
          basePriceMinor: 10000,
          currency: "USD",
          itinerary: [
            { day: 1, title: "Arrival", description: "Arrival in the Gobi" },
          ],
          media: [],
        },
      },
      sql,
    );
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
          capacity: 10,
          status: "scheduled",
          priceMinor: 10000,
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
          seo: { ...store.draft.seo, slug: "journey-operator" },
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
    token = (
      await createGuestBooking(
        "journey-operator",
        {
          operationId: randomUUID(),
          departureId: departure,
          customerName: "Guest",
          customerEmail: "guest@example.test",
          travelers: 1,
        },
        sql,
      )
    ).accessToken;
  });
  afterAll(async () => {
    if (sql) await sql.end();
    if (control) {
      await control.unsafe(`DROP SCHEMA ${schema} CASCADE`);
      await control.end();
    }
  });
  it("persists steps with optimistic concurrency and projects only visible traveler fields", async () => {
    const visible = {
      id: randomUUID(),
      type: "HOTEL_CHECKIN",
      title: "Camp arrival",
      scheduledAt: "",
      visible: true,
      required: true,
      status: "ready",
      travelerNotes: "Meet your guide",
      internalNotes: "PRIVATE VENDOR COST",
      details: {
        location: "Reception",
        contact: "",
        flightNumber: "",
        vehicle: "",
        accommodation: "Camp",
      },
      attachments: [],
    };
    const command = {
      departureId: departure,
      version: 0,
      steps: [
        visible,
        {
          ...visible,
          id: randomUUID(),
          visible: false,
          title: "HIDDEN INTERNAL STEP",
        },
      ],
    };
    const saved = await saveJourney(secret, tenant, command, sql);
    expect(saved.version).toBe(1);
    expect(saved.steps).toHaveLength(2);
    await expect(
      saveJourney(secret, tenant, command, sql),
    ).rejects.toMatchObject({ code: "CONFLICT" });
    const publicSteps = await getTravelerJourney(
      "journey-operator",
      token,
      sql,
    );
    expect(publicSteps).toHaveLength(1);
    expect(publicSteps[0]).toMatchObject({
      title: "Camp arrival",
      travelerNotes: "Meet your guide",
    });
    expect(JSON.stringify(publicSteps)).not.toContain("PRIVATE");
    expect(JSON.stringify(publicSteps)).not.toContain("HIDDEN");
    expect(publicSteps[0]).not.toHaveProperty("internalNotes");
  });
  it("rejects foreign tenant selection and unauthenticated traveler reads", async () => {
    await expect(
      getJourney(secret, other, departure, sql),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(
      saveJourney(
        secret,
        other,
        { departureId: departure, version: 1, steps: [] },
        sql,
      ),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(
      getJourney(secret, tenant, randomUUID(), sql),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(
      getTravelerJourney("journey-operator", "", sql),
    ).rejects.toMatchObject({ code: "UNAUTHENTICATED" });
    await sql`UPDATE booking_access_tokens SET revoked_at=now() WHERE tenant_id=${tenant}`;
    await expect(
      getTravelerJourney("journey-operator", token, sql),
    ).rejects.toMatchObject({ code: "UNAUTHENTICATED" });
  });
});
