import "server-only";
import { createHash, randomUUID } from "node:crypto";
import { DomainError, parseInput } from "@nomera/domain/errors";
import { assertLedgerAmount } from "@nomera/domain/finance";
import { assertCapability } from "@nomera/domain/tenancy";
import {
  type FinanceData,
  financeFilterSchema,
  financeMutationSchema,
  type MarketingData,
  marketingMutationSchema,
  type ReportsData,
  reportsFilterSchema,
  type SettingsData,
  settingsMutationSchema,
} from "@nomera/schemas/finance";
import { resourceIdSchema } from "@nomera/schemas/security";
import type { TransactionSql } from "postgres";
import { type DatabaseClient, getDatabase } from "../server";
import { databaseRead } from "./errors";
import { createTenantRepository } from "./tenant";

async function lockMutationIdentity(
  sql: TransactionSql,
  session: string,
  tenant: unknown,
) {
  if (!session.trim()) throw new DomainError("UNAUTHENTICATED");
  const tenantId = parseInput(resourceIdSchema, tenant);
  await sql`SELECT s.id FROM sessions s JOIN users u ON u.id=s.user_id JOIN memberships m ON m.user_id=u.id AND m.tenant_id=${tenantId} WHERE s.token_digest=${createHash("sha256").update(session).digest("hex")} FOR SHARE OF s,u,m`;
}

export async function getSettings(
  session: string,
  tenant: unknown,
  database?: DatabaseClient,
): Promise<SettingsData> {
  return databaseRead(() =>
    (database ?? getDatabase()).begin(
      "isolation level repeatable read read only",
      async (sql) => {
        const { context } = await createTenantRepository(session, tenant, sql);
        assertCapability(context, "settings:manage");
        const [organization] = await sql<
          { name: string }[]
        >`SELECT name FROM organizations WHERE id=${context.tenantId}`;
        if (!organization) throw new DomainError("NOT_FOUND");
        const members = await sql<
          { email: string; role: string; active: boolean }[]
        >`SELECT u.email,m.role,m.active FROM memberships m JOIN users u ON u.id=m.user_id WHERE m.tenant_id=${context.tenantId} ORDER BY u.email,m.role`;
        return { name: organization.name, members };
      },
    ),
  );
}
export async function mutateSettings(
  session: string,
  tenant: unknown,
  input: unknown,
  database?: DatabaseClient,
): Promise<void> {
  const data = parseInput(settingsMutationSchema, input);
  await databaseRead(() =>
    (database ?? getDatabase()).begin(async (sql) => {
      await lockMutationIdentity(sql, session, tenant);
      const { context } = await createTenantRepository(session, tenant, sql);
      assertCapability(context, "settings:manage");
      const rows =
        await sql`UPDATE organizations SET name=${data.name} WHERE id=${context.tenantId} AND name=${data.previousName} RETURNING id`;
      if (!rows.length) throw new DomainError("CONFLICT");
    }),
  );
}

function number(value: string | number): number {
  const n = Number(value);
  if (!Number.isSafeInteger(n)) throw new DomainError("UNAVAILABLE");
  return n;
}

