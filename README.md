# NOMERA

Booking Engine + Operations Platform for Tour Operators.

NOMERA is a Bun/Turborepo monorepo with localized Admin and Storefront Next.js applications. Railway hosts the deployable application and PostgreSQL service. PostgreSQL access is server-only through `@nomera/postgres`; the browser never receives `DATABASE_URL`.

## Workspace

```text
apps/admin/             Operations application · local port 3000
apps/storefront/        Public application · local port 3001
packages/postgres/      Server database, sessions, tenancy and invalidation
packages/domain/        Tenant authorization, capabilities and audit contracts
packages/config/        Lazy server environment validation
packages/schemas/       Zod contracts
packages/ui/            Source-owned UI primitives and tokens
packages/i18n/           English/Mongolian locale contracts
db/migrations/           Versioned PostgreSQL schema
scripts/                 Migration and explicit admin-seed commands
```

## Local development

Use Bun 1.4.2+ and Node.js 22+.

```sh
bun install
bun dev
```

Copy `apps/admin/.env.example` and `apps/storefront/.env.example` to their `.env.local` files and set a PostgreSQL `DATABASE_URL` for server-backed routes. Existing `.env.local` files are intentionally not overwritten.

## Railway deployment

The Railway project is connected to [Byrln/Nomera](https://github.com/Byrln/Nomera) and contains a PostgreSQL service. Configure the application service variable `DATABASE_URL` as a Railway reference to the PostgreSQL service’s `DATABASE_URL`. The root start command runs the versioned migrations before starting Admin; migrations are idempotent and protected by PostgreSQL’s transaction semantics.

The first Railway deployment was created before the local workspace was pushed and failed because the remote repository contained only `README.md`. Push the repository after verification to trigger the deployment from the actual monorepo.

To create the first operator account, run the explicit command with real values in the Railway service environment or a secure local shell:

```sh
SEED_ADMIN_EMAIL=operator@example.com \
SEED_ADMIN_PASSWORD='use-a-strong-password' \
SEED_TENANT_NAME='Example Travel' \
bun run db:seed:admin
```

The seed command is never run automatically and no credentials are stored in the repository.

## Commands

| Command | Purpose |
| --- | --- |
| `bun dev` | Start Admin and Storefront |
| `bun run db:migrate` | Apply pending PostgreSQL migrations |
| `bun run db:seed:admin` | Explicitly seed one owner account and tenant |
| `bun run lint` | Run Biome and workspace lint checks |
| `bun run typecheck` | Run strict TypeScript checks |
| `bun run test` | Run package and tooling tests |
| `bun run build` | Build both Next.js applications |
| `bun run check` | Run lint, typecheck, tests and build |

## Security boundary

Admin sessions are opaque random tokens stored only as SHA-256 digests in PostgreSQL and sent in a host-only HttpOnly `nomera_session` cookie. Every tenant read revalidates session expiry, user status, email verification and active membership in the same server-side repository path. Tenant IDs, roles and workspace selections from the browser are untrusted input. Internal database errors are mapped to stable public domain error codes.

The current implementation covers the PostgreSQL foundation and Admin authentication/workspace slice. Dashboard, tours, bookings, storefront publishing, checkout and traveler journey slices remain to be implemented in the phase order defined by the supplied production prompt.
