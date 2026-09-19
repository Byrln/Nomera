import { createHash, randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { defaultStorefront } from "@nomera/schemas/storefront";
import postgres from "postgres";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  getPublishedStorefront,
  getStorefrontAdmin,
  mutateStorefront,
} from "./storefront";
import { mutateTour } from "./tours";

const url = process.env.TEST_DATABASE_URL;
const tenant = randomUUID(),
  other = randomUUID(),
  user = randomUUID(),
  secret = randomUUID();
const schema = `storefront_test_${randomUUID().replaceAll("-", "")}`;
let sql: ReturnType<typeof postgres>, control: ReturnType<typeof postgres>;
describe.skipIf(!url)("storefront publication isolation", () => {
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
      "0006_storefront.sql",
    ])
      await sql.unsafe(
        await readFile(
          new URL(`../../../../db/migrations/${name}`, import.meta.url),
          "utf8",
        ),
      );
    await sql`INSERT INTO organizations(id,name) VALUES(${tenant},'Operator'),(${other},'Other')`;
    await sql`INSERT INTO users(id,email,password_hash,email_verified) VALUES(${user},${`${user}@example.test`},'unused',true)`;
    await sql`INSERT INTO memberships(id,tenant_id,user_id,role) VALUES(${randomUUID()},${tenant},${user},'owner')`;
    await sql`INSERT INTO sessions(id,user_id,token_digest,expires_at) VALUES(${randomUUID()},${user},${createHash("sha256").update(secret).digest("hex")},now()+interval '1 day')`;
  });
  afterAll(async () => {
    if (sql) await sql.end();
    if (control) {
      await control.unsafe(`DROP SCHEMA IF EXISTS ${schema} CASCADE`);
      await control.end();
    }
  });
  it("never returns storefront or tour drafts and keeps restored versions private", async () => {
    const draft = defaultStorefront("Published name", tenant);
    draft.seo.slug = "test-operator";
    const saved = await mutateStorefront(
      secret,
      tenant,
      { type: "save", version: 0, data: draft },
      sql,
    );
    expect(await getPublishedStorefront(draft.seo.slug, sql)).toBeNull();
    const published = await mutateStorefront(
      secret,
      tenant,
      { type: "publish", version: saved.version },
      sql,
    );
    const edited = await mutateStorefront(
      secret,
      tenant,
      {
        type: "save",
        version: published.version,
        data: { ...draft, storeName: "PRIVATE DRAFT" },
      },
      sql,
    );
    expect(
      (await getPublishedStorefront(draft.seo.slug, sql))?.data.storeName,
    ).toBe("Published name");
    const data = {
      code: "PUBLISHED",
      title: "Tour snapshot",
      destination: "Gobi",
      category: "Adventure",
      durationDays: 1,
      description: "Journey",
      basePriceMinor: 100,
      currency: "MNT",
      itinerary: [{ day: 1, title: "Arrival", description: "Arrive" }],
      media: [],
    };
    const tour = await mutateTour(
      secret,
      tenant,
      { type: "create", operationId: randomUUID(), data },
      sql,
    );
    expect(
      (await getPublishedStorefront(draft.seo.slug, sql))?.tours,
    ).toHaveLength(0);
    const pub = await mutateTour(
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
    await mutateTour(
      secret,
      tenant,
      {
        type: "update",
        operationId: randomUUID(),
        tourId: tour.id,
        version: pub.version,
        data: { ...data, title: "PRIVATE TOUR DRAFT" },
      },
      sql,
    );
    expect(
      (await getPublishedStorefront(draft.seo.slug, sql))?.tours[0]?.data.title,
    ).toBe("Tour snapshot");
    const restored = await mutateStorefront(
      secret,
      tenant,
      {
        type: "restore",
        version: edited.version,
        sourceVersion: published.version,
      },
      sql,
    );
    expect(restored.draft.storeName).toBe("Published name");
    await expect(
      sql`UPDATE storefront_publications SET data='{}' WHERE tenant_id=${tenant}`,
    ).rejects.toMatchObject({ code: "23514" });
  });
  it("protects tenants, stale writes and future publication", async () => {
    await expect(getStorefrontAdmin(secret, other, sql)).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
    await expect(
      mutateStorefront(secret, tenant, { type: "publish", version: 0 }, sql),
    ).rejects.toMatchObject({ code: "CONFLICT" });
    const current = await getStorefrontAdmin(secret, tenant, sql);
    const saved = await mutateStorefront(
      secret,
      tenant,
      {
        type: "save",
        version: current.version,
        data: { ...current.draft, storeName: "Future version" },
      },
      sql,
    );
    const scheduled = await mutateStorefront(
      secret,
      tenant,
      {
        type: "publish",
        version: saved.version,
        scheduledAt: new Date(Date.now() + 3600000).toISOString(),
      },
      sql,
    );
    expect(scheduled.history[0]?.version).toBe(scheduled.version);
    expect(
      (await getPublishedStorefront(current.draft.seo.slug, sql))?.data
        .storeName,
    ).toBe("Published name");
    await expect(
      sql`INSERT INTO storefront_publications(tenant_id,version,slug,data,effective_at) VALUES(${other},1,${current.draft.seo.slug},${sql.json(current.draft)},now())`,
    ).rejects.toMatchObject({ code: "23503" });
  });
  it("activates scheduled snapshots by time without publishing later draft edits", async () => {
    const current = await getStorefrontAdmin(secret, tenant, sql);
    const scheduled = await mutateStorefront(
      secret,
      tenant,
      {
        type: "publish",
        version: current.version,
        scheduledAt: new Date(Date.now() + 1500).toISOString(),
      },
      sql,
    );
    await mutateStorefront(
      secret,
      tenant,
      {
        type: "save",
        version: scheduled.version,
        data: { ...scheduled.draft, storeName: "Later private draft" },
      },
      sql,
    );
    expect(
      (await getPublishedStorefront(current.draft.seo.slug, sql))?.data
        .storeName,
    ).toBe("Published name");
    await new Promise((resolve) => setTimeout(resolve, 1800));
    expect(
      (await getPublishedStorefront(current.draft.seo.slug, sql))?.data
        .storeName,
    ).toBe("Future version");
    expect(
      (await getStorefrontAdmin(secret, tenant, sql)).draft.storeName,
    ).toBe("Later private draft");
  });
  it("keeps historical slugs as aliases without allowing another tenant to claim them", async () => {
    const current = await getStorefrontAdmin(secret, tenant, sql);
    const saved = await mutateStorefront(
      secret,
      tenant,
      {
        type: "save",
        version: current.version,
        data: {
          ...current.draft,
          seo: { ...current.draft.seo, slug: "renamed-operator" },
        },
      },
      sql,
    );
    expect(await getPublishedStorefront("renamed-operator", sql)).toBeNull();
    await mutateStorefront(
      secret,
      tenant,
      { type: "publish", version: saved.version },
      sql,
    );
    const alias = await getPublishedStorefront("test-operator", sql);
    expect(alias).toMatchObject({
      tenantId: tenant,
      slug: "test-operator",
      data: { seo: { slug: "renamed-operator" } },
    });
    expect(
      (await getPublishedStorefront("renamed-operator", sql))?.tenantId,
    ).toBe(tenant);
    await sql`INSERT INTO memberships(id,tenant_id,user_id,role) VALUES(${randomUUID()},${other},${user},'owner')`;
    const otherDraft = defaultStorefront("Other operator", other);
    otherDraft.seo.slug = "test-operator";
    const otherSaved = await mutateStorefront(
      secret,
      other,
      { type: "save", version: 0, data: otherDraft },
      sql,
    );
    await expect(
      mutateStorefront(
        secret,
        other,
        { type: "publish", version: otherSaved.version },
        sql,
      ),
    ).rejects.toMatchObject({ code: "CONFLICT" });
    expect((await getPublishedStorefront("test-operator", sql))?.tenantId).toBe(
      tenant,
    );
  });
});
