import { DomainError, parseInput } from "@nomera/domain/errors";
import { tourCatalogFilterSchema } from "@nomera/schemas/tours";

export function catalogFilter(query: URLSearchParams) {
  const allowed = new Set([
    "search",
    "status",
    "destination",
    "category",
    "page",
    "pageSize",
  ]);
  for (const key of query.keys()) {
    if (!allowed.has(key) || query.getAll(key).length !== 1)
      throw new DomainError("VALIDATION_ERROR");
  }
  return parseInput(tourCatalogFilterSchema, {
    search: query.get("search") ?? "",
    status: query.get("status") ?? "all",
    destination: query.get("destination") ?? "",
    category: query.get("category") ?? "",
    page: query.has("page") ? Number(query.get("page")) : 1,
    pageSize: query.has("pageSize") ? Number(query.get("pageSize")) : 20,
  });
}

export function majorToMinor(value: string): number {
  if (!/^\d+(\.\d{0,2})?$/.test(value)) return Number.NaN;
  const [whole = "0", fraction = ""] = value.split(".");
  const result = BigInt(whole) * 100n + BigInt(fraction.padEnd(2, "0"));
  return result <= BigInt(Number.MAX_SAFE_INTEGER)
    ? Number(result)
    : Number.NaN;
}
