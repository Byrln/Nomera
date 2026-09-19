# Storefront theme redesign — local implementation and verification

Overall visual acceptance: **NOT AVAILABLE**. The implementation and local code gates are complete, but photographic reference parity, populated galleries, and a completed booking confirmation have not been verified. The available published tenant has one tour, no images, no published policies, and no active promotion. No imagery, reviews, metrics, policies, or bookings were fabricated to conceal those gaps.

## Audit and scope

Inspected repository instructions, dirty/untracked work, storefront schemas/publication readers, theme renderer, all six public route families, checkout actions, Admin editor/preview/CSS, existing UI primitives, translations, tests, and dependencies. Preserved unrelated changes. No commits, publication changes, migrations, deployment, authentication changes, Traveler Portal redesign, or Journey Builder changes.

The five supplied image files are visual references. The two described current-state screenshots were not present among those five files. The repository baseline used one shared page structure, a default three-column tour grid, broad spacing rules, and separate preview typography overrides. Those explain the isolated one-tour card and the mismatch between rich thumbnails and sparse real data.

## Files changed

- `packages/storefront-themes/package.json`, `bun.lock`: source exports and existing-version Next/Image, icons, and React DOM dependencies.
- `packages/storefront-themes/src/index.ts`, `registry.ts`, `types.ts`, `tokens.ts`, `data.ts`, `date.ts`, `filter.ts`, `renderer.tsx`, `renderer.test.tsx`.
- `packages/storefront-themes/src/shared/`: `shell.tsx`, `navigation.tsx`, `hero.tsx`, `search-bar.tsx`, `tour-card.tsx`, `category-links.tsx`, `sections.tsx`, `gallery.tsx`, `travel-image.tsx`, `tour-filters.tsx`, `promotion-dialog.tsx`, `policies.tsx`, `theme-context.tsx`, `themed-select.tsx`.
- `packages/storefront-themes/src/themes/compositions.tsx`; `styles.css`; `styles/{tokens,base,secondary,atlas,nomad,horizon,editorial,minimal}.css`.
- `apps/storefront/app/o/[tenantSlug]/layout.tsx`, `tours/page.tsx`, `tours/[tourId]/page.tsx`, `checkout/page.tsx`, `booking-success/page.tsx`, `policies/page.tsx`. The existing home route consumes the rebuilt renderer.
- `apps/storefront/lib/published-storefront.ts`; `features/checkout/{form,actions}.tsx/ts`; `messages/{en,mn}.json`.
- `apps/storefront/app/theme-qa/page.tsx`: development-only theme/route harness over published snapshots; production returns 404.
- `apps/admin/features/storefront/{editor,preview,scaled-preview}.tsx`, `storefront.css`, `messages/{en,mn}.json`, and the five `public/images/storefront-themes/*.webp` thumbnails.
- `packages/ui/src/components/{portal-host,dialog,sheet,select}.tsx`: optional iframe portal destination and reduced-motion behavior.
- `packages/postgres/package.json`, `src/server/storefront-quote.ts`, `storefront-quote.test.ts`: read-only, tenant-scoped price/promotion quotation using existing domain calculations. Booking submission still independently validates and consumes promotions.

## Shared components and behavior

Reused source-owned Button, Card, Input, Label, Select, Sheet, Dialog, Checkbox, Alert and Badge primitives; existing Lucide icons and Noto Sans/Noto Serif fonts. No animation framework or parallel component system was introduced.

The public site and Admin draft preview share the renderer, registry, tokens, home composition, footer, mobile navigation, and policy renderer. Preview uses a measured 1440×1000 or 390×844 iframe viewport with shared React content and portals. Unsaved draft choices do not change the published site. Obsolete preview-only typography and nested scrollbar rules were removed.

One tour receives a full-width feature treatment; two receive balanced columns; three and larger sets use responsive grids. Zero-tour homepage sections are omitted, with readiness copy only in preview. Hero imagery follows configured hero → selected published cover → another published cover → branded image-free layout. Failed image loads remove the broken image element. Optional content is omitted instead of filled with claims.

Listing filters use real search, destination, category, duration, available departure date and sort values, with a mobile Sheet and server pagination. Detail includes gallery, itinerary, published policies, sticky desktop booking panel, mobile booking link, and traveler count carried into checkout. Checkout retains guest access, shows server-quoted totals, supports dialog-based promotion entry/removal/retry, and exposes policies before acknowledgement. Success retains secure traveler access and the existing pending-request/payment-instructions flow.

## Theme implementation and reference mapping

