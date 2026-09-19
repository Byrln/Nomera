# NOMERA admin design lock

User-selected source: the thirteen NOMERA admin images supplied September 12, 2026. These replace the earlier Shopify direction for authenticated admin pages. Implementation approval is explicit; final pixel-level review remains with the user.

## Foundation

The authoritative semantic tokens are `.nomera-admin` and `.dark .nomera-admin` in `packages/ui/src/styles.css`. Use a navy sidebar, white header, cool light canvas, blue actions, fine borders and restrained 6px panels. Keep Noto Sans with Mongolian Cyrillic and English support. The admin defaults to light and retains accessible dark support. Public storefront compositions remain independent.

Reference geometry: 230px sidebar, 60px header, 30px desktop content inset, 16px panel gaps, 28px page title, 14px supporting copy, 12px table text. Collapse navigation into an accessible Sheet on narrow screens; let tables scroll inside their own containers. Avoid wrapping currency amounts mid-number; compact large dashboard totals while retaining their exact values.

## Composition and components

Use source-owned shadcn/Radix primitives from `@nomera/ui`: Sidebar, Card, Table, Chart, Field, Input, Select, Dialog, Tabs, Avatar, Button, Checkbox and Collapsible. Native tags are limited to semantic structure, text and necessary layout wrappers. Do not add another component system or unnecessary animation dependency.

Dashboard: four icon metrics, bookings/revenue chart with status and attention panels, recent bookings and channel breakdown. Sales: pipeline stages, funnel, inquiries and activity. Customers: directory with selected customer detail. Tours: status tabs, filters, catalog, featured performance and content completeness. Finance and Reports: monetary metrics, actual aggregate charts and actionable tables. Marketing: recorded campaigns and promotions. Storefront: five theme cards, General/Homepage/Policies/SEO/Publish editor and draft/live preview.

Dashboard exception approved September 19: use the supplied asymmetric travel composition instead of the generic admin dashboard grid. Keep a full-height image-led left column, compact center metrics, booking-performance gradient, upcoming-departures panel, 10–12px gutters, 20–24px cards, and dedicated two-column mobile composition with a fixed bottom navigation. Light mode is warm off-white; dark mode is blue-black rather than a simple inversion. The supplied landscape asset is the dashboard hero background. Metrics and departures remain tenant-authorized API data; reference-image values and names are never copied.

Admin shell refinement approved September 19: every authenticated admin page uses the dashboard's warm, full-viewport top-navigation shell instead of the legacy sidebar shell. Desktop content uses the available width and height with 8–12px outer padding; mobile uses the shared five-destination fixed bottom bar and never opens a sidebar. Dashboard booking pace uses the source-installed bklit ring chart, restyled to NOMERA tokens and driven by actual booking pace versus the observed daily peak.

## Content and behavior

Use persisted, tenant-authorized records and derived aggregates. Never copy screenshot names, metrics, reviews, provider statuses or timestamps into live business data. Missing integrations require truthful unavailable states. Draft edits must not alter published pages until the explicit publication action; live preview links must use the published slug. MN and EN keys must match.

Use motion only for focus, disclosure and selection. Honor reduced motion. No gradients, decorative bento, fake charts, invented integrations or marketing layouts in operational screens.

## Evidence

See `docs/plans/2026-09-12-admin-reference-redesign.md` and the operations, finance, tours and storefront reports beside it. User images are primary visual evidence. Mobbin Twenty/Monarch supplied secondary interaction evidence; inspected 21st.dev candidates were rejected where existing primitives already fit.
