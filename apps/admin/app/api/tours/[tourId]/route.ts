import { DomainError, toPublicError } from "@nomera/domain/errors";
import { getTourDetail } from "@nomera/postgres/server/tours";
import { cookies } from "next/headers";
import { sessionCookieName, tenantCookie } from "@/lib/auth";

export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "private, no-store", Vary: "Cookie" };

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ tourId: string }> },
): Promise<Response> {
  try {
    const jar = await cookies();
    const secret = jar.get(sessionCookieName())?.value;
    if (!secret?.trim()) throw new DomainError("UNAUTHENTICATED");
    const tenant = jar.get(tenantCookie)?.value;
    if (!tenant) throw new DomainError("FORBIDDEN");
    return Response.json(
      { data: await getTourDetail(secret, tenant, (await params).tourId) },
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
