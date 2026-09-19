import "server-only";
import { createHash, randomUUID } from "node:crypto";
import { DomainError, parseInput } from "@nomera/domain/errors";
import { assertCapability } from "@nomera/domain/tenancy";
import {
  assertDepartureChange,
  assertPublishable,
  authorizeTourMutation,
} from "@nomera/domain/tours";
import { resourceIdSchema } from "@nomera/schemas/security";
import {
  type TourCatalog,
  type TourDetail,
  type TourInput,
  tourCatalogFilterSchema,
  tourCatalogSchema,
  tourDetailSchema,
} from "@nomera/schemas/tours";
import type { TransactionSql } from "postgres";
import { type DatabaseClient, getDatabase } from "../server";
import { databaseRead } from "./errors";
import { createTenantRepository } from "./tenant";

function integer(value: string) {
  if (!/^\d+$/.test(value) || BigInt(value) > BigInt(Number.MAX_SAFE_INTEGER))
    throw new DomainError("UNAVAILABLE");
  return Number(value);
}
type TourRow = {
  id: string;
  tenant_id: string;
  title: string;
  code: string;
  destination: string;
  category: string;
  duration_days: number;
  description: string;
  base_price_minor: string;
  currency: string;
  itinerary: unknown;
  media: unknown;
  status: string;
  version: number;
  updated_at: Date;
};
function tourData(row: TourRow) {
  return {
    code: row.code,
    title: row.title,
    destination: row.destination,
    category: row.category,
    durationDays: row.duration_days,
    description: row.description,
    basePriceMinor: integer(row.base_price_minor),
    currency: row.currency,
    itinerary: row.itinerary,
    media: row.media,
  };
}
async function detail(
  sql: TransactionSql,
  tenantId: string,
  tourId: string,
): Promise<TourDetail> {
  const [row] = await sql<
    TourRow[]
  >`SELECT *,base_price_minor::text FROM tours WHERE tenant_id=${tenantId} AND id=${tourId}`;
  if (!row) throw new DomainError("NOT_FOUND");
  const [published] = await sql<
    { version: number; published_at: Date; data: unknown }[]
  >`SELECT version,published_at,data FROM tour_publications WHERE tenant_id=${tenantId} AND tour_id=${tourId} ORDER BY version DESC LIMIT 1`;
  const departures = await sql<
    {
      id: string;
      version: number;
      starts_on: string;
      ends_on: string;
      status: string;
      capacity: number;
      reserved: string;
      price_minor: string;
      currency: string;
    }[]
  >`
    SELECT d.id,d.version,to_char(d.starts_on,'YYYY-MM-DD') starts_on,to_char(d.ends_on,'YYYY-MM-DD') ends_on,d.status,d.capacity,d.price_minor::text,d.currency,
    (SELECT coalesce(sum(b.travelers),0)::text FROM bookings b WHERE b.tenant_id=d.tenant_id AND b.departure_id=d.id AND b.status IN ('confirmed','completed')) reserved
    FROM departures d WHERE d.tenant_id=${tenantId} AND d.tour_id=${tourId} ORDER BY d.starts_on,d.id`;
  const parsed = tourDetailSchema.safeParse({
    id: row.id,
    tenantId,
    version: row.version,
    status: row.status,
    data: tourData(row),
    updatedAt: row.updated_at.toISOString(),
    published: published
      ? {
          version: published.version,
          publishedAt: published.published_at.toISOString(),
          data: published.data,
        }
      : null,
    departures: departures.map((d) => ({
      id: d.id,
      version: d.version,
      startsOn: d.starts_on,
      endsOn: d.ends_on,
      status: d.status,
      capacity: d.capacity,
      reserved: integer(d.reserved),
      priceMinor: integer(d.price_minor),
      currency: d.currency,
    })),
  });
  if (!parsed.success) throw new DomainError("UNAVAILABLE");
  return parsed.data;
}

export async function getTourDetail(
  sessionSecret: string,
  selectedTenantId: unknown,
  id: unknown,
  sql?: DatabaseClient,
): Promise<TourDetail> {
  if (!sessionSecret.trim()) throw new DomainError("UNAUTHENTICATED");
  const tourId = parseInput(resourceIdSchema, id);
  return databaseRead(() =>
    (sql ?? getDatabase()).begin(
      "isolation level repeatable read read only",
      async (transaction) => {
        await transaction`SET LOCAL statement_timeout = '10s'`;
        const { context } = await createTenantRepository(
          sessionSecret,
          selectedTenantId,
          transaction,
        );
        assertCapability(context, "tours:read");
        return detail(transaction, context.tenantId, tourId);
      },
    ),
  );
}