export async function getFinance(
  session: string,
  tenant: unknown,
  input: unknown,
  database?: DatabaseClient,
): Promise<FinanceData> {
  const filter = parseInput(financeFilterSchema, input);
  return databaseRead(() =>
    (database ?? getDatabase()).begin(
      "isolation level repeatable read read only",
      async (sql) => {
        const { context } = await createTenantRepository(session, tenant, sql);
        assertCapability(context, "finance:read");
        const tid = context.tenantId;
        const ledgerPeriod =
          filter.from && filter.to
            ? sql`AND (created_at AT TIME ZONE 'Asia/Ulaanbaatar')::date BETWEEN ${filter.from}::date AND ${filter.to}::date`
            : sql``;
        const entryPeriod =
          filter.from && filter.to
            ? sql`AND (l.created_at AT TIME ZONE 'Asia/Ulaanbaatar')::date BETWEEN ${filter.from}::date AND ${filter.to}::date`
            : sql``;
        const bookingPeriod =
          filter.from && filter.to
            ? sql`AND (b.booked_at AT TIME ZONE 'Asia/Ulaanbaatar')::date BETWEEN ${filter.from}::date AND ${filter.to}::date`
            : sql``;
        const invoicePeriod =
          filter.from && filter.to
            ? sql`AND (i.issued_at AT TIME ZONE 'Asia/Ulaanbaatar')::date BETWEEN ${filter.from}::date AND ${filter.to}::date`
            : sql``;
        const [totals] = await sql<
          {
            collected: string;
            refunded: string;
            outstanding: string;
            average: string;
          }[]
        >`
   WITH paid AS (SELECT booking_id,sum(CASE WHEN kind='payment' THEN amount_minor ELSE -amount_minor END) amount FROM ledger_entries WHERE tenant_id=${tid} GROUP BY booking_id)
   SELECT (SELECT coalesce(sum(amount_minor),0)::text FROM ledger_entries WHERE tenant_id=${tid} AND currency=${filter.currency} AND kind='payment' ${ledgerPeriod}) collected,
   (SELECT coalesce(sum(amount_minor),0)::text FROM ledger_entries WHERE tenant_id=${tid} AND currency=${filter.currency} AND kind='refund' ${ledgerPeriod}) refunded,
   coalesce(sum(greatest(b.total_minor-coalesce(p.amount,0),0)),0)::text outstanding, coalesce(trunc(avg(b.total_minor)),0)::text average
   FROM bookings b LEFT JOIN paid p ON p.booking_id=b.id WHERE b.tenant_id=${tid} AND b.currency=${filter.currency} AND b.status<>'cancelled' ${bookingPeriod}`;
        const bookings = await sql<
          {
            id: string;
            reference: string;
            customer_name: string;
            total_minor: string;
            paid: string;
            status: string;
          }[]
        >`
   SELECT b.id,b.reference,b.customer_name,b.total_minor::text,b.status,coalesce((SELECT sum(CASE WHEN l.kind='payment' THEN l.amount_minor ELSE -l.amount_minor END) FROM ledger_entries l WHERE l.tenant_id=b.tenant_id AND l.booking_id=b.id),0)::text paid FROM bookings b WHERE b.tenant_id=${tid} AND b.currency=${filter.currency} ${bookingPeriod} ORDER BY b.booked_at DESC LIMIT 200`;
        const entries = await sql<
          {
            id: string;
            booking_reference: string;
            kind: "payment" | "refund";
            amount_minor: string;
            method: string;
            reference: string;
            created_at: Date;
            reconciled_at: Date | null;
          }[]
        >`
   SELECT l.*,l.amount_minor::text,b.reference booking_reference FROM ledger_entries l JOIN bookings b ON b.tenant_id=l.tenant_id AND b.id=l.booking_id WHERE l.tenant_id=${tid} AND l.currency=${filter.currency} ${entryPeriod} ORDER BY l.created_at DESC LIMIT 200`;
        const invoices = await sql<
          {
            id: string;
            number: string;
            booking_reference: string;
            customer_name: string;
            total_minor: string;
            due_on: string;
            issued_at: Date;
            paid: string;
          }[]
        >`
   SELECT i.id,i.number,b.reference booking_reference,i.customer_name,i.total_minor::text,to_char(i.due_on,'YYYY-MM-DD') due_on,i.issued_at,
   coalesce((SELECT sum(CASE WHEN l.kind='payment' THEN l.amount_minor ELSE -l.amount_minor END) FROM ledger_entries l WHERE l.tenant_id=i.tenant_id AND l.booking_id=i.booking_id),0)::text paid
   FROM invoices i JOIN bookings b ON b.tenant_id=i.tenant_id AND b.id=i.booking_id WHERE i.tenant_id=${tid} AND i.currency=${filter.currency} ${invoicePeriod} ORDER BY i.issued_at DESC LIMIT 200`;
        const cash = await sql<
          { month: string; payments: string; refunds: string }[]
        >`SELECT to_char(date_trunc('month',created_at AT TIME ZONE 'Asia/Ulaanbaatar'),'YYYY-MM') AS month,coalesce(sum(amount_minor) FILTER(WHERE kind='payment'),0)::text payments,coalesce(sum(amount_minor) FILTER(WHERE kind='refund'),0)::text refunds FROM ledger_entries WHERE tenant_id=${tid} AND currency=${filter.currency} ${ledgerPeriod} GROUP BY 1 ORDER BY 1 DESC LIMIT 12`;
        if (!totals) throw new DomainError("UNAVAILABLE");
        return {
          currency: filter.currency,
          collectedMinor: number(totals.collected),
          refundedMinor: number(totals.refunded),
          outstandingMinor: number(totals.outstanding),
          averageBookingMinor: number(totals.average),
          bookings: bookings.map((b) => ({
            id: b.id,
            reference: b.reference,
            customerName: b.customer_name,
            totalMinor: number(b.total_minor),
            paidMinor: number(b.paid),
            status: b.status,
          })),
          entries: entries.map((e) => ({
            id: e.id,
            bookingReference: e.booking_reference,
            kind: e.kind,
            amountMinor: number(e.amount_minor),
            method: e.method,
            reference: e.reference,
            createdAt: e.created_at.toISOString(),
            reconciledAt: e.reconciled_at?.toISOString() ?? null,
          })),
          invoices: invoices.map((i) => ({
            id: i.id,
            number: i.number,
            bookingReference: i.booking_reference,
            customerName: i.customer_name,
            totalMinor: number(i.total_minor),
            dueOn: i.due_on,
            issuedAt: i.issued_at.toISOString(),
            paidMinor: number(i.paid),
          })),
          cashFlow: cash.map((c) => ({
            month: c.month,
            paymentsMinor: number(c.payments),
            refundsMinor: number(c.refunds),
          })),
        };
      },
    ),
  );
}

