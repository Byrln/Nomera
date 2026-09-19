import { createHash, randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import postgres from "postgres";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  getFinance,
  getMarketing,
  getReports,
  getSettings,
  mutateFinance,
  mutateMarketing,
  mutateSettings,
} from "./finance";
import { downloadCustomerFile, uploadCustomerFile } from "./media";

const url = process.env.TEST_DATABASE_URL;
const schema = `finance_test_${randomUUID().replaceAll("-", "")}`;
const tenant = randomUUID(),
  other = randomUUID(),
  user = randomUUID(),
  viewer = randomUUID(),
  secret = randomUUID(),
  viewerSecret = randomUUID(),
  booking = randomUUID(),
  foreignBooking = randomUUID();
let sql: ReturnType<typeof postgres>, control: ReturnType<typeof postgres>;
describe.skipIf(!url)(
  "finance tenant isolation and ledger transactions",
  () => {
    beforeAll(async () => {
      if (
        !["localhost", "127.0.0.1", "[::1]"].includes(
          new URL(url ?? "").hostname,
        )
      )
        throw new Error("Local PostgreSQL required.");
      control = postgres(url ?? "", { max: 1, onnotice: () => {} });
      await control.unsafe(`CREATE SCHEMA ${schema}`);
      sql = postgres(url ?? "", {
        max: 4,
        connection: { search_path: schema },
        onnotice: () => {},
      });
      for (const migration of [
        "0001_foundation.sql",
        "0002_dashboard.sql",
        "0003_tours_departures.sql",
        "0004_operations.sql",
        "0005_finance.sql",
        "0008_media.sql",
      ])
        await sql.unsafe(
          await readFile(
            new URL(`../../../../db/migrations/${migration}`, import.meta.url),
            "utf8",
          ),
        );
      for (const tid of [tenant, other])
        await sql`INSERT INTO organizations(id,name) VALUES(${tid},'Operator')`;
      for (const [uid, token, role] of [
        [user, secret, "owner"],
        [viewer, viewerSecret, "viewer"],
      ] as const) {
        await sql`INSERT INTO users(id,email,password_hash,email_verified) VALUES(${uid},${`${uid}@example.test`},'unusable',true)`;
        await sql`INSERT INTO memberships(id,tenant_id,user_id,role) VALUES(${randomUUID()},${tenant},${uid},${role})`;
        await sql`INSERT INTO sessions(id,user_id,token_digest,expires_at) VALUES(${randomUUID()},${uid},${createHash("sha256").update(token).digest("hex")},now()+interval '1 day')`;
      }
      for (const [tid, bid] of [
        [tenant, booking],
        [other, foreignBooking],
      ] as const) {
        const tour = randomUUID(),
          departure = randomUUID();
        await sql`INSERT INTO tours(id,tenant_id,title,code,destination) VALUES(${tour},${tid},'Tour',${tour},'Gobi')`;
        await sql`INSERT INTO departures(id,tenant_id,tour_id,starts_on,ends_on,status,capacity) VALUES(${departure},${tid},${tour},'2026-10-01','2026-10-02','confirmed',5)`;
        await sql`INSERT INTO bookings(id,tenant_id,departure_id,reference,customer_name,status,channel,total_minor,currency,travelers,cost_minor) VALUES(${bid},${tid},${departure},${bid},'Customer','confirmed','direct',1000,'MNT',2,300)`;
      }
    });
    afterAll(async () => {
      if (sql) await sql.end();
      if (control) {
        await control.unsafe(`DROP SCHEMA IF EXISTS ${schema} CASCADE`);
        await control.end();
      }
    });
    it("denies foreign tenants, roles, resources and unauthenticated access", async () => {
      await expect(getFinance(secret, other, {}, sql)).rejects.toMatchObject({
        code: "FORBIDDEN",
      });
      await expect(
        getFinance(viewerSecret, tenant, {}, sql),
      ).rejects.toMatchObject({ code: "FORBIDDEN" });
      await expect(getFinance("", tenant, {}, sql)).rejects.toMatchObject({
        code: "UNAUTHENTICATED",
      });
      await expect(
        mutateFinance(
          secret,
          tenant,
          {
            action: "payment",
            bookingId: foreignBooking,
            amountMinor: 1,
            method: "cash",
            reference: "Foreign",
            requestId: randomUUID(),
          },
          sql,
        ),
      ).rejects.toMatchObject({ code: "NOT_FOUND" });
    });
    it("serializes collection and preserves idempotency", async () => {
      const command = {
        action: "payment",
        bookingId: booking,
        amountMinor: 600,
        method: "bank_transfer",
        reference: "Receipt",
        requestId: randomUUID(),
      };
      const results = await Promise.allSettled([
        mutateFinance(secret, tenant, command, sql),
        mutateFinance(
          secret,
          tenant,
          { ...command, requestId: randomUUID() },
          sql,
        ),
      ]);
      expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
      const ledger = await getFinance(secret, tenant, {}, sql);
      expect(ledger.collectedMinor).toBe(600);
      expect(ledger.outstandingMinor).toBe(400);
      const [saved] = await sql<
        { request_id: string }[]
      >`SELECT request_id FROM ledger_entries WHERE tenant_id=${tenant}`;
      expect(saved).toBeTruthy();
      await mutateFinance(
        secret,
        tenant,
        { ...command, requestId: saved?.request_id },
        sql,
      );
      expect((await getFinance(secret, tenant, {}, sql)).entries).toHaveLength(
        1,
      );
      await expect(
        mutateFinance(
          secret,
          tenant,
          { ...command, amountMinor: 100, requestId: saved?.request_id },
          sql,
        ),
      ).rejects.toMatchObject({ code: "CONFLICT" });
    });
    it("enforces refunds and snapshots invoices with manual reconciliation", async () => {
      const command = {
        action: "refund",
        bookingId: booking,
        amountMinor: 601,
        method: "cash",
        reference: "Cancellation refund",
        requestId: randomUUID(),
      };
      await expect(
        mutateFinance(secret, tenant, command, sql),
      ).rejects.toMatchObject({ code: "CONFLICT" });
      await mutateFinance(
        secret,
        tenant,
        { ...command, amountMinor: 100 },
        sql,
      );
      await mutateFinance(
        secret,
        tenant,
        { action: "invoice", bookingId: booking, dueOn: "2026-10-01" },
        sql,
      );
      let data = await getFinance(secret, tenant, {}, sql);
      expect(data.refundedMinor).toBe(100);
      expect(data.invoices[0]).toMatchObject({
        totalMinor: 1000,
        paidMinor: 500,
      });
      await mutateFinance(
        secret,
        tenant,
        { action: "reconcile", entryId: data.entries[0]?.id },
        sql,
      );
      data = await getFinance(secret, tenant, {}, sql);
      expect(data.entries[0]?.reconciledAt).not.toBeNull();
      await expect(
        mutateFinance(
          secret,
          other,
          { action: "reconcile", entryId: data.entries[0]?.id },
          sql,
        ),
      ).rejects.toMatchObject({ code: "FORBIDDEN" });
    });
    it("persists promotions and keeps currency and real report costs scoped", async () => {
      await mutateMarketing(
        secret,
        tenant,
        {
          action: "promotion",
          data: {
            code: "WELCOME",
            kind: "percent",
            value: 10,
            currency: "MNT",
            startsAt: "2026-01-01T00:00:00Z",
            endsAt: null,
            maxUses: 10,
          },
        },
        sql,
      );
      expect(
        (await getMarketing(secret, tenant, sql)).promotions[0],
      ).toMatchObject({ code: "WELCOME", uses: 0 });
      const data = await getReports(secret, tenant, {}, sql);
      expect(data).toMatchObject({
        bookings: 1,
        travelers: 2,
        revenueMinor: 1000,
        grossMarginMinor: 700,
        costedBookings: 1,
      });
      expect(
        (await getReports(secret, tenant, { currency: "USD" }, sql))
          .revenueMinor,
      ).toBe(0);
    });
    it("applies operator-timezone date ranges to ledger and report aggregates", async () => {
      const [date] = await sql<
        { day: string }[]
      >`SELECT to_char(now() AT TIME ZONE 'Asia/Ulaanbaatar','YYYY-MM-DD') AS day`;
      if (!date) throw new Error("Missing database date");
      const today = { from: date.day, to: date.day, currency: "MNT" };
      const reports = await getReports(secret, tenant, today, sql);
      expect(reports.bookings).toBe(1);
      expect(
        (await getReports(secret, tenant, { ...today, channel: "agent" }, sql))
          .bookings,
      ).toBe(0);
      expect(
        (
          await getReports(
            secret,
            tenant,
            { ...today, destination: "Gobi" },
            sql,
          )
        ).bookings,
      ).toBe(1);
      expect(
        (
          await getReports(
            secret,
            tenant,
            { ...today, destination: "Missing destination" },
            sql,
          )
        ).monthly,
      ).toEqual([]);
      expect(reports.availableDestinations).toEqual(["Gobi"]);
      expect(reports.monthly).toEqual([
        { month: date.day.slice(0, 7), bookings: 1, revenueMinor: 1000 },
      ]);
      const historical = {
        from: "2000-01-01",
        to: "2000-01-02",
        currency: "MNT",
      };
      const emptyReports = await getReports(secret, tenant, historical, sql);
      expect(emptyReports).toMatchObject({
        bookings: 0,
        revenueMinor: 0,
        monthly: [],
        sources: [],
        tours: [],
        destinations: [],
      });
      const emptyLedger = await getFinance(secret, tenant, historical, sql);
      expect(emptyLedger).toMatchObject({
        collectedMinor: 0,
        refundedMinor: 0,
        outstandingMinor: 0,
        bookings: [],
        entries: [],
        invoices: [],
        cashFlow: [],
      });
      expect(
        (await getMarketing(secret, tenant, sql, historical)).sources,
      ).toEqual([]);
    });
    it("authorizes settings and prevents stale overwrites", async () => {
      await expect(
        getSettings(viewerSecret, tenant, sql),
      ).rejects.toMatchObject({ code: "FORBIDDEN" });
      await mutateSettings(
        secret,
        tenant,
        { name: "Updated operator", previousName: "Operator" },
        sql,
      );
      expect((await getSettings(secret, tenant, sql)).name).toBe(
        "Updated operator",
      );
      await expect(
        mutateSettings(
          secret,
          tenant,
          { name: "Stale", previousName: "Operator" },
          sql,
        ),
      ).rejects.toMatchObject({ code: "CONFLICT" });
      const [foreign] = await sql<
        { name: string }[]
      >`SELECT name FROM organizations WHERE id=${other}`;
      expect(foreign?.name).toBe("Operator");
    });
    it("stores private files with tenant isolation, signature checks and idempotent activities", async () => {
      const customerId = randomUUID(),
        operationId = randomUUID();
      await sql`INSERT INTO customers(id,tenant_id,name) VALUES(${customerId},${tenant},'Document customer')`;
      const bytes = new TextEncoder().encode(
          "%PDF-1.4\nprivate document\n%%EOF",
        ),
        input = {
          customerId,
          operationId,
          filename: "Passport.pdf",
          mimeType: "application/pdf",
        };
      await expect(
        uploadCustomerFile(viewerSecret, tenant, input, bytes, sql),
      ).rejects.toMatchObject({ code: "FORBIDDEN" });
      await expect(
        uploadCustomerFile(
          secret,
          tenant,
          { ...input, mimeType: "image/png" },
          bytes,
          sql,
        ),
      ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
      const file = await uploadCustomerFile(secret, tenant, input, bytes, sql);
      expect(
        await uploadCustomerFile(secret, tenant, input, bytes, sql),
      ).toEqual(file);
      expect(
        (await downloadCustomerFile(secret, tenant, file.id, sql)).content,
      ).toEqual(bytes);
      await expect(
        downloadCustomerFile(secret, other, file.id, sql),
      ).rejects.toMatchObject({ code: "FORBIDDEN" });
      await expect(
        downloadCustomerFile(secret, tenant, randomUUID(), sql),
      ).rejects.toMatchObject({ code: "NOT_FOUND" });
      await expect(
        uploadCustomerFile(
          secret,
          tenant,
          { ...input, filename: "Different.pdf" },
          bytes,
          sql,
        ),
      ).rejects.toMatchObject({ code: "CONFLICT" });
      const [count] = await sql<
        { count: string }[]
      >`SELECT count(*)::text count FROM customer_activities WHERE tenant_id=${tenant} AND customer_id=${customerId}`;
      expect(count?.count).toBe("1");
    });
  },
);
