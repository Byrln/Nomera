# Header and dashboard review — 2026-09-12

Reviewed packages/postgres/src/server/admin.ts, apps/admin/components/admin-header.tsx, apps/admin/components/admin-header-actions.ts, dashboard response schema and dashboard repository summary changes.

## Findings

- Fixed in owned operations workspace: the header notification CTA navigates to /bookings?status=pending, but the booking list originally ignored that query. Status now validates against bookingStatuses and feeds the filter. Search and status overrides are keyed to the current URL query so a later global search or notification navigation wins over stale manual filter state.
- No remaining tenant-isolation or query-injection defect found in the reviewed repository code. getAdminHeader and searchAdmin resolve active membership and session inside the same repeatable-read transaction as the data reads. Every customer/tour/booking/publication predicate uses the resolved tenant. Current tours/customers/bookings read capabilities share the same role set, so tours:read authorization matches today's search exposure.
- Search uses position(lower(query) IN lower(column)) rather than LIKE; percent and underscore remain literal. Limit is five results per type, and booking references are URL-encoded.
- Publication lookup correctly ignores future and cancelled publications and orders due publications by effective time then version.
- Departure summary uses inclusive overlap with the selected date range, excludes cancelled departures, counts confirmed/completed travelers across currencies, and gives completed status precedence over capacity classification. Exact 80% occupancy is low capacity; exact capacity remains low capacity; overbooked or zero-capacity non-completed departures are at risk.

## Added and executed tests

- NEW packages/postgres/src/server/admin.integration.test.ts: 7 tests covering three result types, foreign-tenant exclusion, case/whitespace matching, literal wildcards and injection strings, independent result limit, URL encoding, current user and pending count, due/future/cancelled/foreign publications, absent/inactive membership, and revoked sessions.
- Added dashboard integration boundary test with seven overlapping fixture departures plus an out-of-period departure: exactly {onTrack:1, lowCapacity:2, atRisk:2, completed:1}, total six, with pending/cancelled bookings excluded from occupancy.
- Executed admin, dashboard and operations SQL integration suites against the explicit isolated loopback PostgreSQL connection provided by root. 3 files passed, 29 tests passed, none skipped. Every test schema was cleaned up by the harness. Connection contents were not printed.
- Focused Biome checks pass.
- Admin TypeScript check (tsc --noEmit -p apps/admin/tsconfig.json) passes, exit code 0.

No production SQL, commits, full build, or root implementation edits performed. Browser verification of the pending filter navigation remains part of root's rendered QA.