export async function mutateFinance(
  session: string,
  tenant: unknown,
  input: unknown,
  database?: DatabaseClient,
): Promise<void> {
  const command = parseInput(financeMutationSchema, input);
  await databaseRead(() =>
    (database ?? getDatabase()).begin(async (sql) => {
      await lockMutationIdentity(sql, session, tenant);
      const { context } = await createTenantRepository(session, tenant, sql);
      assertCapability(context, "finance:manage");
      const tid = context.tenantId;
      if (command.action === "reconcile") {
        const result =
          await sql`UPDATE ledger_entries SET reconciled_at=coalesce(reconciled_at,now()),reconciled_by=coalesce(reconciled_by,${context.userId}) WHERE tenant_id=${tid} AND id=${command.entryId} RETURNING id`;
        if (!result.length) throw new DomainError("NOT_FOUND");
        return;
      }
      const [booking] = await sql<
        {
          id: string;
          reference: string;
          customer_name: string;
          total_minor: string;
          currency: string;
          status: string;
        }[]
      >`SELECT id,reference,customer_name,total_minor::text,currency,status FROM bookings WHERE tenant_id=${tid} AND id=${command.bookingId} FOR UPDATE`;
      if (!booking) throw new DomainError("NOT_FOUND");
      if (command.action === "invoice") {
        if (booking.status === "cancelled") throw new DomainError("CONFLICT");
        const id = randomUUID();
        await sql`INSERT INTO invoices(id,tenant_id,booking_id,number,customer_name,total_minor,currency,due_on,created_by) VALUES(${id},${tid},${booking.id},${`INV-${booking.reference}`},${booking.customer_name},${booking.total_minor},${booking.currency},${command.dueOn},${context.userId}) ON CONFLICT(tenant_id,booking_id) DO NOTHING`;
        return;
      }
      const [existing] = await sql<
        {
          booking_id: string;
          kind: string;
          amount_minor: string;
          method: string;
          reference: string;
        }[]
      >`SELECT booking_id,kind,amount_minor::text,method,reference FROM ledger_entries WHERE tenant_id=${tid} AND request_id=${command.requestId}`;
      if (existing) {
        if (
          existing.booking_id !== booking.id ||
          existing.kind !== command.action ||
          number(existing.amount_minor) !== command.amountMinor ||
          existing.method !== command.method ||
          existing.reference !== command.reference
        )
          throw new DomainError("CONFLICT");
        return;
      }
      const [paid] = await sql<
        { amount: string }[]
      >`SELECT coalesce(sum(CASE WHEN kind='payment' THEN amount_minor ELSE -amount_minor END),0)::text amount FROM ledger_entries WHERE tenant_id=${tid} AND booking_id=${booking.id}`;
      assertLedgerAmount(
        command.action,
        command.amountMinor,
        number(booking.total_minor),
        number(paid?.amount ?? "0"),
        booking.status,
      );
      await sql`INSERT INTO ledger_entries(id,tenant_id,booking_id,kind,amount_minor,currency,method,reference,request_id,created_by) VALUES(${randomUUID()},${tid},${booking.id},${command.action},${command.amountMinor},${booking.currency},${command.method},${command.reference},${command.requestId},${context.userId})`;
    }),
  );
}

