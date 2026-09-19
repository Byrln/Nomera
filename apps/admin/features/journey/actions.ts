"use server";
import { type ErrorCode, toPublicError } from "@nomera/domain/errors";
import { saveJourney } from "@nomera/postgres/server/journey";
import type { JourneyData } from "@nomera/schemas/journey";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { sessionCookieName, tenantCookie } from "@/lib/auth";

export async function submitJourney(
  input: unknown,
): Promise<{ ok: true; data: JourneyData } | { ok: false; code: ErrorCode }> {
  try {
    const jar = await cookies();
    const data = await saveJourney(
      jar.get(sessionCookieName())?.value ?? "",
      jar.get(tenantCookie)?.value,
      input,
    );
    revalidatePath("/journey-builder");
    return { ok: true, data };
  } catch (error) {
    return { ok: false, code: toPublicError(error).code };
  }
}
