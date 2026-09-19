"use server";
import {
  DomainError,
  type ErrorCode,
  toPublicError,
} from "@nomera/domain/errors";
import {
  mutateFinance,
  mutateMarketing,
  mutateSettings,
} from "@nomera/postgres/server/finance";

export async function submitSettings(input: unknown): Promise<Result> {
  try {
    const { secret, tenant } = await credentials();
    await mutateSettings(secret, tenant, input);
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (error) {
    return { ok: false, code: toPublicError(error).code };
  }
}

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { sessionCookieName, tenantCookie } from "@/lib/auth";

type Result = { ok: true } | { ok: false; code: ErrorCode };
async function credentials() {
  const jar = await cookies();
  const secret = jar.get(sessionCookieName())?.value;
  const tenant = jar.get(tenantCookie)?.value;
  if (!secret) throw new DomainError("UNAUTHENTICATED");
  if (!tenant) throw new DomainError("FORBIDDEN");
  return { secret, tenant };
}
export async function submitFinance(input: unknown): Promise<Result> {
  try {
    const { secret, tenant } = await credentials();
    await mutateFinance(secret, tenant, input);
    revalidatePath("/finance");
    revalidatePath("/reports");
    return { ok: true };
  } catch (error) {
    return { ok: false, code: toPublicError(error).code };
  }
}
export async function submitMarketing(input: unknown): Promise<Result> {
  try {
    const { secret, tenant } = await credentials();
    await mutateMarketing(secret, tenant, input);
    revalidatePath("/marketing");
    return { ok: true };
  } catch (error) {
    return { ok: false, code: toPublicError(error).code };
  }
}
