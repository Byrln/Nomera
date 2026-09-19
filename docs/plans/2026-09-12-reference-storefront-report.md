# Storefront reference implementation

Implemented the supplied General, Homepage, Policies, SEO and Publish compositions in `apps/admin/features/storefront`. The shared admin shell remains root-owned. Existing save, publish, schedule, restore, authorization, optimistic version checks and immutable public snapshots remain in use.

## Reference and components

Source images: `D:/Downloads/ChatGPT Image Sep 12, 2026, 10_32_54 PM.png` (General), `10_32_46 PM.png` (Homepage), `10_32_43 PM.png` (Policies), `10_32_39 PM.png` (SEO), and `10_32_50 PM.png` (Publish), all using the same filename prefix. Viewed all five. Applied the source's five-theme gallery, compact branding forms, tab navigation within the editing pane, paired preview, policy rows, SEO previews and publication checklist/history. Publish follows its separate full-width tabs and status composition.

Read image-to-code, Hallmark, Tastemaker and GPT Taste. The exact supplied references override generating or randomizing another direction. Research availability and inspected 21st.dev candidate are recorded in the shared reference plan: existing NOMERA shadcn primitives were selected; Mobbin is not connected. Reused Button, Input, Label, Checkbox, Select, Textarea, Dialog, Collapsible, Badge, Table and Progress. Added no component library or animation dependency.

Five small theme images were extracted from supplied image regions into `apps/admin/public/images/storefront-themes`. Atlas uses the clean mountain photograph portion without a baked selection check or text. No screenshot is used as a full-screen background. Also extracted the root-requested sidebar photo and exact mountain mark into `admin-sidebar.webp` and `nomera-mark.webp` from the supplied dashboard image. Runtime previews contain actual tenant data and published tours, never screenshot example tours.

## Working behavior

- Theme, colors, font, logo URL, brand voice, contact information and CTA update the draft preview immediately. Tabs preserve unsaved edits while updating the route.
- Homepage exposes all eight predefined sections with expansion, layout selection, visibility, reorder controls and published-tour selection.
- Nine policy rows open buffered edit dialogs with Apply/Cancel. Applied text appears in the draft policy preview. Empty policies are truthfully marked empty.
- SEO includes metadata, slug, canonical URL, image URLs, indexing, structured data, published sitemap link, actual image-alt coverage and search/social previews. Readiness checks derive from current draft values.
- Publish shows actual draft/live state, immutable version history and publication activity. Unsaved changes disable publish/schedule until saved. Scheduling uses the existing local-time input and server action. Restore retains its confirmation.
- Published preview uses the published snapshot and published URL even if the unsaved draft slug changes. Draft preview uses the draft URL.
- Custom-domain/SSL connection is explicitly unverified. Private preview is in-app; no separate staging service is claimed. Image controls accept HTTPS references and do not pretend to upload files.

## Verification performed

- Admin typecheck passed after final edits.
- Scoped Biome check passed for the storefront feature and route layout.
- Three focused readiness/date tests passed.
- Tastemaker anti-slop scan and motion audit passed, scanning ten files.
- Browser: all five panels exercised at 375, 768 and 1440 pixels in MN and EN; document scroll width stayed within client width. General also checked at 320, 414 and 1024. Tablet themes use three columns and phone themes use two. Preview scrollbar geometry was corrected using scaled layout and a stable scrollbar gutter; narrow publication preview measured 383px client/scroll width after the correction.
- Visually reviewed desktop General and Publish, tablet General and Policies, mobile SEO and Publish, and dark General. Shared Noto typography and semantic colors remain intact.
- Exercised unsaved name editing/live preview, policy dialog Apply, tab persistence, SEO social toggle, unsaved slug followed by published preview, dirty publication guards, schedule dialog's empty-date disabled state and Escape dismissal. Did not save, publish, schedule or restore QA tenant changes; reloaded to discard them.
- Fresh console inspection found the existing browser-extension-injected body attribute hydration warning and extension stream/listener warnings. Earlier transient shared-header and operations source-write build errors were fixed by their owners. No storefront runtime error remained in the fresh session.

Full repository gates and production build belong to root integration and were not rerun by this agent. No commits, remote writes or deployment performed. Viewport override was reset and the QA interface returned to MN/light.
