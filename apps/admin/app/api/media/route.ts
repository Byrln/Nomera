import { DomainError, toPublicError } from "@nomera/domain/errors";
import { uploadCustomerFile } from "@nomera/postgres/server/media";
import { maxUploadBytes } from "@nomera/schemas/media";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { sessionCookieName, tenantCookie } from "@/lib/auth";
export const runtime = "nodejs";
export async function POST(request: Request) {
  try {
    if (request.headers.get("origin") !== new URL(request.url).origin)
      throw new DomainError("FORBIDDEN");
    const jar = await cookies(),
      secret = jar.get(sessionCookieName())?.value,
      tenant = jar.get(tenantCookie)?.value;
    if (!secret) throw new DomainError("UNAUTHENTICATED");
    if (!tenant) throw new DomainError("FORBIDDEN");
    const limit = maxUploadBytes + 64 * 1024;
    const declared = Number(request.headers.get("content-length") ?? 0);
    if (declared > limit) throw new DomainError("VALIDATION_ERROR");
    const reader = request.body?.getReader();
    if (!reader) throw new DomainError("VALIDATION_ERROR");
    let length = 0;
    const chunks: Uint8Array[] = [];
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      length += chunk.value.byteLength;
      if (length > limit) {
        await reader.cancel();
        throw new DomainError("VALIDATION_ERROR");
      }
      chunks.push(chunk.value);
    }
    const buffer = Buffer.concat(chunks.map((chunk) => Buffer.from(chunk)));
    const body = await new Response(buffer, {
      headers: { "Content-Type": request.headers.get("content-type") ?? "" },
    }).formData();
    const file = body.get("file");
    if (!(file instanceof File) || file.size > maxUploadBytes)
      throw new DomainError("VALIDATION_ERROR");
    const customerId = body.get("customerId");
    const result = await uploadCustomerFile(
      secret,
      tenant,
      {
        customerId,
        operationId: body.get("operationId"),
        filename: file.name,
        mimeType: file.type,
      },
      new Uint8Array(await file.arrayBuffer()),
    );
    revalidatePath(`/customers/${customerId}`);
    return Response.json(
      { ok: true, ...result },
      { status: 201, headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    const result = toPublicError(error);
    return Response.json(
      { ok: false, code: result.code },
      { status: result.status, headers: { "Cache-Control": "no-store" } },
    );
  }
}
