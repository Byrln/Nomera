# Admin sign-in implementation — 2026-09-12

> Historical report from the Appwrite prototype. The active implementation replaces its backend paths with Railway PostgreSQL; see [Phase 0 report](phase-0-report.md).

Implemented the user's selected [Maze reference](https://mobbin.com/screens/20b59c31-2320-4c32-a09b-374cb2821a17): a focused form on the left and a lime travel composition on the right. The earlier generic sign-in references were rejected. This is the Admin access slice of the broader implementation document; Dashboard and operational modules are not completed by this change.

## Design and sources

- Inspected the exact user-linked screen in Chrome. Mobbin MCP also returned [related Maze onboarding](https://mobbin.com/screens/f839ee1e-019d-4999-b23b-3ceaac469fe3), confirming the white/lime split. Adopted hierarchy and proportions, not Maze content or branding.
- 21st.dev MCP source/dependency inspection: [login-03, ID 21494](https://21st.dev/@ephraimduncan/components/login-03). Used its native labeled-field pattern. Reused NOMERA Button and introduced a small source-owned Input; no new component/form dependency. Omitted inactive recovery, signup and SSO links.
- Applied Hallmark, Tastemaker and GPT Taste within the existing Noto Sans/Cyrillic, forest-primary, semantic-token system. No GSAP dependency: repeated sign-in requires simple control feedback.
- `apps/admin/public/images/nomera-travel.webp` is an AI-generated conceptual travel collage: rider/steppe, dunes/camels and ger/lake. It does not represent a bookable trip or verified location. Generated through the image tool, then encoded as WebP (173,676 bytes); decorative empty alt avoids redundant narration.
- Form-first layout at phone sizes; desktop split approximately 37/63 with a minimum usable form column at tablet widths. Both languages and themes supported.

## Behavior and boundaries

- `/sign-in`: bounded email/password validation, password visibility, loading/disabled state and localized sanitized errors. Entered values survive failed submissions. Fixed post-login destination is `/workspaces`.
- Session creation uses a fresh Appwrite server client. Only the secret/expiry cookie envelope crosses into the server action; provider access tokens and full session models never reach React props/action results. Cookies are HttpOnly, host-only, SameSite=Lax, path `/`, and Secure in production.
- `/workspaces`: verified active account and accepted recognized-role membership required. Reads 21 teams at most, checks at most 20 memberships per page, and supplies cursor pagination. No fabricated teams or dashboard content.
- Selecting a workspace resolves tenant authority again on the server. A tenant cookie is a selector, never proof of access. Signing out revokes the provider session before clearing cookies; failures remain visible instead of falsely claiming revocation succeeded.
- Auth/workspace submissions clear query and Realtime state. Existing request-scoped repository ownership remains unchanged.
- Server Actions reject cross-origin requests under Next's host/origin checks and default body limit. Deployment proxies must overwrite forwarded headers. No remote accounts, memberships, tables, buckets or other resources were provisioned.
- Browser schema imports use explicit subpath exports so unrelated server credential schema declarations are not pulled into client chunks.

## Verification

- `bun run check`: lint, strict typecheck, tests and both production builds pass. **100 tests** across 11 files: schemas 11, domain 23, Appwrite 45, tooling 21. The 23 new tests cover session validation/redaction, expired responses, missing config, revocation, cookie/action boundaries, verified memberships and bounded cursor pagination.
- `bun install --frozen-lockfile`: passes with no dependency changes.
- Production browser-chunk scan: zero matches for server credential declarations, server Appwrite SDK or authentication-test secret markers.
- Browser: production Admin served locally on port 3100. Checked 320, 375, 414, 768, 1024 and 1440 pixels in Mongolian/English and light/dark; no horizontal overflow. Screenshots inspected across mobile/tablet/desktop, including the below-form mobile travel panel.
- Exercised invalid/empty fields, focus transfer, password reveal/conceal, pending disabled submit, actual missing-configuration response, retained values, locale switch and theme switch. Tab order follows email → password → visibility → submit → language → theme. Focus ring is immediate and opaque; inputs and primary controls are 44px high on this surface.
- Measured rendered contrast: muted text 6.68:1 light / 6.79:1 dark; labels 16.57:1 / 14.11:1; primary text 11.13:1 / 10.18:1; input boundaries 3.59:1 / 4.29:1; focus color against form surface 6.77:1 / 9.25:1; travel heading 10.29:1.
- Emulated reduced motion: effective control transition duration 0.01ms. Reset the temporary media override after checking.
- Final production page console: no application errors or warnings. HTTP smoke: sign-in 200, unauthenticated workspaces 307 to sign-in, unauthenticated tenant API 401; all private/no-store. Temporary viewport overrides reset; local production preview left open on port 3100.
- Tastemaker anti-slop scanner passes all 8 changed UI files. Motion audit's one medium finding is a file-local false positive: shared Button uses the global reduced-motion rule in `packages/ui/src/styles.css`. No new motion library or page animation.
- Independent read-only reviewer found no critical or important defect. Added the two suggested regression cases for expired session responses and forwarded pagination cursors.

## Remaining limitations

Both existing `.env.local` files still have blank server keys. The configured-unavailable sign-in path is exercised. Session issuance, membership filtering, selection and revocation have isolated SDK/action coverage; successful login and populated/empty workspace states remain unverified in an authenticated browser. Supply an existing verified staff account, accepted membership and server key with `sessions.write` to finish remote acceptance. No secrets were changed, logged or committed.

Before internet-facing use, configure HTTPS and deployment-level sign-in rate limiting. Appwrite API-key requests bypass its usual user rate limit; this repository does not provide a distributed limiter. See [Appwrite SSR guidance](https://appwrite.io/docs/products/auth/server-side-rendering).

The pre-existing port-3000 development session showed stale/unhydrated interactions and a browser-extension-injected body attribute warning. A fresh production session on port 3100 responded correctly and was used for verification. Existing development processes and unrelated work were preserved. No deployment, commit or push was performed.
