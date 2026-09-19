# Operations reference implementation

## Delivered locally

Sales: four metric tiles; six selectable stage columns with latest quoted value in the selected currency; active inquiry table with search, stage filter and ten-row pagination; inquiry conversion funnel; recent inquiry updates and due/overdue follow-up reminders. Existing create inquiry, quote, stage update, and booking conversion dialogs remain connected to submitOperation. Currency is never summed across MNT and USD.

Customers: four metric tiles; searchable active/archived directory with pagination and CSV export; selected customer detail beside the directory, including overview, trips/quotes, interactions, private document upload/reference, and notes tabs. Server page selects the first active customer initially. Existing individual customer routes, editing, archival, booking status changes and private media upload remain functional code paths. Initials use shared shadcn Avatar; no invented customer portraits. Overview has contact information, real country distribution, next trip, booked value, recent interactions and notes.

Bookings: matching page/metric/panel composition; search (including initial `?search=` links) and status filtering retained; existing status transition validation retained.

Backend: getOperations now reads each inquiry's latest sales_quotes value/currency with a tenant-constrained lateral join and exposes its update timestamp. No migrations or production mutations. Added integration regression assertion that a revised quote is the value returned to Sales.

## Sources and component choices

- Sales supplied image: D:/Downloads/ChatGPT Image Sep 12, 2026, 10_31_52 PM (2).png, viewed.
- Customers supplied image: D:/Downloads/ChatGPT Image Sep 12, 2026, 10_31_52 PM (5).png, viewed.
- Mobbin is connected in this subtask: [Twenty directory and selected contact panel](https://mobbin.com/screens/aac1089e-01aa-40ab-9a47-078d734c4618), image inspected. Adopted directory/detail relationship and preserved context while selecting a person.
- [21st Records Table](https://21st.dev/@theshanelevine/components/records-table), demo 23604. Source/dependencies inspected. Rejected raw checkbox/table controls, hardcoded records and unrelated palette; retained existing NOMERA shadcn Table, Button, Select, Tabs, Card, Chart, and Avatar instead. No added external dependency.
- Read image-to-code, Hallmark, Tastemaker and GPT Taste skill instructions. Exact supplied image request and established operational design lock override generation, randomization, marketing/AIDA and decorative GSAP defaults.

## Verification actually run

- Focused Biome check passes across operations UI, operations schema/repository and changed SQL integration test.
- Tastemaker anti_slop_scan.py: passed all five operations files.
- Tastemaker audit_motion.py: passed all five operations files. Recharts animations explicitly disabled.
- Operations domain tests: 2 passed.
- Operations SQL integration tests: 5 skipped because this process has no TEST_DATABASE_URL. Root should run against its isolated local database.
- Admin TypeScript check after Avatar was added: no operations errors; three remaining errors were in concurrent storefront work, not edited here.
- Full build and browser matrix delegated to root as requested. No browser-proof or remote-deployment claim.

## Honest reference differences / limits

All metrics explicitly scope to latest 500 loaded records and all dates; directory/export are also bounded to these records. Header date controls should not imply date filtering here. NPS displays unavailable because no satisfaction collection exists. Open inquiries replace unsupported open support cases. Country distribution uses saved country values instead of invented segment memberships. Owner/manager fields and customer segmentation are absent in the current model, so are not fabricated. Monetary totals include confirmed/completed booked value, not collected revenue. The conversion visualization summarizes current stages/latest quotes and does not claim historical cohort conversion. Supplied cards nesting is intentional reference matching; no decorative movement or fake avatars added. Full rendered comparison at requested widths/locales/themes remains root's integration task.

Global style lock/log ownership remains with root; no personal memory/profile writes.

## Browser QA completed (localhost:3102, 2026-09-12 23:07–23:17)

Used separate Chrome tab 1575373423, preserving root tab1575373419. Existing local QA session was already signed in. No external data or services were mutated. Explicit viewport overrides were cleared after checks.

- Sales: rendered at1440,375 and768; scrollWidth<=viewport (1425/1440,360/375,753/768). Selected Won stage and verified the inquiry table reduced to the one saved won inquiry with stage filter synchronized. Opened New inquiry dialog on375: labeled customer/inquiry/notes controls, focus placement, Save/Cancel present. Current sparse seed data yields a narrow funnel; values are truthful, not screenshot seed replacements.
- Customers: rendered at1440,768 and375. Desktop keeps directory and selected detail adjacent; tablet/mobile stack; shadcn tables scroll internally and document does not overflow. At375 detail tab panel clientWidth and scrollWidth were both290. Verified Trips/quotes and Documents/private-upload UI; ArrowRight from Overview selected and focused Trips. No file upload performed.
- CSV export clicked and produced local nomera-customers.csv (241bytes,5 columns,2 data rows, every row matching header). Browser download-event waiting did not capture the blob download, so filesystem output was inspected instead.
- Notes: browser save initially exposed a real schema defect: z.url().refine evaluated new URL("") in the empty-string union and threw. Fixed predicate to return false on malformed URLs; added2 schema regression cases and SQL persistence regression. Browser then saved the local test note and showed persisted text in Notes and Overview. Only local synthetic QA customer activity changed.
- Bookings: verified at375,768,1440 with no document overflow. Notification CTA navigated to status=pending and table contained pending bookings. Global search for QA-1059 returned the matching result; opening it changed URL to search=QA-1059, cleared previous pending filter, and displayed exactly one confirmed booking.
- Header: account dialog showed current local QA account and existing preferences; collapse/expand toggled sidebar state; reporting date dialog rejected reversed dates and accepted2026-09-10 through2026-09-12, updating dashboard URL and closing dialog.
- EN and MN samples were viewed; light and dark samples were exercised while shared browser locale/theme preferences changed during parallel QA. MN operations dates now display numeric YYYY.MM.DD instead of English month-name fallback.
- Rendered defects fixed before final root check: duplicated section margins, metric Card double vertical padding, customer directory cell/header misalignment, MN date fallback, and note/interaction URL validation.
- Console inspection: hydration warnings identify injected body __processed_* attributes; remaining warnings originate from MetaMask chrome-extension scripts. No application-specific runtime exception remained after fixes.
- Final owned source edits and8/8 focused schema/operations SQL tests completed at23:12, before root's full23:15 check. No source edits after that check; this section records QA only.
