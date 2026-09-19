"use server";
import { toPublicError } from "@nomera/domain/errors";
import { searchAdmin } from "@nomera/postgres/server/admin";
import { tourPageContext } from "@/features/tours/server";
export async function searchWorkspace(query: string) {
  try {
    const { secret, tenantId } = await tourPageContext();
    return { data: await searchAdmin(secret, tenantId, query) };
  } catch (error) {
    return { error: toPublicError(error).code };
  }
}
