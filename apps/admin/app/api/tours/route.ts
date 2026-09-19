import { DomainError, toPublicError } from "@nomera/domain/errors";
import { getTourCatalog } from "@nomera/postgres/server/tours";
import { cookies } from "next/headers";
import { catalogFilter } from "@/features/tours/request";
import { sessionCookieName, tenantCookie } from "@/lib/auth";

export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "private, no-store", Vary: "Cookie" };

export async function GET(request: Request): Promise<Response> {
  try {
    const jar = await cookies();
    const secret = jar.get(sessionCookieName())?.value;
    if (!secret?.trim()) throw new DomainError("UNAUTHENTICATED");
    const tenant = jar.get(tenantCookie)?.value;
    if (!tenant) throw new DomainError("FORBIDDEN");
    const filter = catalogFilter(new URL(request.url).searchParams);
    return Response.json(
      { data: await getTourCatalog(secret, tenant, filter) },
      { headers },
    );
  } catch (error) {
    const safe = toPublicError(error);
    return Response.json(
      { error: { code: safe.code, message: safe.message } },
      { status: safe.status, headers },
    );
  }
}
