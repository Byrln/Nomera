// Client-safe error vocabulary only. Authenticated services require explicit subpaths.
export { DomainError, type ErrorCode, toPublicError } from "./errors";
export type { TenantContext, TenantSummary } from "./tenancy";