export async function getTourCatalog(
  sessionSecret: string,
  selectedTenantId: unknown,
  input: unknown,
  sql?: DatabaseClient,
): Promise<TourCatalog> {
  if (!sessionSecret.trim()) throw new DomainError("UNAUTHENTICATED");
  const filter = parseInput(tourCatalogFilterSchema, input);
  return databaseRead(() =>
    (sql ?? getDatabase()).begin(
      "isolation level repeatable read read only",
      async (transaction) => {
        await transaction`SET LOCAL statement_timeout = '10s'`;
        const { context } = await createTenantRepository(
          sessionSecret,
          selectedTenantId,
          transaction,
        );
        assertCapability(context, "tours:read");
        const tenantId = context.tenantId;
        const match = transaction`tenant_id=${tenantId}
      AND (${filter.search}='' OR position(lower(${filter.search}) IN lower(title || ' ' || code))>0)
      AND (${filter.status}='all' OR status=${filter.status})
      AND (${filter.destination}='' OR destination=${filter.destination})
      AND (${filter.category}='' OR category=${filter.category})`;
        const [total] = await transaction<
          { count: string }[]
        >`SELECT count(*)::text count FROM tours WHERE ${match}`;
        const rows = await transaction<
          (TourRow & {
            departure_count: string;
            confirmed_travelers: string;
            confirmed_bookings: string;
            revenue: string;
            next_departure: string | null;
          })[]
        >`
      WITH page AS (SELECT *,base_price_minor::text FROM tours WHERE ${match} ORDER BY updated_at DESC,id LIMIT ${filter.pageSize} OFFSET ${(filter.page - 1) * filter.pageSize})
      SELECT p.*,
        (SELECT to_char(min(d.starts_on),'YYYY-MM-DD') FROM departures d WHERE d.tenant_id=p.tenant_id AND d.tour_id=p.id AND d.starts_on >= (now() AT TIME ZONE 'Asia/Ulaanbaatar')::date AND d.status IN ('scheduled','confirmed')) next_departure,
        (SELECT count(*)::text FROM bookings b JOIN departures d ON d.tenant_id=b.tenant_id AND d.id=b.departure_id WHERE d.tenant_id=p.tenant_id AND d.tour_id=p.id AND b.status IN ('confirmed','completed')) confirmed_bookings,
        (SELECT coalesce(sum(b.total_minor),0)::text FROM bookings b JOIN departures d ON d.tenant_id=b.tenant_id AND d.id=b.departure_id WHERE d.tenant_id=p.tenant_id AND d.tour_id=p.id AND b.status IN ('confirmed','completed') AND b.currency=p.currency) revenue,
        (SELECT count(*)::text FROM departures d WHERE d.tenant_id=p.tenant_id AND d.tour_id=p.id) departure_count,
        (SELECT coalesce(sum(b.travelers),0)::text FROM bookings b JOIN departures d ON d.tenant_id=b.tenant_id AND d.id=b.departure_id WHERE d.tenant_id=p.tenant_id AND d.tour_id=p.id AND b.status IN ('confirmed','completed')) confirmed_travelers
      FROM page p ORDER BY p.updated_at DESC,p.id`;
        const [counts] = await transaction<
          {
            total: string;
            draft: string;
            published: string;
            archived: string;
          }[]
        >`SELECT count(*)::text total,count(*) FILTER(WHERE status='draft')::text draft,count(*) FILTER(WHERE status='published')::text published,count(*) FILTER(WHERE status='archived')::text archived FROM tours WHERE tenant_id=${tenantId}`;
        const destinations = await transaction<
          { value: string }[]
        >`SELECT DISTINCT destination value FROM tours WHERE tenant_id=${tenantId} AND destination<>'' ORDER BY destination LIMIT 200`;
        const categories = await transaction<
          { value: string }[]
        >`SELECT DISTINCT category value FROM tours WHERE tenant_id=${tenantId} AND category<>'' ORDER BY category LIMIT 200`;
        const [summary] = await transaction<
          {
            bookings: string;
            basic: string;
            itinerary: string;
            media: string;
            pricing: string;
          }[]
        >`
        SELECT (SELECT count(*)::text FROM bookings b WHERE b.tenant_id=${tenantId} AND b.status IN ('confirmed','completed')) bookings,
        count(*) FILTER(WHERE title<>'' AND code<>'' AND destination<>'' AND description<>'')::text basic,
        count(*) FILTER(WHERE jsonb_array_length(itinerary)>=duration_days)::text itinerary,
        count(*) FILTER(WHERE jsonb_array_length(media)>0)::text media,
        count(*) FILTER(WHERE base_price_minor>0 AND EXISTS(SELECT 1 FROM departures d WHERE d.tenant_id=t.tenant_id AND d.tour_id=t.id AND d.starts_on >= (now() AT TIME ZONE 'Asia/Ulaanbaatar')::date AND d.status IN ('scheduled','confirmed') AND d.capacity>0))::text pricing
        FROM tours t WHERE tenant_id=${tenantId}`;
        const [topCategory] = await transaction<
          { category: string; bookings: string }[]
        >`SELECT t.category,count(*)::text bookings FROM bookings b JOIN departures d ON d.tenant_id=b.tenant_id AND d.id=b.departure_id JOIN tours t ON t.tenant_id=d.tenant_id AND t.id=d.tour_id WHERE b.tenant_id=${tenantId} AND b.status IN ('confirmed','completed') AND t.category<>'' GROUP BY t.category ORDER BY count(*) DESC,t.category LIMIT 1`;
        if (!total || !counts) throw new DomainError("UNAVAILABLE");
        return tourCatalogSchema.parse({
          tenantId,
          filter,
          total: integer(total.count),
          items: rows.map((row) => ({
            id: row.id,
            title: row.title,
            code: row.code,
            destination: row.destination,
            category: row.category,
            status: row.status,
            durationDays: row.duration_days,
            basePriceMinor: integer(row.base_price_minor),
            currency: row.currency,
            version: row.version,
            departureCount: integer(row.departure_count),
            confirmedTravelers: integer(row.confirmed_travelers),
            confirmedBookings: integer(row.confirmed_bookings),
            revenueMinor: integer(row.revenue),
            nextDeparture: row.next_departure,
            media: row.media,
            updatedAt: row.updated_at.toISOString(),
          })),
          summary: {
            bookings: integer(summary?.bookings ?? "0"),
            topCategory: topCategory?.category ?? null,
            topCategoryBookings: integer(topCategory?.bookings ?? "0"),
            basic: integer(summary?.basic ?? "0"),
            itinerary: integer(summary?.itinerary ?? "0"),
            media: integer(summary?.media ?? "0"),
            pricing: integer(summary?.pricing ?? "0"),
          },
          facets: {
            destinations: destinations.map((row) => row.value),
            categories: categories.map((row) => row.value),
          },
          counts: {
            total: integer(counts.total),
            draft: integer(counts.draft),
            published: integer(counts.published),
            archived: integer(counts.archived),
          },
        });
      },
    ),
  );
}

