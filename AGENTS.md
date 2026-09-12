# NOMERA engineering rules

Product: NOMERA — Booking Engine + Operations Platform for Tour Operators.
Previous name: TOMS. Never introduce new TOMS naming.

This file is the shared development policy for all agents. `CLAUDE.md` imports it for Claude Code; keep project rules here so the two entrypoints do not drift.

## Ownership and scope

- `apps/admin`: authenticated operations application, compact and desktop efficient. The initial preview is public; authentication is not implemented yet.
- `apps/storefront`: public, mobile first, editorial traveler experience. Tenant routing, SEO policy and booking flows require a separate design phase.
- Share source-owned primitives through `@nomera/ui`; application composition stays in each app. Shared primitives do not mean identical product UI.
- `@nomera/storefront-themes` contains contracts only. Do not invent themes or business data during setup.
- Create feature directories only when used. No fake dashboard, navigation or feature pages.

## Tools and code

- Use Bun and the committed `bun.lock`. Do not use npm, pnpm or Yarn unless a required external tool forces it.
- Strict TypeScript. No unexplained `any` or `@ts-ignore` without justification.
- Use `@/*` within apps and explicit `@nomera/*` package exports. Avoid deep cross-package relative imports and cycles.
- Keep React Server Components the default; add client boundaries for interactions and providers only.
- Query providers own a QueryClient per mounted app provider; never share user query caches globally on the server.
- Use Zod for runtime validation and next-intl for localizable text. Default locale is `mn`; support `en` with matching catalog keys.
- Use shadcn/Radix first, then appropriate 21st.dev or justified OSS source. No duplicate component systems or unnecessary UI/state/API/ORM libraries.
- Run shadcn with Bun from the app or `packages/ui`; inspect generated imports and dependencies. Use `@nomera/ui/lib/utils`, not an unrelated npm `cn` package.
- Add only components actually needed. Read installed Next.js documentation before changing unfamiliar framework conventions.

## Mandatory frontend skills and MCPs

For **every frontend development task**, always use all three design skills and both research MCPs below. This includes new screens, components, styling, redesigns, responsive fixes and interaction changes in either app or shared UI. Do not wait for the user to repeat this requirement. Scale the research to the task; a small fix needs a focused check, not a full redesign.

Read the actual skill instructions before frontend work, and load their relevant references as needed:

| Required skill | Local entrypoint | Responsibility |
| --- | --- | --- |
| `hallmark` | [SKILL.md](C:/Users/byrln/.agents/skills/hallmark/SKILL.md) | Structural variety, hierarchy, restraint and anti-slop review |
| `tastemaker` | [SKILL.md](C:/Users/byrln/.agents/skills/tastemaker/SKILL.md) | Reference-grounded design, coherent tokens, component sourcing and interface craft |
| `gpt-taste` | [SKILL.md](C:/Users/byrln/.agents/skills/gpt-taste/SKILL.md) | Typography, composition, grid quality, visual character and purposeful motion |

These paths identify this workstation's installed skills. On another machine, resolve the same skill names from the available skill catalog or local skill directories. Never pretend an unread or missing skill was applied.

- **Mobbin MCP — always use:** search for the relevant workflow or screen, inspect the returned visual evidence, and extract interaction patterns. Record source links and the pattern being adopted or rejected. Never blindly copy an individual screen.
- **21st.dev MCP — always use:** search for the relevant component or composition, then inspect candidate source and dependencies before selecting it. A search does not authorize installation. Prefer an existing NOMERA primitive when it already solves the need; explain that choice briefly.
- Check both MCPs in the current task; an old connection check is not proof of current availability. Keep queries narrow for small changes. Record empty results honestly.
- If a skill or MCP is unavailable, attempt discovery/reconnection through available tools, record `not connected` or `misconfigured` and the concrete failure, then continue authorized work using inspected project components and available evidence. Clearly report the missing step; do not silently skip it or claim the full research workflow passed.
- Documentation-only and backend-only tasks do not require unrelated visual searches.

### Frontend execution sequence

1. Inspect the requested surface, current behavior, existing components, tokens, translations and dependencies.
2. Read `hallmark`, `tastemaker` and `gpt-taste`. Reuse an existing project style lock or approved design direction when present.
3. Research the workflow through Mobbin MCP and inspect actual references.
4. Research suitable components through 21st.dev MCP; inspect any candidate before adoption.
5. State a short design direction: audience, workflow, hierarchy, density, typography, component choices and motion purpose. Map the change to concrete files.
6. Implement within NOMERA's existing architecture, with shared primitives and localized, truthful content.
7. Review against all three skills and the anti-slop gate below. Fix weak hierarchy, generic composition and inconsistent details before handoff.
8. Exercise interactions and relevant loading, empty, error, success, disabled and focus states. Never add fake states or business data merely to fill the screen.
9. Verify browser rendering at 375, 768, 1024 and 1440 pixels, plus 320 and 414 pixels where required by the skill. Check both locales, applicable color themes, keyboard operation, contrast and reduced motion.
10. Report the references used, components reused/adapted, checks actually run and any remaining limitation. Never substitute a passing build for browser proof.