| Theme | Supplied reference | Implementation | Visual verification |
| --- | --- | --- | --- |
| Atlas | Green/orange mountain booking image (`c683…`) | Sans display, ivory/forest palette, split photo hero, overlapping discovery, wide single-tour card, real category links | PASS for image-free layout; NOT AVAILABLE for photographic parity |
| Nomad | Dark cinematic travel image (`e8bc…`) | Full-bleed photo recipe, warm serif, forest chapter bands and footer, image-led destinations | PASS for image-free layout; NOT AVAILABLE for photographic parity |
| Horizon | Iceland landscape image (`5036…`) | Near-viewport photo recipe, centered tour caption, optional real thumbnails, anchored search, cool rules | PASS for image-free layout; NOT AVAILABLE for photographic parity |
| Editorial | RoomStory image (`11ff…`) | Wide journal hero, overlapping discovery, serif story hierarchy and magazine grid | PASS for image-free layout; NOT AVAILABLE for photographic parity |
| Minimal | Pale luxury image (`055e…`) | Pale canvas, restrained serif scale, panoramic photo recipe, floating discovery, thin rules and quiet footer | PASS for image-free layout; NOT AVAILABLE for photographic parity |

The references informed layout and art direction, not tenant content. No reference logos, copy, or photographic assets were shipped. Homepage recipes preserve deliberate tenant section reordering.

## Research

