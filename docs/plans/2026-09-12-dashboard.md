# Phase 1: Shopify-inspired operations dashboard

Approved reference: https://mobbin.com/screens/12055258-4e17-45cc-af1f-2a65561ac626

Audience: tenant owners and administrators. The first read is bookings, booked gross revenue, active departures and inquiry conversion; the second is the daily trend, departure readiness and work requiring attention. Keep Noto Sans, NOMERA semantic colors, compact controls and a 68rem content container. Adapt Shopify's compact dark header, quiet sidebar, four KPI tiles and wide chart with supporting panels. Only implemented destinations appear in navigation. No decorative motion; chart animation is disabled for repeated operational use.

Research: Mobbin returned and visually verified the approved Shopify Analytics screenshot. 21st.dev Area Chart (demo 10105, https://21st.dev/@bklitai/components/area-chart) source was inspected: it adds Visx, D3, Motion and measurement dependencies, hides the SVG from accessibility and delays interaction during animation. Reject that implementation; use Recharts with accessible data tables, existing NOMERA Button/Input primitives and semantic tokens. No registry installation.

Implementation sequence:
1. Add client-safe dashboard contract, normalized PostgreSQL read-model foundations, tenant-authorized repository/application service and meaningful database/security tests.
2. Build `/dashboard`, `/api/dashboard`, the operational shell, filters, KPIs, Recharts trend/channel charts and accessible detail tables. Integrate workspace selection and entry redirect.
3. Exercise with isolated local PostgreSQL fixtures through the actual repository/API; validate empty, errors, permissions and filters. No production writes and no frontend fixture arrays.
4. Run lint, typecheck, tests and build. Inspect both locales/themes, keyboard and responsive rendering at 320, 375, 414, 768, 1024 and 1440px. Review the completed slice before Phase 2.

Ruling: current repository migrated from Appwrite to Railway PostgreSQL in committed history; follow current AGENTS.md and roadmap.
Ruling: selected Shopify reference takes precedence over the earlier generic shell description, while existing NOMERA tokens and Cyrillic support remain fixed.
Ruling: default reporting timezone is Asia/Ulaanbaatar. Date range is an inclusive 1–92 day interval, default 30 days ending today. Compare with the immediately preceding equal-length interval. Monetary figures filter one currency (MNT or USD) and sum integer minor units; gross revenue includes confirmed/completed bookings and is not cash collected. Conversion means inquiries created in the selected interval linked to a confirmed/completed booking, divided by all inquiries in that interval; no inquiries produces null. Active departures are non-cancelled departures overlapping the reporting interval. Operational upcoming departures and pending booking attention use today, independently of the reporting filter, and are labeled accordingly.

Shared wire contract (`@nomera/schemas/dashboard`): `dashboardFilterSchema` {from: YYYY-MM-DD, to: YYYY-MM-DD, currency: MNT|USD}; `defaultDashboardFilter(now?: Date)`; `dashboardResponseSchema` and types DashboardFilter, DashboardResponse.

DashboardResponse: {tenantId, generatedAt (ISO timestamp), timezone, filter, previousPeriod: {from,to}, metrics: {bookings:{value,previous}, revenueMinor:{value,previous}, activeDepartures:{value,previous}, conversion:{value:number|null,previous:number|null}}, trend: [{date,bookings,revenueMinor}], channels:[{channel,bookings}], departures:[{id,title,startsOn,endsOn,status,capacity,reserved}], attention:{pendingBookings:number}, recentBookings:[{id,reference,customerName,tourTitle,bookedAt,status,channel,totalMinor,currency,travelers}]}. Every monetary/count value is a non-negative safe integer; conversion is 0–100 or null. Statuses: bookings pending|confirmed|completed|cancelled; departures scheduled|confirmed|in_progress|completed|cancelled; channels direct|website|agent|other. Recent bookings: latest 10 in selected booking-date/currency filter (all statuses); counts/channels exclude cancelled. Upcoming departures: next 30 days, first 5, with reserved travelers from confirmed/completed bookings across currencies. KPI active excludes cancelled/completed. Pending attention: all pending bookings in selected currency, explicitly all dates.

Server API: `getDashboard(sessionSecret, selectedTenantId, filter, sql?)` returns validated response; authorizes current membership and dashboard:read inside a consistent read transaction. Main app owns route cookies and public error mapping. Invalid/expired sessions return UNAUTHENTICATED, inactive/missing membership or insufficient role FORBIDDEN; no tenant data returned on either path.

Execution ledger: implemented and verified locally. See `2026-09-12-phase-report.md` for checks, browser evidence and limitations. No commit, push or deployment requested.
