import { DomainError, toPublicError } from "@nomera/domain/errors";
import { downloadCustomerFile } from "@nomera/postgres/server/media";
import { cookies } from "next/headers";
import { sessionCookieName, tenantCookie } from "@/lib/auth";
export const runtime = "nodejs";
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const jar = await cookies(),
      secret = jar.get(sessionCookieName())?.value,
      tenant = jar.get(tenantCookie)?.value;
    if (!secret) throw new DomainError("UNAUTHENTICATED");
    if (!tenant) throw new DomainError("FORBIDDEN");
    const file = await downloadCustomerFile(secret, tenant, (await params).id);
    return new Response(Buffer.from(file.content), {
      headers: {
        "Content-Type": file.mimeType,
        "Content-Length": String(file.content.byteLength),
        "Content-Disposition": `attachment; filename="document"; filename*=UTF-8''${encodeURIComponent(file.filename).replace(/['()*]/g, (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`)}`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
        "Content-Security-Policy": "default-src 'none'; sandbox",
        "Cross-Origin-Resource-Policy": "same-origin",
      },
    });
  } catch (error) {
    const result = toPublicError(error);
    return Response.json(
      { ok: false, code: result.code },
      { status: result.status, headers: { "Cache-Control": "no-store" } },
    );
  }
}
