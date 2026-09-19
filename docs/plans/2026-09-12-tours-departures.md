# Phase 2 — Tours and Departures

User direction: retain the approved Shopify design; use shadcn or inspected 21st.dev components for all product UI. Raw HTML is limited to semantic page/form structure, text and the internals of source-owned primitives. No custom styled replacements for available primitives.

First finish the Dashboard primitive refactor and regression checks. Continue the next complete vertical slice: tour catalog, tour editing, itinerary/media metadata, departures, capacity, prices and publication. Do not introduce bookings/customer mutations or a public storefront in this phase.

Reference: approved Shopify Analytics screen (https://mobbin.com/screens/12055258-4e17-45cc-af1f-2a65561ac626) supplies shell/density. Initial Mobbin search returned HTTP429; a later retry succeeded. Visually inspected Shopify Orders https://mobbin.com/screens/b743aa06-5d21-485f-8d69-d5f0052727c5 and Shopify Products https://mobbin.com/screens/e8786dbf-4443-40f1-91f1-c45d3560aa80: adopt compact title, status tabs, filter row and dense record table. Reject unrelated commerce columns, sample metrics and dead navigation. 21st.dev Origin UI Table demo96 and Table Edit demo7457 sources/dependencies were inspected; reuse official shadcn Table primitives without external demonstration fetches or in-memory-only edits.

Components: source-owned shadcn Sidebar, Card, Chart, Table, Field, Input, Textarea, Select, Checkbox, ToggleGroup, Collapsible, Empty, Alert, Progress, Skeleton, Dialog, Tabs, Pagination and Button as actually needed. Keep the shared NOMERA tokens and Noto Sans. Read newly added source/dependencies and keep application-specific composition inside admin.

Routes: /dashboard; /tours with server-filtered catalog; /tours/new; /tours/[tourId] with editable overview, itinerary, media and departures. Only implemented routes enter navigation.

Data: extend the existing normalized tours/departures records. Staff-authorized writes validate all values server-side, authorize current tenant membership, append audit records in the same transaction, and check optimistic versions. Capacity reductions cannot fall below confirmed/completed travelers. Monetary values persist in integer minor units and currencies stay explicit. Publication saves an immutable validated snapshot; editing a published tour must not silently alter the live snapshot. Media uses validated HTTPS image references plus required alternative text; no imaginary storage/upload integration. An actual upload provider remains a separate infrastructure integration.

Verification: security/domain and live PostgreSQL integration tests, UI create/edit/publish/archive/departure workflows, stale-version and invalid-input responses, empty/error/loading states, keyboard, both locales/themes and responsive widths. No remote database writes, deployment or push.
