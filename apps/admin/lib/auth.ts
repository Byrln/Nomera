import "server-only";
import { cookies } from "next/headers";

export const tenantCookie = "nomera_tenant";
export function sessionCookieName() {
  return "nomera_session";
}
export const sessionCookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
};
export async function readSession() {
  return (await cookies()).get(sessionCookieName())?.value;
}