async function writeData(
  sql: TransactionSql,
  tenantId: string,
  tourId: string,
  data: TourInput,
) {
  await sql`UPDATE tours SET code=${data.code},title=${data.title},destination=${data.destination},category=${data.category},duration_days=${data.durationDays},description=${data.description},base_price_minor=${data.basePriceMinor},currency=${data.currency},itinerary=${sql.json(data.itinerary)},media=${sql.json(data.media)} WHERE tenant_id=${tenantId} AND id=${tourId}`;
}

export async function mutateTour(
  sessionSecret: string,
  selectedTenantId: unknown,
  input: unknown,
  sql?: DatabaseClient,
): Promise<TourDetail> {
  if (!sessionSecret.trim()) throw new DomainError("UNAUTHENTICATED");
  const tenantId = parseInput(resourceIdSchema, selectedTenantId);
  return databaseRead(() =>
    (sql ?? getDatabase()).begin(async (transaction) => {
      await transaction`SET LOCAL statement_timeout = '10s'`;
      // Hold identity rows through commit: membership revocation cannot race an authorized write.
      await transaction`SELECT s.id FROM sessions s JOIN users u ON u.id=s.user_id JOIN memberships m ON m.user_id=u.id AND m.tenant_id=${tenantId} WHERE s.token_digest=${createHash("sha256").update(sessionSecret).digest("hex")} FOR SHARE OF s,u,m`;
      const { context } = await createTenantRepository(
        sessionSecret,
        tenantId,
        transaction,
      );
      const command = authorizeTourMutation(context, input);
      const digest = createHash("sha256")
        .update(JSON.stringify(command))
        .digest("hex");
      // A per-operation transaction lock makes simultaneous retries safe without serializing all tours.
      await transaction`SELECT pg_advisory_xact_lock(hashtextextended(${`${tenantId}:${command.operationId}`},0))`;
      const [existingOperation] = await transaction<
        { tour_id: string; actor_id: string; request_digest: string }[]
      >`SELECT tour_id,actor_id,request_digest FROM tour_operations WHERE tenant_id=${tenantId} AND operation_id=${command.operationId}`;
      if (existingOperation) {
        if (
          existingOperation.actor_id !== context.userId ||
          existingOperation.request_digest !== digest
        )
          throw new DomainError("CONFLICT");
        return detail(transaction, tenantId, existingOperation.tour_id);
      }
      const tourId = command.type === "create" ? randomUUID() : command.tourId;
      if (command.type === "create") {
        await transaction`INSERT INTO tours(id,tenant_id,title,code) VALUES (${tourId},${tenantId},${command.data.title},${command.data.code})`;
        await writeData(transaction, tenantId, tourId, command.data);
      } else {
        const [locked] = await transaction<
          { version: number; status: string }[]
        >`SELECT version,status FROM tours WHERE tenant_id=${tenantId} AND id=${tourId} FOR UPDATE`;
        if (!locked) throw new DomainError("NOT_FOUND");
        if (locked.version !== command.version)
          throw new DomainError("CONFLICT");
        if (locked.status === "archived") throw new DomainError("CONFLICT");
        if (command.type === "saveDeparture")
          await transaction`SELECT id FROM departures WHERE tenant_id=${tenantId} AND tour_id=${tourId} FOR UPDATE`;
        const current = await detail(transaction, tenantId, tourId);
        if (command.type === "update")
          await writeData(transaction, tenantId, tourId, command.data);
        if (command.type === "publish") {
          assertPublishable(current.data);
          await transaction`INSERT INTO tour_publications(id,tenant_id,tour_id,version,data) VALUES (${randomUUID()},${tenantId},${tourId},${command.version + 1},${transaction.json(current.data)})`;
          await transaction`UPDATE tours SET status='published' WHERE tenant_id=${tenantId} AND id=${tourId}`;
        }
        if (command.type === "archive") {
          if (
            current.departures.some(
              (d) => !["completed", "cancelled"].includes(d.status),
            )
          )
            throw new DomainError("CONFLICT");
          await transaction`UPDATE tours SET status='archived' WHERE tenant_id=${tenantId} AND id=${tourId}`;
        }
        if (command.type === "saveDeparture") {
          const next = command.departure;
          const existing = current.departures.find((d) => d.id === next.id);
          if (next.id && !existing) throw new DomainError("NOT_FOUND");
          assertDepartureChange(existing, next);
          if (existing) {
            await transaction`UPDATE departures SET starts_on=${next.startsOn},ends_on=${next.endsOn},status=${next.status},capacity=${next.capacity},price_minor=${next.priceMinor},currency=${next.currency},version=version+1,updated_at=now() WHERE tenant_id=${tenantId} AND tour_id=${tourId} AND id=${existing.id}`;
          } else {
            await transaction`INSERT INTO departures(id,tenant_id,tour_id,starts_on,ends_on,status,capacity,price_minor,currency) VALUES (${randomUUID()},${tenantId},${tourId},${next.startsOn},${next.endsOn},${next.status},${next.capacity},${next.priceMinor},${next.currency})`;
          }
        }
        await transaction`UPDATE tours SET version=version+1,updated_at=now() WHERE tenant_id=${tenantId} AND id=${tourId}`;
      }
      await transaction`INSERT INTO tour_operations(tenant_id,operation_id,actor_id,tour_id,request_digest) VALUES (${tenantId},${command.operationId},${context.userId},${tourId},${digest})`;
      await transaction`INSERT INTO audit_logs(id,tenant_id,actor_id,action,resource_id,operation_id) VALUES (${randomUUID()},${tenantId},${context.userId},${`tours.${command.type}`},${tourId},${command.operationId})`;
      return detail(transaction, tenantId, tourId);
    }),
  );
}
