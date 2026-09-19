"use server";

import {
  DomainError,
  type ErrorCode,
  toPublicError,
} from "@nomera/domain/errors";
import { mutateTour } from "@nomera/postgres/server/tours";
import { type TourDetail, tourMutationSchema } from "@nomera/schemas/tours";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { sessionCookieName, tenantCookie } from "@/lib/auth";

export type TourActionResult =
  | { ok: true; data: TourDetail }
  | { ok: false; code: ErrorCode; fields: string[] };

export async function submitTourMutation(
  input: unknown,
): Promise<TourActionResult> {
  try {
    const jar = await cookies();
    const secret = jar.get(sessionCookieName())?.value;
    if (!secret?.trim()) throw new DomainError("UNAUTHENTICATED");
    const tenant = jar.get(tenantCookie)?.value;
    if (!tenant) throw new DomainError("FORBIDDEN");
    const parsed = tourMutationSchema.safeParse(input);
    if (!parsed.success)
      return {
        ok: false,
        code: "VALIDATION_ERROR",
        fields: parsed.error.issues.map((issue) => issue.path.join(".")),
      };
    const data = await mutateTour(secret, tenant, parsed.data);
    revalidatePath("/tours");
    revalidatePath(`/tours/${data.id}`);
    return { ok: true, data };
  } catch (error) {
    return { ok: false, code: toPublicError(error).code, fields: [] };
  }
}
