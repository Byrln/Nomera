import { DomainError, toPublicError } from "@nomera/domain/errors";
import { getDashboard } from "@nomera/postgres/server/dashboard";
import { defaultDashboardFilter } from "@nomera/schemas/dashboard";
import { cookies } from "next/headers";
import { sessionCookieName, tenantCookie } from "@/lib/auth";

export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "private, no-store", Vary: "Cookie" };

export async function GET(request: Request): Promise<Response> {
  try {
    const jar = await cookies();
    const secret = jar.get(sessionCookieName())?.value;
    if (!secret?.trim()) throw new DomainError("UNAUTHENTICATED");
    const tenantId = jar.get(tenantCookie)?.value;
    if (!tenantId) throw new DomainError("FORBIDDEN");
    const query = new URL(request.url).searchParams;
    const defaults = defaultDashboardFilter();
    const filter = {
      from: query.get("from") ?? defaults.from,
      to: query.get("to") ?? defaults.to,
      currency: query.get("currency") ?? defaults.currency,
    };
    const data = await getDashboard(secret, tenantId, filter);
    return Response.json({ data }, { headers });
  } catch (error) {
    const safe = toPublicError(error);
    return Response.json(
      { error: { code: safe.code, message: safe.message } },
      { status: safe.status, headers },
    );
  }
}
