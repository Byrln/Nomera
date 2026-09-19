import "server-only";
import { readDashboard } from "@nomera/domain/dashboard";
import { DomainError, parseInput } from "@nomera/domain/errors";
import {
  type DashboardFilter,
  dashboardDate,
  dashboardFilterSchema,
  dashboardTimezone,
  previousDashboardPeriod,
  shiftDashboardDate,
} from "@nomera/schemas/dashboard";
import type { TransactionSql } from "postgres";
import { type DatabaseClient, getDatabase } from "../server";
import { databaseRead } from "./errors";
import { createTenantRepository } from "./tenant";

function safeInteger(value: string): number {
  // PostgreSQL aggregates remain exact text until this checked boundary.
  if (!/^\d+$/.test(value)) throw new DomainError("UNAVAILABLE");
  const exact = BigInt(value);
  if (exact > BigInt(Number.MAX_SAFE_INTEGER))
    throw new DomainError("UNAVAILABLE");
  return Number(exact);
}

async function readSnapshot(
  sql: TransactionSql,
  tenantId: string,
  filter: DashboardFilter,
) {
  const previousPeriod = previousDashboardPeriod(filter);
  const [clock] = await sql<
    { generated_at: Date }[]
  >`SELECT transaction_timestamp() AS generated_at`;
  if (!clock) throw new DomainError("UNAVAILABLE");
  const today = dashboardDate(clock.generated_at);
  const upcomingEnd = shiftDashboardDate(today, 30);
  const metrics = await sql<
    {
      period: string;
      bookings: string;
      revenue: string;
      active: string;
      conversion: number | null;
    }[]
  >`
    WITH periods AS (
      SELECT 'current' AS period, ${filter.from}::date AS starts, ${filter.to}::date AS ends
      UNION ALL SELECT 'previous', ${previousPeriod.from}::date, ${previousPeriod.to}::date
    )
    SELECT p.period,
      (SELECT count(*)::text FROM bookings b WHERE b.tenant_id = ${tenantId}
        AND b.currency = ${filter.currency} AND b.status <> 'cancelled'
        AND b.booked_at >= (p.starts::timestamp AT TIME ZONE ${dashboardTimezone})
        AND b.booked_at < ((p.ends + 1)::timestamp AT TIME ZONE ${dashboardTimezone})) AS bookings,
      (SELECT coalesce(sum(b.total_minor), 0)::text FROM bookings b WHERE b.tenant_id = ${tenantId}
        AND b.currency = ${filter.currency} AND b.status IN ('confirmed', 'completed')
        AND b.booked_at >= (p.starts::timestamp AT TIME ZONE ${dashboardTimezone})
        AND b.booked_at < ((p.ends + 1)::timestamp AT TIME ZONE ${dashboardTimezone})) AS revenue,
      (SELECT count(*)::text FROM departures d WHERE d.tenant_id = ${tenantId}
        AND d.status NOT IN ('cancelled', 'completed') AND d.starts_on <= p.ends AND d.ends_on >= p.starts) AS active,
      (SELECT (100.0 * count(*) FILTER (WHERE b.status IN ('confirmed', 'completed')) / nullif(count(*),0))::float8
        FROM inquiries i LEFT JOIN bookings b ON b.tenant_id = i.tenant_id AND b.id = i.booking_id
        WHERE i.tenant_id = ${tenantId}
          AND i.created_at >= (p.starts::timestamp AT TIME ZONE ${dashboardTimezone})
          AND i.created_at < ((p.ends + 1)::timestamp AT TIME ZONE ${dashboardTimezone})) AS conversion
    FROM periods p
  `;
  const current = metrics.find((row) => row.period === "current");
  const previous = metrics.find((row) => row.period === "previous");
  if (!current || !previous) throw new DomainError("UNAVAILABLE");
  const trend = await sql<
    { date: string; bookings: string; revenue: string }[]
  >`
    WITH days AS (
      SELECT ${filter.from}::date + n AS day FROM generate_series(0, ${filter.to}::date - ${filter.from}::date) AS n
    ), daily AS (
      SELECT (b.booked_at AT TIME ZONE ${dashboardTimezone})::date AS day,
        count(*) FILTER (WHERE b.status <> 'cancelled') AS bookings,
        coalesce(sum(b.total_minor) FILTER (WHERE b.status IN ('confirmed','completed')),0) AS revenue
      FROM bookings b WHERE b.tenant_id = ${tenantId} AND b.currency = ${filter.currency}
        AND b.booked_at >= (${filter.from}::date::timestamp AT TIME ZONE ${dashboardTimezone})
        AND b.booked_at < ((${filter.to}::date + 1)::timestamp AT TIME ZONE ${dashboardTimezone})
      GROUP BY 1
    )
    SELECT to_char(days.day,'YYYY-MM-DD') AS date, coalesce(daily.bookings,0)::text AS bookings,
      coalesce(daily.revenue,0)::text AS revenue FROM days LEFT JOIN daily USING (day) ORDER BY days.day
  `;
  const channels = await sql<{ channel: string; bookings: string }[]>`
    WITH channels(channel, position) AS (VALUES ('direct',1),('website',2),('agent',3),('other',4))
    SELECT c.channel, count(b.id)::text AS bookings FROM channels c
    LEFT JOIN bookings b ON b.channel = c.channel AND b.tenant_id = ${tenantId}
      AND b.currency = ${filter.currency} AND b.status <> 'cancelled'
      AND b.booked_at >= (${filter.from}::date::timestamp AT TIME ZONE ${dashboardTimezone})
      AND b.booked_at < ((${filter.to}::date + 1)::timestamp AT TIME ZONE ${dashboardTimezone})
    GROUP BY c.channel, c.position ORDER BY c.position
  `;
  const departures = await sql<
    {
      id: string;
      title: string;
      starts_on: string;
      ends_on: string;
      status: string;
      capacity: number;
      reserved: string;
    }[]
  >`
    SELECT d.id, t.title, to_char(d.starts_on,'YYYY-MM-DD') AS starts_on,
      to_char(d.ends_on,'YYYY-MM-DD') AS ends_on, d.status, d.capacity,
      (SELECT coalesce(sum(b.travelers),0)::text FROM bookings b WHERE b.tenant_id = d.tenant_id
        AND b.departure_id = d.id AND b.status IN ('confirmed','completed')) AS reserved
    FROM departures d JOIN tours t ON t.tenant_id = d.tenant_id AND t.id = d.tour_id
    WHERE d.tenant_id = ${tenantId} AND d.status NOT IN ('cancelled','completed')
      AND d.starts_on >= ${today}::date AND d.starts_on < ${upcomingEnd}::date
    ORDER BY d.starts_on, d.id LIMIT 5
  `;
  const [attention] = await sql<{ pending: string }[]>`
    SELECT count(*)::text AS pending FROM bookings WHERE tenant_id = ${tenantId}
      AND currency = ${filter.currency} AND status = 'pending'
  `;
  const [departureSummary] = await sql<
    {
      on_track: string;
      low_capacity: string;
      at_risk: string;
      completed: string;
    }[]
  >`
    WITH inventory AS (
      SELECT d.status,d.capacity,
        (SELECT coalesce(sum(b.travelers),0) FROM bookings b WHERE b.tenant_id=d.tenant_id AND b.departure_id=d.id AND b.status IN ('confirmed','completed')) reserved
      FROM departures d WHERE d.tenant_id=${tenantId} AND d.status<>'cancelled'
        AND d.starts_on<=${filter.to}::date AND d.ends_on>=${filter.from}::date
    )
    SELECT count(*) FILTER(WHERE status<>'completed' AND capacity>0 AND reserved<capacity*0.8)::text on_track,
      count(*) FILTER(WHERE status<>'completed' AND capacity>0 AND reserved>=capacity*0.8 AND reserved<=capacity)::text low_capacity,
      count(*) FILTER(WHERE status<>'completed' AND (capacity=0 OR reserved>capacity))::text at_risk,
      count(*) FILTER(WHERE status='completed')::text completed FROM inventory`;
  const recent = await sql<
    {
      id: string;
      reference: string;
      customer_name: string;
      tour_title: string;
      booked_at: Date;
      starts_on: string;
      status: string;
      channel: string;
      total_minor: string;
      currency: string;
      travelers: number;
    }[]
  >`
    SELECT b.id, b.reference, b.customer_name, t.title AS tour_title, b.booked_at, to_char(d.starts_on,'YYYY-MM-DD') starts_on,
      b.status, b.channel, b.total_minor::text, b.currency, b.travelers
    FROM bookings b JOIN departures d ON d.tenant_id = b.tenant_id AND d.id = b.departure_id
    JOIN tours t ON t.tenant_id = d.tenant_id AND t.id = d.tour_id
    WHERE b.tenant_id = ${tenantId} AND b.currency = ${filter.currency}
      AND b.booked_at >= (${filter.from}::date::timestamp AT TIME ZONE ${dashboardTimezone})
      AND b.booked_at < ((${filter.to}::date + 1)::timestamp AT TIME ZONE ${dashboardTimezone})
    ORDER BY b.booked_at DESC, b.id DESC LIMIT 10
  `;
  if (!attention) throw new DomainError("UNAVAILABLE");
  return {
    tenantId,
    generatedAt: clock.generated_at.toISOString(),
    timezone: dashboardTimezone,
    filter,
    previousPeriod,
    metrics: {
      bookings: {
        value: safeInteger(current.bookings),
        previous: safeInteger(previous.bookings),
      },
      revenueMinor: {
        value: safeInteger(current.revenue),
        previous: safeInteger(previous.revenue),
      },
      activeDepartures: {
        value: safeInteger(current.active),
        previous: safeInteger(previous.active),
      },
      conversion: { value: current.conversion, previous: previous.conversion },
    },
    trend: trend.map((row) => ({
      date: row.date,
      bookings: safeInteger(row.bookings),
      revenueMinor: safeInteger(row.revenue),
    })),
    channels: channels.map((row) => ({
      channel: row.channel,
      bookings: safeInteger(row.bookings),
    })),
    departures: departures.map((row) => ({
      id: row.id,
      title: row.title,
      startsOn: row.starts_on,
      endsOn: row.ends_on,
      status: row.status,
      capacity: row.capacity,
      reserved: safeInteger(row.reserved),
    })),
    attention: { pendingBookings: safeInteger(attention.pending) },
    departureSummary: {
      onTrack: safeInteger(departureSummary?.on_track ?? "0"),
      lowCapacity: safeInteger(departureSummary?.low_capacity ?? "0"),
      atRisk: safeInteger(departureSummary?.at_risk ?? "0"),
      completed: safeInteger(departureSummary?.completed ?? "0"),
    },
    recentBookings: recent.map((row) => ({
      id: row.id,
      reference: row.reference,
      customerName: row.customer_name,
      tourTitle: row.tour_title,
      bookedAt: row.booked_at.toISOString(),
      startsOn: row.starts_on,
      status: row.status,
      channel: row.channel,
      totalMinor: safeInteger(row.total_minor),
      currency: row.currency,
      travelers: row.travelers,
    })),
  };
}

export async function getDashboard(
  sessionSecret: string,
  selectedTenantId: unknown,
  input: unknown,
  sql?: DatabaseClient,
) {
  if (!sessionSecret.trim()) throw new DomainError("UNAUTHENTICATED");
  const filter = parseInput(dashboardFilterSchema, input);
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
        return readDashboard(context, filter, {
          read: (tenant, selectedFilter) =>
            readSnapshot(transaction, tenant, selectedFilter),
        });
      },
    ),
  );
}