export async function getMarketing(
  session: string,
  tenant: unknown,
  database?: DatabaseClient,
  input: unknown = {},
): Promise<MarketingData> {
  const filter = parseInput(financeFilterSchema, input);
  return databaseRead(() =>
    (database ?? getDatabase()).begin(
      "isolation level repeatable read read only",
      async (sql) => {
        const { context } = await createTenantRepository(session, tenant, sql);
        assertCapability(context, "marketing:read");
        const tid = context.tenantId;
        const promotionPeriod =
          filter.from && filter.to
            ? sql`AND (starts_at AT TIME ZONE 'Asia/Ulaanbaatar')::date <= ${filter.to}::date AND (ends_at IS NULL OR (ends_at AT TIME ZONE 'Asia/Ulaanbaatar')::date >= ${filter.from}::date)`
            : sql``;
        const campaignPeriod =
          filter.from && filter.to
            ? sql`AND c.starts_on <= ${filter.to}::date AND c.ends_on >= ${filter.from}::date`
            : sql``;
        const sourcePeriod =
          filter.from && filter.to
            ? sql`AND (booked_at AT TIME ZONE 'Asia/Ulaanbaatar')::date BETWEEN ${filter.from}::date AND ${filter.to}::date`
            : sql``;
        const attributedPeriod =
          filter.from && filter.to
            ? sql`AND (b.booked_at AT TIME ZONE 'Asia/Ulaanbaatar')::date BETWEEN ${filter.from}::date AND ${filter.to}::date`
            : sql``;
        const promotions = await sql<
          {
            id: string;
            code: string;
            kind: "percent" | "fixed";
            value: string;
            currency: "MNT" | "USD";
            starts_at: Date;
            ends_at: Date | null;
            max_uses: number | null;
            uses: number;
            active: boolean;
          }[]
        >`SELECT *,value::text FROM promotions WHERE tenant_id=${tid} ${promotionPeriod} ORDER BY created_at DESC LIMIT 200`;
        const campaigns = await sql<
          {
            id: string;
            name: string;
            source: string;
            budget_minor: string;
            currency: string;
            starts_on: string;
            ends_on: string;
            bookings: string;
            revenue: string;
          }[]
        >`SELECT c.id,c.name,c.source,c.budget_minor::text,c.currency,to_char(c.starts_on,'YYYY-MM-DD') starts_on,to_char(c.ends_on,'YYYY-MM-DD') ends_on,count(b.id)::text bookings,coalesce(sum(b.total_minor),0)::text revenue FROM campaigns c LEFT JOIN bookings b ON b.tenant_id=c.tenant_id AND b.channel=c.source AND b.currency=c.currency AND b.status<>'cancelled' AND (b.booked_at AT TIME ZONE 'Asia/Ulaanbaatar')::date BETWEEN c.starts_on AND c.ends_on ${attributedPeriod} WHERE c.tenant_id=${tid} ${campaignPeriod} GROUP BY c.id ORDER BY c.created_at DESC LIMIT 200`;
        const sources = await sql<
          { source: string; bookings: string; travelers: string }[]
        >`SELECT channel source,count(*)::text bookings,sum(travelers)::text travelers FROM bookings WHERE tenant_id=${tid} AND status<>'cancelled' ${sourcePeriod} GROUP BY channel ORDER BY count(*) DESC`;
        return {
          promotions: promotions.map((p) => ({
            id: p.id,
            code: p.code,
            kind: p.kind,
            value: number(p.value),
            currency: p.currency,
            startsAt: p.starts_at.toISOString(),
            endsAt: p.ends_at?.toISOString() ?? null,
            maxUses: p.max_uses,
            uses: p.uses,
            active: p.active,
          })),
          campaigns: campaigns.map((c) => ({
            id: c.id,
            name: c.name,
            source: c.source,
            budgetMinor: number(c.budget_minor),
            currency: c.currency,
            startsOn: c.starts_on,
            endsOn: c.ends_on,
            bookings: number(c.bookings),
            revenueMinor: number(c.revenue),
          })),
          sources: sources.map((s) => ({
            source: s.source,
            bookings: number(s.bookings),
            travelers: number(s.travelers),
          })),
        };
      },
    ),
  );
}

