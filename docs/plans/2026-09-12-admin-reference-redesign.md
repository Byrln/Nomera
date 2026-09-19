# Admin reference implementation

User-approved source: thirteen NOMERA admin PNGs in D:/Downloads, supplied September 12, 2026. They supersede the earlier Shopify style. Match their composition, navy sidebar, white header, cool canvas, blue actions, compact tables and restrained 6px panels. Preserve Noto Sans Cyrillic support, shadcn primitives, working PostgreSQL tenant boundaries and MN/EN catalogs. Screenshot metrics, people and integration statuses are examples, never production seed data.

## Design lock

Reference viewport 1586 x 992. Sidebar 230px, header 60px, content inset 30px; 16px panel gaps; four metric columns, 28px page titles, 14px supporting text, 12px table text. Navy #0b2036, foreground #0b1636, background #f5f8fc, primary #0064f5, muted #53678c, border #e3ebf6. Semantic tokens remain in packages/ui/src/styles.css and are scoped to the admin root. Light is the reference default; retain accessible dark-mode support. No decorative motion: focus, selection and collapse transitions only, reduced-motion aware.

## Tasks and ownership

1. Root: shared shell/tokens/header/search/date controls, dashboard, tours, journey/settings consistency; browser and full integration verification.
2. Operations: sales pipeline and customer directory/detail layouts, bookings consistency, real aggregates/filter/export actions. Own apps/admin/features/operations and operations repository/schema extensions if required.
3. Finance: finance/marketing/reports reference compositions, actual aggregate charts and useful controls. Own apps/admin/features/finance and finance repository/schema extensions.
4. Storefront: general/homepage/policies/SEO/publish reference compositions and controlled live preview. Own apps/admin/features/storefront and storefront repository/schema extensions.

Shared interfaces: existing Card/Table/Chart/Field/Dialog/Tabs/Sidebar primitives. Root owns shell CSS and shared tokens. Agents add only their own translation namespaces via read-modify-write; never replace other namespaces. No package/migration identifier collisions; coordinate before additions. Existing dirty work is the baseline and stays uncommitted.

## Research and rulings

- Supplied image designs are the source of truth; generating replacement designs or randomizing layouts would contradict the explicit exact-match request.
- 21st.dev MCP search returned Analytics Card (demo 7495); source inspected. Rejected because its Framer Motion dependency, striped bars, oversized radius and animation differ from the reference. Existing shadcn Card/Chart already solve the need.
- Root Mobbin discovery had no callable tool, but the feature agents successfully used Mobbin MCP: Twenty customer directory/detail selection (https://mobbin.com/screens/aac1089e-01aa-40ab-9a47-078d734c4618) and Monarch cash-flow KPI/chart/table composition (https://mobbin.com/screens/a36680be-a37b-4106-bc2c-389964a31f88). Actual visuals were inspected. User images remain primary evidence.
- Disjoint feature owners use the dispatching-parallel-agents workflow; root integrates shared styles and performs review. No external publication, messages or remote database changes.

## Verification

`bun run check` passed with exit 0: lint, TypeScript, 201 tests (including 52 PostgreSQL integration tests against the isolated local database), and admin/storefront production builds. Three nonblocking CSS specificity warnings remain. No remote database or deployment changes.

Browser checks: dashboard widths 320/375/414/768/1024/1440 had no document overflow. Sales/Customers/Bookings and Finance/Marketing/Reports/Tours checked at 375/768/1440 with EN/MN samples. All five Storefront panels checked in both locales at 375/768/1440; additional General checks at 320/414/1024. Dark theme sampled in operations and storefront. Keyboard Escape, account/navigation collapse, search, date validation/submission, pending booking filter, customer notes, CSV exports and draft/live preview controls exercised. Full exhaustive keyboard and reduced-motion browser emulation remain unverified; reduced-motion CSS and animation audits were inspected.

Browser findings fixed: header native-date submission, customer optional URL validation, live-preview slug ownership, table alignment, tablet overflow, double page padding and numeric wrapping. Screens retain real local QA data instead of screenshot example metrics. No claim of pixel-identical business content.

Development browser console warnings traced to extension-injected `__processed_*` body attributes and extension scripts. The local development preview was stopped to switch to the completed production build; automatic approval review rejected the production-start command on port 3102 with only "blocked by policy". Production-preview verification is therefore incomplete. User development servers were not stopped.

The persistent project design lock is `.tastemaker/style-lock.md`. Feature reports contain their research, checks and remaining integration limitations.
