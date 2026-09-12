"use server";
import { isLocale, localeCookie } from "@nomera/i18n";
import { cookies } from "next/headers";
export async function setLocale(formData: FormData) {
  const locale = formData.get("locale");
  if (!isLocale(locale)) throw new Error("Unsupported locale");
  (await cookies()).set(localeCookie, locale, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 31536000,
  });
}
