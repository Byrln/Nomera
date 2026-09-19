"use server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { travelerCookieName, travelerCookieOptions } from "./access";

export async function leaveTrip(slug: string) {
  (await cookies()).set(travelerCookieName(slug), "", {
    ...travelerCookieOptions(slug),
    maxAge: 0,
  });
  redirect(`/o/${encodeURIComponent(slug)}`);
}
