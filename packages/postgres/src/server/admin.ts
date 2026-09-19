import "server-only";
import { assertCapability } from "@nomera/domain/tenancy";
import { type DatabaseClient, getDatabase } from "../server";
import { databaseRead } from "./errors";
import { createTenantRepository } from "./tenant";

export async function getAdminHeader(
  secret: string,
  tenantId: string,
  sql: DatabaseClient = getDatabase(),
) {
  return databaseRead(() =>
    sql.begin("isolation level repeatable read read only", async (tx) => {
      const { context } = await createTenantRepository(secret, tenantId, tx);
      assertCapability(context, "tours:read");
      const [user] = await tx<
        { email: string }[]
      >`SELECT email FROM users WHERE id=${context.userId}`;
      const [pending] = await tx<
        { count: string }[]
      >`SELECT count(*)::text count FROM bookings WHERE tenant_id=${context.tenantId} AND status='pending'`;
      const [published] = await tx<
        { slug: string }[]
      >`SELECT slug FROM storefront_publications WHERE tenant_id=${context.tenantId} AND effective_at<=now() AND cancelled_at IS NULL ORDER BY effective_at DESC,version DESC LIMIT 1`;
      return {
        email: user?.email ?? "",
        pending: Number(pending?.count ?? 0),
        slug: published?.slug ?? null,
      };
    }),
  );
}
export async function searchAdmin(
  secret: string,
  tenantId: string,
  input: string,
  sql: DatabaseClient = getDatabase(),
) {
  const query = input.trim().slice(0, 120);
  return databaseRead(() =>
    sql.begin("isolation level repeatable read read only", async (tx) => {
      await tx`SET LOCAL statement_timeout = '5s'`;
      const { context } = await createTenantRepository(secret, tenantId, tx);
      assertCapability(context, "tours:read");
      if (query.length < 2) return [];
      // Search literal substrings. Wildcard input cannot broaden the tenant-bound query.
      const rows = await tx<
        {
          id: string;
          kind: "tour" | "customer" | "booking";
          title: string;
          detail: string;
        }[]
      >`
      (SELECT id, 'tour'::text kind, title, destination detail FROM tours WHERE tenant_id=${context.tenantId} AND position(lower(${query}) IN lower(title || ' ' || code))>0 ORDER BY updated_at DESC LIMIT 5)
      UNION ALL
      (SELECT id, 'customer'::text kind, name title, email detail FROM customers WHERE tenant_id=${context.tenantId} AND position(lower(${query}) IN lower(name || ' ' || email))>0 ORDER BY updated_at DESC LIMIT 5)
      UNION ALL
      (SELECT id, 'booking'::text kind, reference title, customer_name detail FROM bookings WHERE tenant_id=${context.tenantId} AND position(lower(${query}) IN lower(reference || ' ' || customer_name))>0 ORDER BY booked_at DESC LIMIT 5)`;
      return rows.map((row) => ({
        ...row,
        href:
          row.kind === "tour"
            ? `/tours/${row.id}`
            : row.kind === "customer"
              ? `/customers/${row.id}`
              : `/bookings?search=${encodeURIComponent(row.title)}`,
      }));
    }),
  );
}
