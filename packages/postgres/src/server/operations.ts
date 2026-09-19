import "server-only";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { DomainError, parseInput } from "@nomera/domain/errors";
import { calculatePromotionDiscount } from "@nomera/domain/finance";
import {
  assertBookingTransition,
  assertCapacity,
  bookingPrice,
} from "@nomera/domain/operations";
import { assertCapability } from "@nomera/domain/tenancy";
import {
  type Booking,
  type Customer,
  type CustomerDetail,
  type GuestBookingResult,
  guestBookingSchema,
  type OperationsData,
  operationsMutationSchema,
  type TravelerBooking,
} from "@nomera/schemas/operations";
import { resourceIdSchema } from "@nomera/schemas/security";
import { tourInputSchema } from "@nomera/schemas/tours";
import type { TransactionSql } from "postgres";
import { type DatabaseClient, getDatabase } from "../server";
import { databaseRead } from "./errors";
import { getPublishedStorefront } from "./storefront";
import { createTenantRepository } from "./tenant";

const digest = (v: string) => createHash("sha256").update(v).digest("hex");
function integer(v: string | number) {
  const n = Number(v);
  if (!Number.isSafeInteger(n) || n < 0) throw new DomainError("UNAVAILABLE");
  return n;
}
type CustomerRow = {
  id: string;
  name: string;
  email: string;
  phone: string;
  country: string;
  version: number;
  archived: boolean;
  created_at: Date;
};
const mapCustomer = (r: CustomerRow): Customer => ({
  id: r.id,
  name: r.name,
  email: r.email,
  phone: r.phone,
  country: r.country,
  version: r.version,
  archived: r.archived,
  createdAt: r.created_at.toISOString(),
});
type BookingRow = {
  id: string;
  reference: string;
  customer_id: string | null;
  customer_name: string;
  departure_id: string;
  tour_title: string;
  starts_on: string;
  ends_on: string;
  status: Booking["status"];
  channel: string;
  travelers: number;
  total_minor: string;
  currency: string;
  version: number;
  booked_at: Date;
};
const mapBooking = (r: BookingRow): Booking => ({
  id: r.id,
  reference: r.reference,
  customerId: r.customer_id,
  customerName: r.customer_name,
  departureId: r.departure_id,
  tourTitle: r.tour_title,
  startsOn: r.starts_on,
  endsOn: r.ends_on,
  status: r.status,
  channel: r.channel,
  travelers: r.travelers,
  totalMinor: integer(r.total_minor),
  currency: r.currency,
  version: r.version,
  bookedAt: r.booked_at.toISOString(),
});
async function bookingRows(
  tx: TransactionSql,
  tenant: string,
  customerId: string | null = null,
) {
  return (
    await tx<
      BookingRow[]
    >`SELECT b.*,b.total_minor::text,t.title tour_title,to_char(d.starts_on,'YYYY-MM-DD') starts_on,to_char(d.ends_on,'YYYY-MM-DD') ends_on FROM bookings b JOIN departures d ON d.tenant_id=b.tenant_id AND d.id=b.departure_id JOIN tours t ON t.tenant_id=d.tenant_id AND t.id=d.tour_id WHERE b.tenant_id=${tenant} AND (${customerId}::uuid IS NULL OR b.customer_id=${customerId}) ORDER BY b.booked_at DESC LIMIT 500`
  ).map(mapBooking);
}
export async function getOperations(
  secret: string,
  selectedTenant: unknown,
  sql: DatabaseClient = getDatabase(),
): Promise<OperationsData> {
  return databaseRead(() =>
    sql.begin("isolation level repeatable read read only", async (tx) => {
      const { context } = await createTenantRepository(
        secret,
        selectedTenant,
        tx,
      );
      assertCapability(context, "customers:read");
      const tenant = context.tenantId;
      const customers = (
        await tx<
          CustomerRow[]
        >`SELECT * FROM customers WHERE tenant_id=${tenant} ORDER BY updated_at DESC LIMIT 500`
      ).map(mapCustomer);
      const inquiries = await tx<
        {
          id: string;
          customer_id: string | null;
          customer_name: string;
          title: string;
          stage: OperationsData["inquiries"][number]["stage"];
          follow_up_at: string;
          notes: string;
          version: number;
          booking_id: string | null;
          quote_value: string | null;
          quote_currency: string | null;
          updated_at: Date;
        }[]
      >`SELECT i.*,q.total_minor::text quote_value,q.currency quote_currency,coalesce(c.name,'') customer_name,coalesce(to_char(i.follow_up_at,'YYYY-MM-DD'),'') follow_up_at FROM inquiries i LEFT JOIN customers c ON c.tenant_id=i.tenant_id AND c.id=i.customer_id LEFT JOIN LATERAL (SELECT total_minor,currency FROM sales_quotes WHERE tenant_id=i.tenant_id AND inquiry_id=i.id ORDER BY created_at DESC LIMIT 1) q ON true WHERE i.tenant_id=${tenant} ORDER BY i.updated_at DESC LIMIT 500`;
      const departures = await tx<
        {
          id: string;
          title: string;
          starts_on: string;
          available: string;
          price_minor: string;
          currency: string;
        }[]
      >`SELECT d.id,t.title,to_char(d.starts_on,'YYYY-MM-DD') starts_on,d.price_minor::text,d.currency,greatest(0,d.capacity-(SELECT coalesce(sum(b.travelers),0) FROM bookings b WHERE b.tenant_id=d.tenant_id AND b.departure_id=d.id AND b.status IN ('confirmed','completed')))::text available FROM departures d JOIN tours t ON t.tenant_id=d.tenant_id AND t.id=d.tour_id WHERE d.tenant_id=${tenant} AND d.status IN ('scheduled','confirmed') AND d.starts_on >= (now() AT TIME ZONE 'Asia/Ulaanbaatar')::date ORDER BY d.starts_on LIMIT 500`;
      return {
        customers,
        bookings: await bookingRows(tx, tenant),
        inquiries: inquiries.map((i) => ({
          id: i.id,
          customerId: i.customer_id,
          customerName: i.customer_name,
          title: i.title,
          stage: i.stage,
          followUpAt: i.follow_up_at,
          notes: i.notes,
          version: i.version,
          bookingId: i.booking_id,
          quoteValue:
            i.quote_value === null ? undefined : integer(i.quote_value),
          quoteCurrency: i.quote_currency ?? undefined,
          updatedAt: i.updated_at.toISOString(),
        })),
        departures: departures.map((d) => ({
          id: d.id,
          title: d.title,
          startsOn: d.starts_on,
          available: integer(d.available),
          priceMinor: integer(d.price_minor),
          currency: d.currency,
        })),
      };
    }),
  );
}
export async function getCustomerDetail(
  secret: string,
  selectedTenant: unknown,
  id: unknown,
  sql: DatabaseClient = getDatabase(),
): Promise<CustomerDetail> {
  const customerId = parseInput(resourceIdSchema, id);
  return databaseRead(() =>
    sql.begin("isolation level repeatable read read only", async (tx) => {
      const { context } = await createTenantRepository(
        secret,
        selectedTenant,
        tx,
      );
      assertCapability(context, "customers:read");
      const tenant = context.tenantId;
      const [customer] = await tx<
        CustomerRow[]
      >`SELECT * FROM customers WHERE tenant_id=${tenant} AND id=${customerId}`;
      if (!customer) throw new DomainError("NOT_FOUND");
      const activities = await tx<
        {
          id: string;
          kind: string;
          body: string;
          url: string;
          created_at: Date;
        }[]
      >`SELECT id,kind,body,url,created_at FROM customer_activities WHERE tenant_id=${tenant} AND customer_id=${customerId} ORDER BY created_at DESC LIMIT 200`;
      const quotes = await tx<
        {
          id: string;
          inquiry_id: string;
          tour_title: string;
          travelers: number;
          total_minor: string;
          currency: string;
          created_at: Date;
        }[]
      >`SELECT q.*,q.total_minor::text,t.title tour_title FROM sales_quotes q JOIN inquiries i ON i.tenant_id=q.tenant_id AND i.id=q.inquiry_id JOIN departures d ON d.tenant_id=q.tenant_id AND d.id=q.departure_id JOIN tours t ON t.tenant_id=d.tenant_id AND t.id=d.tour_id WHERE q.tenant_id=${tenant} AND i.customer_id=${customerId} ORDER BY q.created_at DESC LIMIT 100`;
      return {
        customer: mapCustomer(customer),
        bookings: await bookingRows(tx, tenant, customerId),
        activities: activities.map((a) => ({
          id: a.id,
          kind: a.kind,
          body: a.body,
          url: a.url,
          createdAt: a.created_at.toISOString(),
        })),
        quotes: quotes.map((q) => ({
          id: q.id,
          inquiryId: q.inquiry_id,
          tourTitle: q.tour_title,
          travelers: q.travelers,
          totalMinor: integer(q.total_minor),
          currency: q.currency,
          createdAt: q.created_at.toISOString(),
        })),
      };
    }),
  );
}
async function departurePrice(
  tx: TransactionSql,
  tenant: string,
  id: string,
  travelers: number,
  publicOnly = false,
) {
  const [d] = await tx<
    {
      id: string;
      tour_id: string;
      status: string;
      capacity: number;
      price_minor: string;
      currency: "MNT" | "USD";
      tour_status: string;
      snapshot: unknown;
      future: boolean;
    }[]
  >`SELECT d.*,d.price_minor::text,t.status tour_status,d.starts_on >= (now() AT TIME ZONE 'Asia/Ulaanbaatar')::date future,(SELECT p.data FROM tour_publications p WHERE p.tenant_id=t.tenant_id AND p.tour_id=t.id ORDER BY p.version DESC LIMIT 1) snapshot FROM departures d JOIN tours t ON t.tenant_id=d.tenant_id AND t.id=d.tour_id WHERE d.tenant_id=${tenant} AND d.id=${id} FOR UPDATE OF d`;
  if (
    !d?.future ||
    !["scheduled", "confirmed"].includes(d.status) ||
    (publicOnly && (d.tour_status !== "published" || !d.snapshot))
  )
    throw new DomainError("NOT_FOUND");
  const [r] = await tx<
    { reserved: string }[]
  >`SELECT coalesce(sum(travelers),0)::text reserved FROM bookings WHERE tenant_id=${tenant} AND departure_id=${id} AND status IN ('confirmed','completed')`;
  assertCapacity(d.capacity, integer(r?.reserved ?? 0), travelers);
  return {
    ...d,
    unitMinor: integer(d.price_minor),
    totalMinor: bookingPrice(integer(d.price_minor), travelers),
  };
}
async function discount(
  tx: TransactionSql,
  tenant: string,
  code: string,
  total: number,
  currency: string,
) {
  if (!code.trim()) return 0;
  const [p] = await tx<
    {
      id: string;
      kind: "percent" | "fixed";
      value: string;
      currency: string;
      active: boolean;
      starts_at: Date;
      ends_at: Date | null;
      max_uses: number | null;
      uses: number;
    }[]
  >`SELECT *,value::text FROM promotions WHERE tenant_id=${tenant} AND code=${code.trim().toUpperCase()} FOR UPDATE`;
  if (!p) throw new DomainError("VALIDATION_ERROR");
  const amount = calculatePromotionDiscount(
    {
      kind: p.kind,
      value: integer(p.value),
      currency: p.currency,
      active: p.active,
      startsAt: p.starts_at.toISOString(),
      endsAt: p.ends_at?.toISOString() ?? null,
      maxUses: p.max_uses,
      uses: p.uses,
    },
    total,
    currency,
  );
  await tx`UPDATE promotions SET uses=uses+1 WHERE tenant_id=${tenant} AND id=${p.id}`;
  return amount;
}
async function createBooking(
  tx: TransactionSql,
  tenant: string,
  input: {
    departureId: string;
    travelers: number;
    promotionCode: string;
    customerId: string;
    name: string;
    email: string;
    phone: string;
    channel: string;
  },
  publicOnly = false,
) {
  const d = await departurePrice(
    tx,
    tenant,
    input.departureId,
    input.travelers,
    publicOnly,
  );
  const off = await discount(
    tx,
    tenant,
    input.promotionCode,
    d.totalMinor,
    d.currency,
  );
  const id = randomUUID(),
    reference = `N-${randomBytes(6).toString("hex").toUpperCase()}`,
    total = bookingPrice(d.unitMinor, input.travelers, off);
  await tx`INSERT INTO bookings(id,tenant_id,departure_id,reference,customer_id,customer_name,customer_email,customer_phone,status,channel,total_minor,unit_price_minor,discount_minor,currency,travelers,tour_snapshot) VALUES(${id},${tenant},${d.id},${reference},${input.customerId},${input.name},${input.email},${input.phone},'pending',${input.channel},${total},${d.unitMinor},${off},${d.currency},${input.travelers},${d.snapshot ? tx.json(d.snapshot as Parameters<typeof tx.json>[0]) : null})`;
  return {
    id,
    reference,
    status: "pending" as const,
    totalMinor: total,
    currency: d.currency,
  };
}
export async function mutateOperations(
  secret: string,
  selectedTenant: unknown,
  input: unknown,
  sql: DatabaseClient = getDatabase(),
): Promise<{ id: string }> {
  const mutation = parseInput(operationsMutationSchema, input);
  const selectedId = parseInput(resourceIdSchema, selectedTenant);
  return databaseRead(() =>
    sql.begin(async (tx) => {
      await tx`SELECT s.id FROM sessions s JOIN users u ON u.id=s.user_id JOIN memberships m ON m.user_id=u.id AND m.tenant_id=${selectedId} WHERE s.token_digest=${digest(secret)} FOR SHARE OF s,u,m`;
      const { context } = await createTenantRepository(
        secret,
        selectedTenant,
        tx,
      );
      const type = mutation.type;
      assertCapability(
        context,
        type === "booking" || type === "bookingStatus"
          ? "bookings:manage"
          : type === "inquiry" || type === "stage" || type === "quote"
            ? "sales:manage"
            : "customers:manage",
      );
      const tenant = context.tenantId;
      await tx`SELECT pg_advisory_xact_lock(hashtextextended(${tenant + mutation.operationId},0))`;
      const hash = digest(JSON.stringify(mutation));
      const [prior] = await tx<
        { digest: string; result: { id: string } }[]
      >`SELECT digest,result FROM operation_receipts WHERE tenant_id=${tenant} AND operation_id=${mutation.operationId}`;
      if (prior) {
        if (prior.digest !== hash) throw new DomainError("CONFLICT");
        return prior.result;
      }
      let id: string = randomUUID();
      if (type === "customer") {
        const data = mutation.data;
        if (mutation.id) {
          id = mutation.id;
          const result =
            await tx`UPDATE customers SET name=${data.name},email=${data.email.toLowerCase()},phone=${data.phone},country=${data.country},version=version+1,updated_at=now() WHERE tenant_id=${tenant} AND id=${id} AND version=${mutation.version ?? 0} RETURNING id`;
          if (!result.length) throw new DomainError("CONFLICT");
        } else
          await tx`INSERT INTO customers(id,tenant_id,name,email,phone,country) VALUES(${id},${tenant},${data.name},${data.email.toLowerCase()},${data.phone},${data.country})`;
      } else if (type === "archiveCustomer") {
        id = mutation.id;
        const result =
          await tx`UPDATE customers SET archived=true,version=version+1,updated_at=now() WHERE tenant_id=${tenant} AND id=${id} AND version=${mutation.version} RETURNING id`;
        if (!result.length) throw new DomainError("CONFLICT");
      } else if (
        type === "activity" ||
        type === "inquiry" ||
        type === "booking"
      ) {
        const [customer] = await tx<
          CustomerRow[]
        >`SELECT * FROM customers WHERE tenant_id=${tenant} AND id=${mutation.customerId} AND archived=false`;
        if (!customer) throw new DomainError("NOT_FOUND");
        if (type === "activity") {
          if (mutation.kind === "document" && !mutation.url)
            throw new DomainError("VALIDATION_ERROR");
          await tx`INSERT INTO customer_activities(id,tenant_id,customer_id,kind,body,url,actor_id) VALUES(${id},${tenant},${customer.id},${mutation.kind},${mutation.body},${mutation.url},${context.userId})`;
        } else if (type === "inquiry")
          await tx`INSERT INTO inquiries(id,tenant_id,customer_id,title,notes) VALUES(${id},${tenant},${customer.id},${mutation.title},${mutation.notes})`;
        else {
          const booking = await createBooking(tx, tenant, {
            ...mutation,
            name: customer.name,
            email: customer.email,
            phone: customer.phone,
          });
          id = booking.id;
          if (mutation.inquiryId) {
            const result =
              await tx`UPDATE inquiries SET booking_id=${id},version=version+1,updated_at=now() WHERE tenant_id=${tenant} AND id=${mutation.inquiryId} AND customer_id=${customer.id} AND booking_id IS NULL RETURNING id`;
            if (!result.length) throw new DomainError("CONFLICT");
          }
        }
      } else if (type === "stage") {
        id = mutation.id;
        if (mutation.stage === "won") {
          const [b] =
            await tx`SELECT b.id FROM inquiries i JOIN bookings b ON b.tenant_id=i.tenant_id AND b.id=i.booking_id WHERE i.tenant_id=${tenant} AND i.id=${id} AND b.status IN ('confirmed','completed')`;
          if (!b) throw new DomainError("CONFLICT");
        }
        const r =
          await tx`UPDATE inquiries SET stage=${mutation.stage},follow_up_at=${mutation.followUpAt || null},notes=${mutation.notes},version=version+1,updated_at=now() WHERE tenant_id=${tenant} AND id=${id} AND version=${mutation.version} RETURNING id`;
        if (!r.length) throw new DomainError("CONFLICT");
      } else if (type === "quote") {
        const [i] = await tx<
          { id: string; stage: string }[]
        >`SELECT id,stage FROM inquiries WHERE tenant_id=${tenant} AND id=${mutation.inquiryId} FOR UPDATE`;
        if (!i) throw new DomainError("NOT_FOUND");
        if (["won", "lost"].includes(i.stage))
          throw new DomainError("CONFLICT");
        const d = await departurePrice(
          tx,
          tenant,
          mutation.departureId,
          mutation.travelers,
        );
        await tx`INSERT INTO sales_quotes(id,tenant_id,inquiry_id,departure_id,travelers,total_minor,currency) VALUES(${id},${tenant},${mutation.inquiryId},${mutation.departureId},${mutation.travelers},${d.totalMinor},${d.currency})`;
        await tx`UPDATE inquiries SET stage='proposal_sent',version=version+1,updated_at=now() WHERE tenant_id=${tenant} AND id=${mutation.inquiryId}`;
      } else if (type === "bookingStatus") {
        id = mutation.id;
        const [b] = await tx<
          {
            status: string;
            version: number;
            departure_id: string;
            travelers: number;
          }[]
        >`SELECT status,version,departure_id,travelers FROM bookings WHERE tenant_id=${tenant} AND id=${id} FOR UPDATE`;
        if (!b) throw new DomainError("NOT_FOUND");
        if (b.version !== mutation.version) throw new DomainError("CONFLICT");
        assertBookingTransition(b.status, mutation.status);
        if (mutation.status === "confirmed")
          await departurePrice(tx, tenant, b.departure_id, b.travelers);
        await tx`UPDATE bookings SET status=${mutation.status},version=version+1 WHERE tenant_id=${tenant} AND id=${id}`;
        if (mutation.status === "confirmed")
          await tx`UPDATE inquiries SET stage='won',version=version+1,updated_at=now() WHERE tenant_id=${tenant} AND booking_id=${id}`;
      }
      await tx`INSERT INTO audit_logs(id,tenant_id,actor_id,action,resource_id,operation_id) VALUES(${randomUUID()},${tenant},${context.userId},${`operations.${type}`},${id},${mutation.operationId})`;
      await tx`INSERT INTO operation_receipts(tenant_id,operation_id,digest,result) VALUES(${tenant},${mutation.operationId},${hash},${tx.json({ id })})`;
      return { id };
    }),
  );
}
export async function createGuestBooking(
  slug: string,
  input: unknown,
  sql: DatabaseClient = getDatabase(),
): Promise<GuestBookingResult> {
  const data = parseInput(guestBookingSchema, input);
  const storefront = await getPublishedStorefront(slug, sql);
  if (!storefront) throw new DomainError("NOT_FOUND");
  const tenant = storefront.tenantId;
  return databaseRead(() =>
    sql.begin(async (tx) => {
      await tx`SELECT pg_advisory_xact_lock(hashtextextended(${tenant + data.operationId},0))`;
      const hash = digest(JSON.stringify(data));
      const [prior] = await tx<
        {
          digest: string;
          result: {
            id: string;
            reference: string;
            status: "pending";
            totalMinor: number;
            currency: "MNT" | "USD";
          };
        }[]
      >`SELECT digest,result FROM operation_receipts WHERE tenant_id=${tenant} AND operation_id=${data.operationId}`;
      if (prior && prior.digest !== hash) throw new DomainError("CONFLICT");
      let result = prior?.result;
      if (!result) {
        const [recent] = await tx<
          { count: string }[]
        >`SELECT count(*)::text count FROM bookings WHERE tenant_id=${tenant} AND customer_email=${data.customerEmail.toLowerCase()} AND booked_at>now()-interval '1 hour'`;
        if (Number(recent?.count ?? 0) >= 5)
          throw new DomainError("RATE_LIMITED");
        const customerId = randomUUID();
        await tx`INSERT INTO customers(id,tenant_id,name,email,phone) VALUES(${customerId},${tenant},${data.customerName},${data.customerEmail.toLowerCase()},${data.customerPhone})`;
        result = await createBooking(
          tx,
          tenant,
          {
            ...data,
            customerId,
            name: data.customerName,
            email: data.customerEmail.toLowerCase(),
            phone: data.customerPhone,
            channel: "website",
          },
          true,
        );
        await tx`INSERT INTO operation_receipts(tenant_id,operation_id,digest,result) VALUES(${tenant},${data.operationId},${hash},${tx.json(result)})`;
        await tx`INSERT INTO audit_logs(id,tenant_id,action,resource_id,operation_id) VALUES(${randomUUID()},${tenant},'booking.guest_created',${result.id},${data.operationId})`;
      }
      const accessToken = randomBytes(32).toString("base64url");
      await tx`INSERT INTO booking_access_tokens(id,tenant_id,booking_id,token_digest,expires_at) VALUES(${randomUUID()},${tenant},${result.id},${digest(accessToken)},now()+interval '90 days')`;
      return { ...result, accessToken };
    }),
  );
}
export async function getTravelerBooking(
  slug: string,
  token: string,
  sql: DatabaseClient = getDatabase(),
): Promise<TravelerBooking> {
  if (!/^[A-Za-z0-9_-]{43}$/.test(token))
    throw new DomainError("UNAUTHENTICATED");
  const storefront = await getPublishedStorefront(slug, sql);
  if (!storefront) throw new DomainError("NOT_FOUND");
  return databaseRead(() =>
    sql.begin("isolation level repeatable read read only", async (tx) => {
      const [row] = await tx<
        {
          id: string;
          reference: string;
          status: TravelerBooking["status"];
          customer_name: string;
          travelers: number;
          total_minor: string;
          currency: string;
          booked_at: Date;
          departure_id: string;
          starts_on: string;
          ends_on: string;
          departure_status: string;
          tour_id: string;
          tour_snapshot: unknown;
        }[]
      >`SELECT b.id,b.reference,b.status,b.customer_name,b.travelers,b.total_minor::text,b.currency,b.booked_at,b.tour_snapshot,d.id departure_id,to_char(d.starts_on,'YYYY-MM-DD') starts_on,to_char(d.ends_on,'YYYY-MM-DD') ends_on,d.status departure_status,d.tour_id FROM booking_access_tokens a JOIN bookings b ON b.tenant_id=a.tenant_id AND b.id=a.booking_id JOIN departures d ON d.tenant_id=b.tenant_id AND d.id=b.departure_id WHERE a.tenant_id=${storefront.tenantId} AND a.token_digest=${digest(token)} AND a.revoked_at IS NULL AND a.expires_at>now()`;
      if (!row) throw new DomainError("UNAUTHENTICATED");
      const parsed = tourInputSchema.safeParse(row.tour_snapshot);
      if (!parsed.success) throw new DomainError("UNAVAILABLE");
      const tour = parsed.data;
      return {
        tenantId: storefront.tenantId,
        id: row.id,
        reference: row.reference,
        status: row.status,
        customerName: row.customer_name,
        travelers: row.travelers,
        totalMinor: integer(row.total_minor),
        currency: row.currency,
        bookedAt: row.booked_at.toISOString(),
        departure: {
          id: row.departure_id,
          startsOn: row.starts_on,
          endsOn: row.ends_on,
          status: row.departure_status,
        },
        tour: {
          id: row.tour_id,
          title: tour.title,
          destination: tour.destination,
          itinerary: tour.itinerary,
          media: tour.media,
        },
      };
    }),
  );
}
