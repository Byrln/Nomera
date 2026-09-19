"use server";
import { DomainError, toPublicError } from "@nomera/domain/errors";
import { mutateOperations } from "@nomera/postgres/server/operations";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { sessionCookieName, tenantCookie } from "@/lib/auth";
export async function submitOperation(input: unknown) {
  try {
    const jar = await cookies();
    const secret = jar.get(sessionCookieName())?.value,
      tenant = jar.get(tenantCookie)?.value;
    if (!secret) throw new DomainError("UNAUTHENTICATED");
    if (!tenant) throw new DomainError("FORBIDDEN");
    const result = await mutateOperations(secret, tenant, input);
    for (const path of [
      "/customers",
      "/sales",
      "/bookings",
      "/dashboard",
      "/finance",
      "/reports",
    ])
      revalidatePath(path);
    revalidatePath("/customers/[customerId]", "page");
    return { ok: true as const, id: result.id };
  } catch (error) {
    return { ok: false as const, code: toPublicError(error).code };
  }
}