### Applying the skills to NOMERA

Use the skills together within the user's requested scope and the established product architecture. NOMERA's Railway-hosted PostgreSQL backend, source-owned UI, Mongolian/Cyrillic support, accessibility and approved design decisions remain constraints on implementation.

- Admin screens are operational: prioritize scanability, efficient controls, clear forms, useful data density and fast repeated use. Do not force marketing heroes, AIDA sections, enormous whitespace or scroll-pinned storytelling into operational screens.
- Storefront screens may use editorial composition, imagery and richer motion when they serve the actual traveler workflow. Do not turn the storefront into an admin dashboard.
- Preserve approved fonts and tokens unless changing them is part of the task. Do not swap away Cyrillic support to satisfy a generic font list.
- Choose motion for a concrete interaction or narrative purpose. Add GSAP only when the required behavior justifies the dependency; honor reduced motion, performance and repeated-use comfort.
- Resolve conflicting stylistic defaults against the actual surface and existing design direction. Do not randomize layouts merely for novelty, hide overflow to conceal a layout defect, or force extra content to satisfy a template.
- Execute any claimed script or randomization for real. Never present simulated tool output, invented research, fabricated measurements or unrun checks as evidence.

### Anti-AI-slop acceptance gate

- Design from the workflow and real content, not a generic hero → three cards → CTA template.
- No default purple/cyan gradients, gradient headings, excessive glass effects, decorative blobs, unnecessary bento grids or repeated card stacks without a specific design reason.
- No fake metrics, testimonials, client logos, revenue charts, placeholder business data, dead buttons or invented navigation.
- No meaningless section numbering, badge clutter, emoji UI icons, fake browser/device chrome or generic marketing filler. Every label and visual element must earn its place.
- Use deliberate hierarchy, a consistent spacing scale, aligned grids and restrained radius/shadow treatment. Avoid awkward heading wraps, unreadable button labels and empty grid cells.
- Use real, relevant assets or intentional illustrations. Do not use random stock placeholders as finished product imagery.
- Keep component colors, typography and interaction states consistent with the NOMERA tokens; adapt sourced components rather than leaving their original styling intact.
- Prefer subtle, targeted transitions over `transition-all`, gratuitous movement or scroll effects that obstruct the task.
- Validate localized content, visible focus, semantic controls, contrast, responsive behavior and actual interaction results. Fix the rendered cause of clipping or overflow.
- Run the applicable Hallmark/Tastemaker critique and anti-slop/motion checks against changed UI files. Resolve serious findings before claiming completion; do not mechanically re-skin unrelated screens.

## Backend and security

- Railway hosts the application and PostgreSQL service. Use the existing Next.js server boundaries and `@nomera/postgres`; do not introduce a second API app, ORM or competing database stack.
- Browser code never receives `DATABASE_URL`. Use server route handlers and Server Actions for database-backed operations.
- Import database helpers explicitly from `@nomera/postgres/server/*`. Preserve `server-only` guards; no server re-exports from neutral/client entrypoints.
- Reuse the server PostgreSQL pool, but resolve tenant authorization per request. Never share session or tenant context between requests.
- Never expose `DATABASE_URL` in browser output, logs or commits. Keep server validation lazy and separate.
- Never trust tenant IDs, roles or calculated prices from the browser. API-key clients bypass user permissions; authorize future privileged operations server-side.
- Preserve existing `.env.local` files. Examples contain public configuration and a blank key.
- Database changes must be versioned in `db/migrations` and applied through the migration runner. Do not edit production data directly during setup.

## Design foundation

- Semantic variables live in `packages/ui/src/styles.css`; no scattered raw component colors.
- Use Tailwind 4 spacing (4px base), compact control gaps and larger section spacing. Containers: admin 68rem, storefront 80rem.
- Default control height 40px, large CTA 48px; compact variants explicit. Use radius and duration tokens.
- Noto Sans supports Mongolian Cyrillic and English; storefront headings use Noto Serif. Use `next/font` and preserve glyph support.
- Preserve contrast in both themes, reduced motion, semantic elements and accessible names. No clickable divs.
- Future dialogs/dropdowns must use accessible primitives and keyboard verification; neither is required by this preview.

## Quality

`bun run lint`, `bun run typecheck`, `bun run test` and `bun run build` must pass before completion. `bun run check` runs all four.
Use meaningful tests for validation, security boundaries and changed behavior. Build success is not browser proof: exercise controls, inspect console output and check responsive layouts.
Preserve unrelated work and Git configuration. Never commit env files, secrets or generated output. Report local, deployed and remotely verified results distinctly.
