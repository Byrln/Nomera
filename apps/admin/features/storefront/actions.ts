"use server";
import { DomainError, toPublicError } from "@nomera/domain/errors";
import { mutateStorefront } from "@nomera/postgres/server/storefront";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { sessionCookieName, tenantCookie } from "@/lib/auth";
export async function submitStorefront(input: unknown) {
  try {
    const jar = await cookies();
    const secret = jar.get(sessionCookieName())?.value;
    const tenant = jar.get(tenantCookie)?.value;
    if (!secret) throw new DomainError("UNAUTHENTICATED");
    if (!tenant) throw new DomainError("FORBIDDEN");
    const data = await mutateStorefront(secret, tenant, input);
    revalidatePath("/storefront", "layout");
    return { ok: true as const, data };
  } catch (error) {
    return { ok: false as const, code: toPublicError(error).code };
  }
}
