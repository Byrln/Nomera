# NOMERA Phase 0 repository and Railway audit

Inspected 2026-09-12. Source brief: `D:/Downloads/NOMERA_PRODUCTION_FULLSTACK_IMPLEMENTATION_PROMPT.md`. The user-requested backend substitution is explicit: use Railway for hosting and PostgreSQL for persistence.

## Repository baseline

- Monorepo: Bun 1.4.2, Turborepo, strict TypeScript, Next.js 16.3.5, React 19, Tailwind 4, next-intl, Zod, Vitest and Biome.
- Apps: `apps/admin` on local port 3000 and `apps/storefront` on local port 3001.
- Shared packages: `ui`, `domain`, `config`, `schemas`, `i18n`, `storefront-themes`, `typescript-config` and the new `postgres` package.
- The GitHub default branch contained only `README.md` at Railway provisioning time. The local implementation is currently on `codex/nomera-backend-foundation` and has not been pushed.
- Existing `.env.local` files were preserved and not read into output.

## Backend architecture map

```text
Next Server Action / Route Handler
  -> @nomera/postgres/server/auth or /tenant
  -> @nomera/domain tenancy and capability contracts
  -> postgres.js server pool
  -> Railway PostgreSQL
```

`DATABASE_URL` is validated lazily and is never imported by client code. Sessions are opaque random tokens; only SHA-256 token digests are persisted. Passwords use salted scrypt hashes. Tenant selection is a selector, not authority: the server rechecks session expiry, user status, email verification and active membership for every request.

## Database resource map

The versioned `db/migrations/0001_foundation.sql` defines only the current foundation slice:

| Table | Purpose | Security boundary |
| --- | --- | --- |
| `organizations` | One operator tenant | Joined through verified membership |
| `users` | Staff identity and password hash | Active + email-verified required |
| `memberships` | User-to-tenant role | Active membership and known role required |
| `sessions` | Expiring/revocable browser sessions | Token digest only; no raw session token |
| `audit_logs` | Future persisted business audit events | Tenant and actor foreign keys |
| `schema_migrations` | Migration ledger | Runner-owned, idempotent application |

No tour, booking, traveler, storefront or journey tables were invented before their vertical slices.

## Railway evidence

- Project: `authentic-connection`.
- Application service: `Nomera`, connected to `Byrln/Nomera`.
- Database service: `Postgres`, with volume `postgres-volume`, observed online.
- Initial app deployment: failed during Railpack preparation because the remote repository exposed only `README.md`; no source build was attempted. This was reproduced in the Railway deployment details.
- Railway connector: not installed/callable. Project provisioning was completed through the user’s already-authenticated Railway browser session, not by pretending an unavailable connector succeeded.

## Design-reference matrix

The approved Dashboard and later screen references were not present in the repository or attached file. The current phase does not add a screen; therefore the visual matrix remains deferred until Dashboard begins. The supplied prompt’s phase order is preserved: Dashboard first, then Tours/Departures, Customers/Sales/Bookings, Finance/Marketing/Reports, Storefront, Checkout, Traveler Portal, Journey Builder and Production QA.

## Remaining prerequisites

1. Push the verified monorepo to the GitHub branch connected to Railway.
2. Set the application service variable `DATABASE_URL` to a Railway reference to the Postgres service variable, without printing its value.
3. Redeploy and verify Railpack builds the repository, migrations complete, and the Admin health/page responds.
4. Run the explicit admin seed command with secure values, then verify positive sign-in/workspace access in a browser.
5. Implement Dashboard as the first complete vertical fullstack slice once its approved reference is available.
