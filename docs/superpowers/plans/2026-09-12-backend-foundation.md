# NOMERA backend foundation implementation plan

> Superseded by the Railway/PostgreSQL migration requested on 2026-09-12. Retained as historical planning context.

**Goal:** Implement Phase 0 of the supplied production brief, preserving the existing previews and establishing enforceable server tenant boundaries.

**Architecture:** Keep request-scoped Appwrite clients. Add a server-only domain package that resolves identity and accepted Teams membership through an injected gateway. Appwrite adapters implement this gateway with the session SDK, without privileged fallback. Expose explicit package subpaths; preserve the neutral roots.

**Tech stack:** Bun 1.4.2, TypeScript strict, Zod 4, Appwrite Web 27.0.0 / Node 29.0.0, Vitest, existing Next.js apps.

**Spec:** `D:/Downloads/NOMERA_PRODUCTION_FULLSTACK_IMPLEMENTATION_PROMPT.md`, sections 4A–4E, 47, 56 Phase 0, 59 Steps A–B. The user's instruction to begin implementation authorizes this work; execute inline and preserve the dirty working tree. Do not commit existing untracked work.

## Constraints and phase boundary

- One Appwrite Team per tenant; verify active account and accepted membership on every request. Selected tenant IDs are untrusted input.
- Browser and neutral exports must not expose privileged services or server credentials.
- No remote resource mutations. Local server keys are blank; report remote inspection as unavailable.
- Dashboard references are absent. The brief forbids inventing the approved visual language; continue backend work and defer its UI and subsequent product phases.
- Existing Noto fonts, semantic colors, locales, shared primitives and previews remain the design baseline. No frontend changes are needed in this phase.

## Tasks

- [x] Record frontend/backend, route, resource, domain and trust-boundary maps plus the unavailable-reference matrix.
- [x] Add tests for invalid tenant input, inactive/unverified identity, rejected/wrong-user/wrong-team membership, unsupported roles, forged contexts, least-privilege capabilities and sanitized errors. Initial tests failed on missing implementations; later SDK tests exposed transport-mocking and query-encoding assumptions, fixed against installed SDK evidence.
- [x] Implement shared Zod security contracts and typed domain errors. Add authenticated tenant resolution, capability checks, safe tenant summary and audit event construction in `packages/domain`.
- [x] Add session SDK gateway tests. Verify filters include the current user, use object argument signatures, enforce response validation and never fall back to API-key access. Implement the gateway and tenant repository under `packages/appwrite/src/server/`.
- [x] Add server-only tenant read-permission builders, lazy resource environment contracts and Storage metadata access enforcing configured bucket, verified tenant context and session ACLs. Do not grant client mutation rights.
- [x] Implement row-scoped Realtime subscription lifecycle with validated identifiers, unsubscribe and full disconnect on identity changes. Payloads are invalidation signals, never trusted application data.
- [x] Run all four quality gates, review package boundaries and changes, and record results and outstanding production prerequisites.

## Verification

Use `bun run lint`, `bun run typecheck`, `bun run test`, `bun run build`. Run security tests against real domain logic and mocked external SDK transport only. Existing baseline `bun run check` exited 0 (Turborepo cache hits); require fresh execution for the new implementation. SDK construction and mocked tests are not remote permission proof.