| Check | Result | Evidence and decision |
| --- | --- | --- |
| Hallmark, Tastemaker, GPT Taste | PASS | Read and applied within existing Cyrillic fonts and product scope. Reviewed hierarchy, spacing, theme differences, motion and partial data. Full photographic craft approval remains unavailable. |
| Mobbin | PASS | [Klook booking options](https://mobbin.com/screens/f29ee268-f526-4979-950c-e4af82c8ebe4): visible date/options/restrictions. [GetYourGuide mobile filters](https://mobbin.com/screens/05237d6e-9956-4cd0-accc-8e365f7fb711): separate filters and legible results. [Expedia checkout](https://mobbin.com/flows/aeed4157-56c2-4e86-a340-be9fd347c3ef): traveler form, summary and restrictions before submission. Inspected returned visual evidence. |
| 21st.dev | PASS | Searched travel discovery controls and inspected [Flight Search source](https://21st.dev/@ravikatiyar162/components/flight-search), component 7709. Rejected flight-specific data and unnecessary motion dependency; adapted the interaction using existing NOMERA controls. |
| Reference comparisons | NOT AVAILABLE | All five references inspected. Available image-free renders were reviewed and corrected over multiple passes. No equivalent photographic tenant exists locally for a valid side-by-side visual acceptance pass. |
| Anti-slop scan | PASS | Executed on 38 changed storefront/checkout/preview files; no findings. |
| Motion audit | PASS | Executed on the same 38 files; no findings. |

## Browser and route verification

Test tenant: `operator-d7e97e39`; real published tour: `c14cd4c3-3bc0-48ec-99ec-465341a29db1`.

| Route/check | Result | Coverage |
| --- | --- | --- |
| Home | PASS | All five themes, one-tour/image-free data, rendered screenshots and overflow measurements |
| Tours listing | PASS | All five themes; search/empty results, mobile filter Sheet, sorting/filter UI and published cards |
| Tour detail | PASS | All five themes; itinerary, departure capacity, booking entry, mobile CTA; traveler count 2 carried into checkout |
| Checkout | PASS | All five themes rendered; real read-only price check, 1→2 travelers, invalid-code rejection/removal, guest form remains available; no final booking submitted |
| Policies | PASS | All five themes; current empty published state; shared visible/anchored populated policy rendering tested automatically |
| Booking success access guard | PASS | Missing traveler access redirects to the private-access notice |
| Completed booking-success screen | NOT RUN | No new booking or payment was created; no accessible completed-flow token was available for visual QA |
| Admin desktop/mobile preview | PASS | Shared iframe renderer, theme changes, mobile menu mouse/keyboard activation and Escape dismissal, footer, saved-state restoration |
| Draft versus live | PASS | Unsaved Minimal preview did not change the public Atlas theme; restored saved Admin state, Save disabled; publication reader unchanged |
| Production smoke test | PASS | Local built server: home/list/detail/checkout/policies returned 200; development QA route returned 404 |
| Internal-note response check | PASS | Production HTML/RSC responses for the five public routes did not contain the internal `brandVoice` key; client appearance props use a whitelist |
| Public runtime console | PASS | Final clean in-app browser pass had no warnings/errors, including Mongolian route traversal |
| Admin console | NOT AVAILABLE | A fully clean console is unavailable in the extension-enabled Chrome profile. Final rendering and interactions worked after reload with no new application translation errors; extension stream/listener warnings remain. Earlier hot-reload label errors were resolved. |
| Server smoke-test logs | PASS | Production server started successfully; tested responses had no runtime failures |
| Thumbnails | PASS | Five WebP crops generated from actual final 1440px theme renders; no invented photographic promise. Current fixture is intentionally image-free. |

Viewport checks: **PASS** at 375×812, 390×844, 430×932, 768×1024, 1024×768, 1280×800, 1440×900 and 1920×1080. Additional homepage checks: **PASS** at 320px and 414px. Recorded 50 English homepage checks, 160 English secondary-route checks, and 50 Mongolian theme/route checks at phone/desktop widths, with no horizontal overflow. These are layout measurements, not a claim of exhaustive interaction testing at every size. Screenshots were inspected at representative mobile and desktop sizes.

## Accessibility, tests and quality gates

| Verification | Result | Detail |
| --- | --- | --- |
| Keyboard/menu/dialog behavior | PASS | Menu activation, focus inside dialog, Escape dismissal and focus returned to the menu trigger |
| Reduced motion | PASS | Browser emulation: dialog animation `none`, transition `0s`; UI portals honor reduced motion |
| Tested contrast pairs | PASS | Body muted/background 5.77:1; primary white label 10.15:1; accent black label 17.40:1; automated unsafe-color/foreground tests |
| Complete WCAG audit | NOT RUN | No claim of complete AA certification or photographic-overlay contrast validation |
| Mongolian/English | PASS | Matching catalogs, actual localized route checks, stable Cyrillic dates, singular English duration label |
| Theme tests | PASS | 30 tests in theme package, including registry/all themes, 0/1/2/3/4+ layouts, missing/hidden sections, hero fallback, preview parity, color safety, localization, policy visibility and promotion-dialog contract |
| Quote tests | PASS | Five new tests: trusted published price, tenant-scoped read-only lookup, injected tenant/price rejection, unpublished/foreign departure rejection, capacity/expiry, no-code guest quote |
| Existing root suite | PASS | 80 tests; package tests also executed through the real root command |
| Database integration coverage | NOT AVAILABLE | 50 tests skipped because `TEST_DATABASE_URL` is not configured |
| Active-promotion browser discount | NOT AVAILABLE | Only existing local promotion was paused; it was not enabled for QA |
| Guest booking submission/payment | NOT RUN | Preserved existing action and secure access flow; no transactional submission performed |
| Lint | PASS | `bun run lint`, exit 0; 14 CSS warnings remain, no errors |
| Typecheck | PASS | `bun run typecheck`, exit 0 |
| Tests | PASS | `bun run test`, exit 0; skipped integration coverage disclosed above |
| Admin build | PASS | Production build executed, exit 0 |
| Storefront build | PASS | Production build executed, exit 0 |
| Final build command | PASS | `bun run build --cache=local:r`, both apps, no final disk warning |
| Git whitespace check | PASS | `git diff --check`; existing repository line-ending notices only |
| Core Web Vitals/Lighthouse | NOT RUN | No measured performance score claimed |
| Deployment/remote verification | NOT RUN | Local changes only |

## Remaining limitations and visual differences

- Published photography is missing. Cinematic heroes, gallery crops, multi-image stories, and the reference-level photographic result require a tenant with actual published media. The requested tenant identifier remains pending.
- Current data cannot demonstrate 2/3/4+ tours, testimonials, FAQ body, populated policies, or real aggregate sections in the browser. Their omission/count logic is covered by tests; populated visual coverage is incomplete.
- Existing schemas provide plain configured section bodies, not structured review authors/ratings or FAQ question-answer records. No new fabricated structured data was introduced.
- Images use dimensioned Next/Image components with failure handling, but arbitrary tenant hosts remain unoptimized rather than being proxied through an unrestricted image optimizer. Responsive media optimization needs an approved media delivery policy.
- The existing payment flow creates a pending booking request and gives operator payment instructions. It does not provide an online payment adapter; success copy preserves that distinction.
- Secondary pages share behavior and theme tokens. Rich photographic differences and complete reference likeness remain unapproved.
- Automatic approval review blocked cleanup of `C:\Users\byrln\AppData\Local\Temp\nomera-storefront-before-20260913`. This incomplete task-created backup remains. The source-only backup is retained separately. A disk warning on D: was resolved by removing six task-created Turbo build archives; source and dependencies were preserved.

Local screenshots and metric JSON files are in the ignored `test-results/storefront-qa/` folder. Build, lint, typecheck and test logs are copied there for review. The Admin data was restored to its saved state; no Save or Publish action was taken.
