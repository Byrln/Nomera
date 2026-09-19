import "server-only";
import { createHash, randomUUID } from "node:crypto";
import { DomainError, parseInput } from "@nomera/domain/errors";
import {
  authorizeJourneyMutation,
  travelerJourney,
} from "@nomera/domain/journey";
import { assertCapability } from "@nomera/domain/tenancy";
import { type JourneyData, journeyInputSchema } from "@nomera/schemas/journey";
import { resourceIdSchema } from "@nomera/schemas/security";
import { type DatabaseClient, getDatabase } from "../server";
import { databaseRead } from "./errors";
import { getTravelerBooking } from "./operations";
import { createTenantRepository } from "./tenant";

export async function getJourneyOptions(
  secret: string,
  selectedTenant: unknown,
  sql?: DatabaseClient,
) {
  return databaseRead(() =>
    (sql ?? getDatabase()).begin(
      "isolation level repeatable read read only",
      async (tx) => {
        const { context } = await createTenantRepository(
          secret,
          selectedTenant,
          tx,
        );
        assertCapability(context, "journey:read");
        return tx<
          { id: string; title: string; startsOn: string }[]
        >`SELECT d.id,t.title,to_char(d.starts_on,'YYYY-MM-DD') "startsOn" FROM departures d JOIN tours t ON t.tenant_id=d.tenant_id AND t.id=d.tour_id WHERE d.tenant_id=${context.tenantId} ORDER BY d.starts_on DESC LIMIT 200`;
      },
    ),
  );
}
export async function getJourney(
  secret: string,
  selectedTenant: unknown,
  id: unknown,
  sql?: DatabaseClient,
): Promise<JourneyData> {
  const departureId = parseInput(resourceIdSchema, id);
  return databaseRead(() =>
    (sql ?? getDatabase()).begin(
      "isolation level repeatable read read only",
      async (tx) => {
        const { context } = await createTenantRepository(
          secret,
          selectedTenant,
          tx,
        );
        assertCapability(context, "journey:read");
        const [row] = await tx<
          { title: string; version: number | null; steps: unknown }[]
        >`SELECT t.title,j.version,j.steps FROM departures d JOIN tours t ON t.tenant_id=d.tenant_id AND t.id=d.tour_id LEFT JOIN departure_journeys j ON j.tenant_id=d.tenant_id AND j.departure_id=d.id WHERE d.tenant_id=${context.tenantId} AND d.id=${departureId}`;
        if (!row) throw new DomainError("NOT_FOUND");
        return {
          ...parseInput(journeyInputSchema, {
            departureId,
            version: row.version ?? 0,
            steps: row.steps ?? [],
          }),
          departureTitle: row.title,
        };
      },
    ),
  );
}
export async function saveJourney(
  secret: string,
  selectedTenant: unknown,
  input: unknown,
  sql?: DatabaseClient,
): Promise<JourneyData> {
  const database = sql ?? getDatabase();
  const tenantId = parseInput(resourceIdSchema, selectedTenant);
  const parsed = await databaseRead(() =>
    database.begin(async (tx) => {
      await tx`SET LOCAL statement_timeout='10s'`;
      await tx`SELECT s.id FROM sessions s JOIN users u ON u.id=s.user_id JOIN memberships m ON m.user_id=u.id AND m.tenant_id=${tenantId} WHERE s.token_digest=${createHash("sha256").update(secret).digest("hex")} FOR SHARE OF s,u,m`;
      const { context } = await createTenantRepository(secret, tenantId, tx);
      const command = authorizeJourneyMutation(context, input);
      const [departure] = await tx<
        { id: string }[]
      >`SELECT id FROM departures WHERE tenant_id=${context.tenantId} AND id=${command.departureId} FOR UPDATE`;
      if (!departure) throw new DomainError("NOT_FOUND");
      const [existing] = await tx<
        { version: number }[]
      >`SELECT version FROM departure_journeys WHERE tenant_id=${context.tenantId} AND departure_id=${command.departureId}`;
      if ((existing?.version ?? 0) !== command.version)
        throw new DomainError("CONFLICT");
      await tx`INSERT INTO departure_journeys (tenant_id,departure_id,version,steps,updated_by) VALUES (${context.tenantId},${command.departureId},${command.version + 1},${tx.json(command.steps)},${context.userId}) ON CONFLICT (tenant_id,departure_id) DO UPDATE SET version=excluded.version,steps=excluded.steps,updated_by=excluded.updated_by,updated_at=now()`;
      await tx`INSERT INTO audit_logs(id,tenant_id,actor_id,action,resource_id,operation_id) VALUES(${randomUUID()},${context.tenantId},${context.userId},'journey.save',${command.departureId},${randomUUID()})`;
      return command;
    }),
  );
  return getJourney(secret, selectedTenant, parsed.departureId, database);
}
export async function getTravelerJourney(
  slug: string,
  token: string,
  sql?: DatabaseClient,
) {
  const database = sql ?? getDatabase();
  const booking = await getTravelerBooking(slug, token, database);
  const [row] = await databaseRead(
    () =>
      database<
        { version: number; steps: unknown }[]
      >`SELECT version,steps FROM departure_journeys WHERE tenant_id=${booking.tenantId} AND departure_id=${booking.departure.id}`,
  );
  if (!row) return [];
  const parsed = parseInput(journeyInputSchema, {
    departureId: booking.departure.id,
    version: row.version,
    steps: row.steps,
  });
  return travelerJourney(parsed.steps);
}
