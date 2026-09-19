import "server-only";
import { createHash, randomUUID } from "node:crypto";
import { DomainError, parseInput } from "@nomera/domain/errors";
import { authorizeStorefrontMutation } from "@nomera/domain/storefront";
import { assertCapability } from "@nomera/domain/tenancy";
import { resourceIdSchema } from "@nomera/schemas/security";
import {
  defaultStorefront,
  type PublicTour,
  type PublishedStorefront,
  publicTourSchema,
  type StorefrontAdmin,
  storefrontInputSchema,
  storefrontSlugSchema,
} from "@nomera/schemas/storefront";
import type { TransactionSql } from "postgres";
import { type DatabaseClient, getDatabase } from "../server";
import { databaseRead } from "./errors";
import { createTenantRepository } from "./tenant";

async function publishedTours(
  sql: DatabaseClient | TransactionSql,
  tenantId: string,
): Promise<PublicTour[]> {
  const rows = await sql<
    { id: string; data: unknown }[]
  >`SELECT t.id,p.data FROM tours t JOIN LATERAL (SELECT data FROM tour_publications p WHERE p.tenant_id=t.tenant_id AND p.tour_id=t.id ORDER BY version DESC LIMIT 1) p ON true WHERE t.tenant_id=${tenantId} AND t.status='published' ORDER BY t.id LIMIT 500`;
  const departures = await sql<
    {
      id: string;
      tour_id: string;
      starts_on: string;
      ends_on: string;
      price_minor: string;
      currency: string;
      available: number;
    }[]
  >`SELECT d.id,d.tour_id,to_char(d.starts_on,'YYYY-MM-DD') starts_on,to_char(d.ends_on,'YYYY-MM-DD') ends_on,d.price_minor::text,d.currency,greatest(0,d.capacity-(SELECT coalesce(sum(b.travelers),0) FROM bookings b WHERE b.tenant_id=d.tenant_id AND b.departure_id=d.id AND b.status IN ('confirmed','completed')))::integer available FROM departures d WHERE d.tenant_id=${tenantId} AND d.status IN ('scheduled','confirmed') AND d.starts_on>=(now() AT TIME ZONE 'Asia/Ulaanbaatar')::date ORDER BY d.starts_on,d.id`;
  return rows.map((row) =>
    publicTourSchema.parse({
      id: row.id,
      data: row.data,
      departures: departures
        .filter((d) => d.tour_id === row.id)
        .map((d) => ({
          id: d.id,
          startsOn: d.starts_on,
          endsOn: d.ends_on,
          priceMinor: Number(d.price_minor),
          currency: d.currency,
          available: d.available,
        })),
    }),
  );
}
// Only immutable publication snapshots are returned. Scheduled versions become live
// on the first read after effective_at; no worker or draft fallback is involved.
export async function getPublishedStorefront(
  slug: unknown,
  sql?: DatabaseClient | TransactionSql,
): Promise<PublishedStorefront | null> {
  const parsed = storefrontSlugSchema.safeParse(slug);
  if (!parsed.success) return null;
  return databaseRead(async () => {
    const db = sql ?? getDatabase();
    const [row] = await db<
      { tenant_id: string; version: number; slug: string; data: unknown }[]
    >`SELECT p.tenant_id,p.version,p.slug,p.data FROM storefront_routes r JOIN LATERAL (SELECT * FROM storefront_publications p WHERE p.tenant_id=r.tenant_id AND p.cancelled_at IS NULL AND p.effective_at<=now() ORDER BY p.effective_at DESC,p.version DESC LIMIT 1) p ON true WHERE r.slug=${parsed.data} AND EXISTS(SELECT 1 FROM storefront_publications prior WHERE prior.tenant_id=r.tenant_id AND prior.slug=r.slug AND prior.effective_at<=now() AND prior.cancelled_at IS NULL)`;
    if (!row) return null;
    return {
      tenantId: row.tenant_id,
      // Historical published routes stay scoped to their original tenant. Keep
      // the requested alias so traveler cookie paths and existing trip URLs work.
      slug: parsed.data,
      version: row.version,
      data: storefrontInputSchema.parse(row.data),
      tours: await publishedTours(db, row.tenant_id),
    };
  });
}
async function adminData(
  sql: DatabaseClient | TransactionSql,
  tenantId: string,
  name: string,
): Promise<StorefrontAdmin> {
  const [settings] = await sql<
    { version: number; draft: unknown }[]
  >`SELECT version,draft FROM storefront_settings WHERE tenant_id=${tenantId}`;
  const history = await sql<
    {
      version: number;
      slug: string;
      effective_at: Date;
      created_at: Date;
      cancelled_at: Date | null;
    }[]
  >`SELECT version,slug,effective_at,created_at,cancelled_at FROM storefront_publications WHERE tenant_id=${tenantId} ORDER BY version DESC LIMIT 100`;
  const [live] = await sql<
    { version: number; slug: string; effective_at: Date }[]
  >`SELECT version,slug,effective_at FROM storefront_publications WHERE tenant_id=${tenantId} AND cancelled_at IS NULL AND effective_at<=now() ORDER BY effective_at DESC,version DESC LIMIT 1`;
  return {
    tenantId,
    version: settings?.version ?? 0,
    draft: settings
      ? storefrontInputSchema.parse(settings.draft)
      : defaultStorefront(name, tenantId),
    published: live
      ? {
          version: live.version,
          slug: live.slug,
          effectiveAt: live.effective_at.toISOString(),
        }
      : null,
    history: history.map((p) => ({
      version: p.version,
      effectiveAt: p.effective_at.toISOString(),
      createdAt: p.created_at.toISOString(),
      cancelled: !!p.cancelled_at,
    })),
    tours: await publishedTours(sql, tenantId),
  };
}
export async function getStorefrontAdmin(
  secret: string,
  tenant: unknown,
  sql?: DatabaseClient,
): Promise<StorefrontAdmin> {
  return databaseRead(() =>
    (sql ?? getDatabase()).begin(
      "isolation level repeatable read read only",
      async (tx) => {
        const repo = await createTenantRepository(secret, tenant, tx);
        assertCapability(repo.context, "storefront:read");
        return adminData(
          tx,
          repo.context.tenantId,
          (await repo.getSummary()).name,
        );
      },
    ),
  );
}
export async function mutateStorefront(
  secret: string,
  tenant: unknown,
  input: unknown,
  sql?: DatabaseClient,
): Promise<StorefrontAdmin> {
  const tenantId = parseInput(resourceIdSchema, tenant);
  return databaseRead(() =>
    (sql ?? getDatabase()).begin(async (tx) => {
      await tx`SET LOCAL statement_timeout='10s'`;
      await tx`SELECT s.id FROM sessions s JOIN users u ON u.id=s.user_id JOIN memberships m ON m.user_id=u.id AND m.tenant_id=${tenantId} WHERE s.token_digest=${createHash("sha256").update(secret).digest("hex")} FOR SHARE OF s,u,m`;
      const repo = await createTenantRepository(secret, tenantId, tx);
      const command = authorizeStorefrontMutation(repo.context, input);
      const name = (await repo.getSummary()).name;
      await tx`INSERT INTO storefront_settings(tenant_id,draft) VALUES(${tenantId},${tx.json(defaultStorefront(name, tenantId))}) ON CONFLICT DO NOTHING`;
      const [current] = await tx<
        { version: number; draft: unknown }[]
      >`SELECT version,draft FROM storefront_settings WHERE tenant_id=${tenantId} FOR UPDATE`;
      if (!current || current.version !== command.version)
        throw new DomainError("CONFLICT");
      const nextVersion = current.version + 1;
      let draft = storefrontInputSchema.parse(current.draft);
      if (command.type === "save") {
        draft = command.data;
        if (draft.featuredTourIds.length) {
          const valid = await tx<
            { id: string }[]
          >`SELECT id FROM tours WHERE tenant_id=${tenantId} AND id IN ${tx(draft.featuredTourIds)}`;
          if (valid.length !== new Set(draft.featuredTourIds).size)
            throw new DomainError("VALIDATION_ERROR");
        }
      } else if (command.type === "restore") {
        const [version] = await tx<
          { data: unknown }[]
        >`SELECT data FROM storefront_publications WHERE tenant_id=${tenantId} AND version=${command.sourceVersion}`;
        if (!version) throw new DomainError("NOT_FOUND");
        draft = storefrontInputSchema.parse(version.data);
      } else {
        await tx`INSERT INTO storefront_routes(slug,tenant_id) VALUES(${draft.seo.slug},${tenantId}) ON CONFLICT DO NOTHING`;
        const [route] = await tx<
          { tenant_id: string }[]
        >`SELECT tenant_id FROM storefront_routes WHERE slug=${draft.seo.slug}`;
        if (route?.tenant_id !== tenantId) throw new DomainError("CONFLICT");
        await tx`UPDATE storefront_publications SET cancelled_at=now() WHERE tenant_id=${tenantId} AND effective_at>now() AND cancelled_at IS NULL`;
        await tx`INSERT INTO storefront_publications(tenant_id,version,slug,data,effective_at) VALUES(${tenantId},${nextVersion},${draft.seo.slug},${tx.json(draft)},${command.scheduledAt ?? new Date().toISOString()})`;
      }
      await tx`UPDATE storefront_settings SET version=${nextVersion},draft=${tx.json(draft)},updated_at=now() WHERE tenant_id=${tenantId}`;
      await tx`INSERT INTO audit_logs(id,tenant_id,actor_id,action,resource_id,operation_id) VALUES(${randomUUID()},${tenantId},${repo.context.userId},${`storefront.${command.type}`},${tenantId},${randomUUID()})`;
      return adminData(tx, tenantId, name);
    }),
  );
}
