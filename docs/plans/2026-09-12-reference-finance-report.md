# Finance / Marketing / Reports reference implementation

## Implemented

- Finance uses the supplied (6) reference composition: four icon metrics; monthly ledger chart with negative refunds; payout and invoice summary panels; recent transaction tabs alongside reconciliation status. Existing invoice/payment/refund dialogs and reconciliation actions remain functional.
- Marketing uses the supplied (7) reference composition: four truthful metrics; acquisition chart alongside promotions; campaign table alongside content/email availability. Campaign creation and promotion activation/pause remain functional. Campaign counts replace fabricated spend/ROAS/leads; promo use counts are explicitly lifetime totals for selected promotions.
- Reports uses the supplied (4) reference composition: four icon metrics; currency/destination/channel controls; monthly trend, ranked destinations and source donut; downloadable report catalog and searchable best-performing tours. Chart switches bookings/revenue without mixing units.
- Header from/to ranges are honored by all three pages, defaulting to the existing last-30-day rule and validating inclusive 1–92-day ranges with the existing dashboard schema. Reports filters apply server-side to every aggregate and export, while destination options remain tenant scoped and available after filtering. Currency changes retain all query filters.
- Finance date basis: ledger created date; bookings booked date; invoices issued date. Outstanding/paid values use the current cumulative ledger for bookings in the selected period. Marketing selects overlapping campaigns/promotions and date-scoped booking sources. No fabricated historic comparison percentages.
- CSV exports quote multiline values and neutralize spreadsheet formulas in user-entered text. Currency columns and monetary values in major units are included.
- Settings received only the shared page/title alignment. Existing behavior preserved.
- Added localized FinanceDesign keys in both catalogs. No new dependencies, migrations, remote database changes, or commits.

## Evidence and component sourcing

Read image-to-code, Hallmark, GPT Taste and Tastemaker. Exact supplied designs override image generation, randomization and approval defaults. Reference scope is operational UI; Noto Sans and shared semantic tokens retained. Four-metric hierarchy, 16px panel spacing, compact tables, restrained panels and purposeful selection state follow the approved lock.

Mobbin live lookup succeeded. Inspected Monarch cash-flow screen: https://mobbin.com/screens/a36680be-a37b-4106-bc2c-389964a31f88 . Adopted the workflow relationship of KPI totals, ledger chart, transaction table and side summary; did not copy its colors/layout over supplied NOMERA imagery.

21st.dev search returned Mini Chart, demo 9613. Full source and dependencies inspected. Rejected its bespoke div bars, static example data, hover movement and transition-all. Reused source-owned shadcn Card, Chart, Table, Dialog, Tabs, Select, Button, Input, Field and Empty with existing Recharts and Lucide.

## Checks actually run

- Focused Vitest: 3 files / 9 tests passed (financial exact amounts, operator dates, CSV quoting/formula protection and date validation).
- Finance SQL integration suite: 7 cases skipped because this agent shell has no TEST_DATABASE_URL. Added meaningful period/currency/channel/destination isolation and monthly aggregate assertions for root's local PostgreSQL integration run.
- PostgreSQL package TypeScript check passed.
- Admin TypeScript check has no errors in this work; latest check still had other agents' incomplete avatar/storefront imports. Root will run the final integrated check.
- Biome check/format on owned UI, schema/repository and route files passed.
- Tastemaker anti-slop scan and motion audit passed over the finance feature (13 files).
- Browser verification is assigned to root: this agent did not claim browser, responsive, keyboard or dark-theme verification. Full builds are assigned to root.

## Truthful limitations

Payout providers, email/visitor analytics, historic KPI comparison data and scheduled report ownership are unavailable; corresponding panels state this rather than inventing results. Reports are actual downloadable CSVs, not fabricated scheduled jobs. Finance recent records, promotions and campaigns retain existing 200-row limits; invoice/reconciliation counts explicitly carry that limit. Report tour/destination rankings retain existing 20-row limits. No external publication performed.

Critique: hierarchy 4/5, specificity 5/5, restraint 5/5, workflow 4/5, composition variety 4/5, evidence honesty 5/5. No decorative motion added. Root owns project style-lock/decision capture; no personal memory was changed.

## Local verification update, September 12 at 23:03

Finance and Tours PostgreSQL suites executed against the private loopback test service: all 14 integration cases passed. Execution caught reserved SQL aliases `month` and `day`; corrected with explicit AS and reran successfully. Combined finance + tour schema unit coverage: 13 tests passed. No remote database was touched and the connection URL was not printed.

Browser QA at 127.0.0.1:3102, synthetic local account: Finance currency changed MNT to USD with visible values updated; Reports channel changed to Agent with 4 bookings and MNT 1,800,000. CSV download succeeded and the actual 291-byte D:/Downloads/nomera-report-MNT.csv contained the matching three tours and 2/1/1 booking counts. Extension download-event observation timed out, so the saved file was inspected directly instead of claiming the event fired.

Actual MN desktop/tablet/mobile screenshots were inspected for Finance and Reports. Fixed local findings: missing16px vertical gaps between panel rows; finance action row overflow at375; metric values wrapping poorly by using single-column metric cards under480 and vertical icon layout on tablet; shortened cost-coverage note; integer chart ticks for booking counts. Finance/report document width at375 became360 (within375). At768 the shared header account button overflowed to778; reported to root. Table horizontal scrolling remains contained and intentional.

Further marketing/tours and EN browser sampling temporarily blocked by root's in-progress admin-header JSX atline299. Browser console warning for body `__processed_*` attribute traced to an injected browser-extension attribute, not application data.

## Final local browser QA update

Completed EN/MN sampling of Finance, Marketing, Reports and Tours at 1440, 768 and 375 pixel widths using the authenticated synthetic loopback account. Finance and Reports were sampled in MN; Finance, Marketing and Tours also sampled in EN. Screenshots were inspected directly through the browser tool. Tours Published tab reduced four records to the one published tour; the no-match search route displayed the correct empty state. No real media existed in the local QA tour rows, so the intentional no-image state was verified.

Fixed the Tours tablet filter breakpoint so the Apply control stays inside its panel. Finance tablet metrics now retain full monetary values on one line. Marketing paired panels stretch to the reference row geometry. Root removed duplicate page padding; latest Finance desktop screenshot confirms the intended approximately 30px inset. Header tablet search collapse was rechecked: document width 753 at viewport 768. Final Mongolian Reports screenshot at375 showed readable single-column KPIs and document width360. Locale restored to Mongolian and temporary viewport override reset.

The shared header date form had displayed date values diverge from its React draft under browser input. With root authorization, added named inputs and submit-time FormData validation. Exercised Sep1 through Sep10: URL contained the exact dates, collection became zero and the Sep12 ledger row disappeared. Header Biome passed. Source review also found live storefront preview links using a draft slug; storefront owner corrected the base to the published URL/slug.

Limits: no payment/campaign/promotion mutation was exercised; dark theme, reduced-motion preference and an exhaustive keyboard audit were not run in this QA pass. The development console includes a browser-extension-injected body hydration attribute warning. Final whole-workspace quality gates belong to root; this report does not claim their results.