export async function mutateMarketing(
  session: string,
  tenant: unknown,
  input: unknown,
  database?: DatabaseClient,
): Promise<void> {
  const command = parseInput(marketingMutationSchema, input);
  await databaseRead(() =>
    (database ?? getDatabase()).begin(async (sql) => {
      await lockMutationIdentity(sql, session, tenant);
      const { context } = await createTenantRepository(session, tenant, sql);
      assertCapability(context, "marketing:manage");
      const tid = context.tenantId;
      if (command.action === "togglePromotion") {
        const rows =
          await sql`UPDATE promotions SET active=${command.active} WHERE tenant_id=${tid} AND id=${command.id} RETURNING id`;
        if (!rows.length) throw new DomainError("NOT_FOUND");
        return;
      }
      if (command.action === "promotion") {
        const p = command.data;
        await sql`INSERT INTO promotions(id,tenant_id,code,kind,value,currency,starts_at,ends_at,max_uses,created_by) VALUES(${randomUUID()},${tid},${p.code},${p.kind},${p.value},${p.currency},${p.startsAt},${p.endsAt},${p.maxUses},${context.userId})`;
        return;
      }
      await sql`INSERT INTO campaigns(id,tenant_id,name,source,budget_minor,currency,starts_on,ends_on,created_by) VALUES(${randomUUID()},${tid},${command.name},${command.source},${command.budgetMinor},${command.currency},${command.startsOn},${command.endsOn},${context.userId})`;
    }),
  );
}

