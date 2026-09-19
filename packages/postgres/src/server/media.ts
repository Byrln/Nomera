import "server-only";
import { createHash, randomUUID } from "node:crypto";
import { DomainError, parseInput } from "@nomera/domain/errors";
import { assertFileContent } from "@nomera/domain/media";
import { assertCapability } from "@nomera/domain/tenancy";
import { mediaUploadSchema } from "@nomera/schemas/media";
import { resourceIdSchema } from "@nomera/schemas/security";
import { type DatabaseClient, getDatabase } from "../server";
import { databaseRead } from "./errors";
import { createTenantRepository } from "./tenant";
export async function uploadCustomerFile(
  secret: string,
  tenant: unknown,
  input: unknown,
  content: Uint8Array,
  database: DatabaseClient = getDatabase(),
): Promise<{ id: string; url: string }> {
  const data = parseInput(mediaUploadSchema, input);
  assertFileContent(content, data.mimeType);
  const checksum = createHash("sha256").update(content).digest("hex");
  return databaseRead(() =>
    database.begin(async (sql) => {
      if (!secret.trim()) throw new DomainError("UNAUTHENTICATED");
      const tenantId = parseInput(resourceIdSchema, tenant);
      await sql`SELECT s.id FROM sessions s JOIN users u ON u.id=s.user_id JOIN memberships m ON m.user_id=u.id AND m.tenant_id=${tenantId} WHERE s.token_digest=${createHash("sha256").update(secret).digest("hex")} FOR SHARE OF s,u,m`;
      const { context } = await createTenantRepository(secret, tenant, sql);
      assertCapability(context, "customers:manage");
      await sql`SELECT pg_advisory_xact_lock(hashtextextended(${context.tenantId + data.operationId},0))`;
      const [existing] = await sql<
        {
          id: string;
          customer_id: string;
          filename: string;
          mime_type: string;
          sha256: string;
        }[]
      >`SELECT id,customer_id,filename,mime_type,sha256 FROM customer_files WHERE tenant_id=${context.tenantId} AND operation_id=${data.operationId}`;
      if (existing) {
        if (
          existing.customer_id !== data.customerId ||
          existing.filename !== data.filename ||
          existing.mime_type !== data.mimeType ||
          existing.sha256 !== checksum
        )
          throw new DomainError("CONFLICT");
        return { id: existing.id, url: `/api/media/${existing.id}` };
      }
      const [customer] =
        await sql`SELECT id FROM customers WHERE tenant_id=${context.tenantId} AND id=${data.customerId} AND archived=false FOR SHARE`;
      if (!customer) throw new DomainError("NOT_FOUND");
      const id = randomUUID(),
        url = `/api/media/${id}`;
      await sql`INSERT INTO customer_files(id,tenant_id,customer_id,filename,mime_type,content,sha256,operation_id,created_by) VALUES(${id},${context.tenantId},${data.customerId},${data.filename},${data.mimeType},${Buffer.from(content)},${checksum},${data.operationId},${context.userId})`;
      await sql`INSERT INTO customer_activities(id,tenant_id,customer_id,kind,body,url,actor_id) VALUES(${randomUUID()},${context.tenantId},${data.customerId},'document',${data.filename},${url},${context.userId})`;
      await sql`INSERT INTO audit_logs(id,tenant_id,actor_id,action,resource_id,operation_id) VALUES(${randomUUID()},${context.tenantId},${context.userId},'customer.file_uploaded',${id},${data.operationId})`;
      return { id, url };
    }),
  );
}
export async function downloadCustomerFile(
  secret: string,
  tenant: unknown,
  id: unknown,
  database: DatabaseClient = getDatabase(),
): Promise<{ filename: string; mimeType: string; content: Uint8Array }> {
  const fileId = parseInput(resourceIdSchema, id);
  return databaseRead(() =>
    database.begin("isolation level repeatable read read only", async (sql) => {
      const { context } = await createTenantRepository(secret, tenant, sql);
      assertCapability(context, "customers:read");
      const [file] = await sql<
        { filename: string; mime_type: string; content: Buffer }[]
      >`SELECT filename,mime_type,content FROM customer_files WHERE tenant_id=${context.tenantId} AND id=${fileId}`;
      if (!file) throw new DomainError("NOT_FOUND");
      return {
        filename: file.filename,
        mimeType: file.mime_type,
        content: new Uint8Array(file.content),
      };
    }),
  );
}
