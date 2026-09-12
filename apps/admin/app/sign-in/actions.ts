"use server";
import { DomainError, toPublicError } from "@nomera/domain/errors";
import {
  createLoginSession,
  revokeLoginSession,
} from "@nomera/postgres/server/auth";
import { createTenantRepository } from "@nomera/postgres/server/tenant";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  readSession,
  sessionCookieName,
  sessionCookieOptions,
  tenantCookie,
} from "@/lib/auth";

export type AuthActionState = { error?: string };

// Next Server Actions enforce POST and same-origin requests. No arbitrary return URLs.
export async function signIn(
  _previous: AuthActionState,
  data: FormData,
): Promise<AuthActionState> {
  try {
    const session = await createLoginSession({
      email: data.get("email"),
      password: data.get("password"),
    });
    const jar = await cookies();
    jar.set(sessionCookieName(), session.secret, {
      ...sessionCookieOptions,
      expires: session.expires,
    });
    jar.set(tenantCookie, "", { ...sessionCookieOptions, maxAge: 0 });
  } catch (error) {
    return { error: toPublicError(error).code };
  }
  redirect("/workspaces");
}

export async function signOut(
  _previous: AuthActionState,
  _data: FormData,
): Promise<AuthActionState> {
  try {
    const secret = await readSession();
    if (secret) await revokeLoginSession(secret);
    const jar = await cookies();
    jar.set(sessionCookieName(), "", { ...sessionCookieOptions, maxAge: 0 });
    jar.set(tenantCookie, "", { ...sessionCookieOptions, maxAge: 0 });
  } catch (error) {
    return { error: toPublicError(error).code };
  }
  redirect("/sign-in");
}

export async function selectWorkspace(
  _previous: AuthActionState,
  data: FormData,
): Promise<AuthActionState> {
  try {
    const secret = await readSession();
    if (!secret) throw new DomainError("UNAUTHENTICATED");
    const repo = await createTenantRepository(secret, data.get("tenantId"));
    (await cookies()).set(
      tenantCookie,
      repo.context.tenantId,
      sessionCookieOptions,
    );
  } catch (error) {
    return { error: toPublicError(error).code };
  }
  redirect("/workspaces");
}
