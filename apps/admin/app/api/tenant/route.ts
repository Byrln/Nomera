import { DomainError, toPublicError } from "@nomera/domain/errors";
import { createTenantRepository } from "@nomera/postgres/server/tenant";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "private, no-store", Vary: "Cookie" };

// Read-only integration boundary. A tenant selector is a request, never a grant.
// Login/session issuance is a separate Phase 1 workflow; there is no preview bypass.
export async function GET(request: Request): Promise<Response> {
  try {
    const cookieStore = await cookies();
    const session = cookieStore.get("nomera_session")?.value;
    if (!session?.trim()) throw new DomainError("UNAUTHENTICATED");
    const selectedTenant = new URL(request.url).searchParams.get("tenantId");
    const repository = await createTenantRepository(session, selectedTenant);
    return Response.json({ data: await repository.getSummary() }, { headers });
  } catch (error) {
    const safe = toPublicError(error);
    return Response.json(
      { error: { code: safe.code, message: safe.message } },
      { status: safe.status, headers },
    );
  }
}