export async function getReports(
  session: string,
  tenant: unknown,
  input: unknown,
  database?: DatabaseClient,
): Promise<ReportsData> {
  const filter = parseInput(reportsFilterSchema, input);
  return databaseRead(() =>
    (database ?? getDatabase()).begin(
      "isolation level repeatable read read only",
      async (sql) => {
        const { context } = await createTenantRepository(session, tenant, sql);
        assertCapability(context, "reports:read");
        const tid = context.tenantId;
        const period =
          filter.from && filter.to
            ? sql`AND (booked_at AT TIME ZONE 'Asia/Ulaanbaatar')::date BETWEEN ${filter.from}::date AND ${filter.to}::date`
            : sql``;
        const bookingPeriod =
          filter.from && filter.to
            ? sql`AND (b.booked_at AT TIME ZONE 'Asia/Ulaanbaatar')::date BETWEEN ${filter.from}::date AND ${filter.to}::date`
            : sql``;
        const selected = sql`${filter.channel ? sql`AND channel=${filter.channel}` : sql``} ${filter.destination ? sql`AND departure_id IN (SELECT d.id FROM departures d JOIN tours t ON t.tenant_id=d.tenant_id AND t.id=d.tour_id WHERE d.tenant_id=${tid} AND t.destination=${filter.destination})` : sql``}`;
        const selectedBooking = sql`${filter.channel ? sql`AND b.channel=${filter.channel}` : sql``} ${filter.destination ? sql`AND t.destination=${filter.destination}` : sql``}`;
        const availableDestinations = await sql<
          { destination: string }[]
        >`SELECT DISTINCT destination FROM tours WHERE tenant_id=${tid} ORDER BY destination`;
        const [total] = await sql<
          {
            bookings: string;
            travelers: string;
            revenue: string;
            costed: string;
            margin: string | null;
          }[]
        >`SELECT count(*)::text bookings,coalesce(sum(travelers),0)::text travelers,coalesce(sum(total_minor),0)::text revenue,count(cost_minor)::text costed,sum(total_minor-cost_minor) FILTER(WHERE cost_minor IS NOT NULL)::text margin FROM bookings WHERE tenant_id=${tid} AND currency=${filter.currency} AND status IN ('confirmed','completed') ${period} ${selected}`;
        type Row = {
          name: string;
          bookings: string;
          travelers: string;
          revenue: string;
        };
        const destinations = await sql<
          Row[]
        >`SELECT t.destination name,count(*)::text bookings,sum(b.travelers)::text travelers,sum(b.total_minor)::text revenue FROM bookings b JOIN departures d ON d.tenant_id=b.tenant_id AND d.id=b.departure_id JOIN tours t ON t.tenant_id=d.tenant_id AND t.id=d.tour_id WHERE b.tenant_id=${tid} AND b.currency=${filter.currency} AND b.status IN ('confirmed','completed') ${bookingPeriod} ${selectedBooking} GROUP BY t.destination ORDER BY sum(b.total_minor) DESC LIMIT 20`;
        const sources = await sql<
          Row[]
        >`SELECT channel name,count(*)::text bookings,sum(travelers)::text travelers,sum(total_minor)::text revenue FROM bookings WHERE tenant_id=${tid} AND currency=${filter.currency} AND status IN ('confirmed','completed') ${period} ${selected} GROUP BY channel ORDER BY sum(total_minor) DESC`;
        const tours = await sql<
          Row[]
        >`SELECT t.title name,count(*)::text bookings,sum(b.travelers)::text travelers,sum(b.total_minor)::text revenue FROM bookings b JOIN departures d ON d.tenant_id=b.tenant_id AND d.id=b.departure_id JOIN tours t ON t.tenant_id=d.tenant_id AND t.id=d.tour_id WHERE b.tenant_id=${tid} AND b.currency=${filter.currency} AND b.status IN ('confirmed','completed') ${bookingPeriod} ${selectedBooking} GROUP BY t.id,t.title ORDER BY sum(b.total_minor) DESC LIMIT 20`;
        const monthly = await sql<
          { month: string; bookings: string; revenue: string }[]
        >`SELECT to_char(booked_at AT TIME ZONE 'Asia/Ulaanbaatar','YYYY-MM') AS month,count(*)::text bookings,sum(total_minor)::text revenue FROM bookings WHERE tenant_id=${tid} AND currency=${filter.currency} AND status IN ('confirmed','completed') ${period} ${selected} GROUP BY 1 ORDER BY 1 DESC LIMIT 12`;
        if (!total) throw new DomainError("UNAVAILABLE");
        const map = (r: Row) => ({
          name: r.name,
          bookings: number(r.bookings),
          travelers: number(r.travelers),
          revenueMinor: number(r.revenue),
        });
        return {
          availableDestinations: availableDestinations.map(
            (row) => row.destination,
          ),
          monthly: monthly.reverse().map((row) => ({
            month: row.month,
            bookings: number(row.bookings),
            revenueMinor: number(row.revenue),
          })),
          currency: filter.currency,
          bookings: number(total.bookings),
          travelers: number(total.travelers),
          revenueMinor: number(total.revenue),
          costedBookings: number(total.costed),
          grossMarginMinor: total.margin === null ? null : number(total.margin),
          destinations: destinations.map(map),
          sources: sources.map(map),
          tours: tours.map(map),
        };
      },
    ),
  );
}
