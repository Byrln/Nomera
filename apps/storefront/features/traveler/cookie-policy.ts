import { createHash } from "node:crypto";

export function travelerCookieName(slug: string) {
  return `nomera_trip_${createHash("sha256").update(slug).digest("hex").slice(0, 20)}`;
}
export function travelerCookieOptions(slug: string) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: `/o/${encodeURIComponent(slug)}`,
    maxAge: 90 * 24 * 60 * 60,
  };
}
