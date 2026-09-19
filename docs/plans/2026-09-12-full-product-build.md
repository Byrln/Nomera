# Full product first pass

Implemented locally against the existing PostgreSQL architecture and approved Shopify/shadcn direction. This extends the already verified Dashboard and Tours slices; it is not a deployment.

| Area | Working scope |
| --- | --- |
| Customers | Directory, detail, contact editing, archive, trip/quote history, private notes/interactions, HTTPS document references and private binary document uploads |
| Sales and bookings | Inquiry stages, follow-up dates, server-priced quotes, booking creation, status transitions, optimistic versions, idempotency, promotion validation and serialized capacity checks |
| Finance | Manual payments/refunds, balances, snapshot invoices, reconciliation, cash flow and exact minor-unit amounts |
| Marketing and reports | Campaigns, promotion codes, date/currency validation, channel-window reporting, bookings/revenue/travelers/destinations/sources/tour performance and recorded-cost margin |
| Storefront administration | Five controlled theme presets through one renderer, brand settings, immediate draft preview, predefined section ordering/visibility/layout, policies, SEO, publication history, restore-to-draft and scheduled publication |
| Public storefront | Tenant home, tour listing/detail, policies, metadata/sitemap and published-only snapshots; historical tenant slugs remain aliases |
| Checkout and traveler | Guest booking requests, server-calculated totals, hashed booking-scoped access tokens, HttpOnly tenant-path cookies, private receipt and My Trip/Journey/Stays/Documents/Support |
| Journey Builder | Typed steps, order, visibility, required status, details, traveler notes, document links, separate internal staff notes and live preview |
| Settings | Workspace name editing with conflict checks and a read-only member directory |

Migrations `0004_operations` through `0008_media` were exercised on a disposable local database. Existing production/environment files were preserved. No remote migrations, commit, push or deployment were performed.

Browser verification exercised customer → inquiry → booking → confirmation → manual ledger, draft storefront save/publish, guest checkout → private portal, and journey publication with internal-note exclusion. Nine new admin surfaces were checked at 390/768/1440 pixels; checkout/portal were also checked at those widths, with EN/MN and light/dark samples. Tables scroll inside their containers. Shared shadcn controls, keyboard interaction, error handling and truthful empty states were retained. Review fixes included auth-row locking, form retry preservation, exact decimal parsing, JSON persistence and deterministic currency/date formatting.

Local preview uses synthetic QA records. Admin is on port 3102; storefront is on port 3104 under `/o/operator-d7e97e39`. The complete verification commands and final test total are reported in the task response.

External integration boundaries remain explicit: checkout records a pending request and does not charge money; no payment provider, email delivery or portal access recovery provider is configured. Campaign reporting uses existing booking channels and date windows, not invented web analytics attribution. Gross margin is shown only for bookings with recorded costs. Public tour/journey imagery and traveler document attachments use HTTPS references; private customer document binary uploads are implemented in PostgreSQL with 5 MiB and signature limits. Private upload repository tests passed, but browser upload automation was blocked by the Chrome extension's file-access permission. The extension also injects a body attribute that produces a development hydration warning; it is distinct from application text hydration issues that were fixed.

Selective design research followed the new fast-build instruction. The existing approved Shopify references and source-owned shadcn components were reused; [Klook checkout](https://mobbin.com/screens/e5257642-5203-42e4-9b9d-9236c2b91514) informed the contact form and secondary booking summary. No unnecessary component stack was added. Actual anti-slop/motion scans passed. Generated Turbo cache was moved from the workspace to `%TEMP%/nomera-turbo-cache-20260912` to recover disk space; source files were not removed.
