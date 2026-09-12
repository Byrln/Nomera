# Admin sign-in and workspace access

> Superseded backend paths: the active implementation uses `@nomera/postgres` and Railway PostgreSQL.

User direction: implement the split composition from [Maze on Mobbin](https://mobbin.com/screens/20b59c31-2320-4c32-a09b-374cb2821a17). The earlier HBO Max and Zendesk references were rejected.

Audience: tour operator staff. Left 37%: brand, compact email/password form, preferences. Right 63%: lime travel collage, restrained product statement. On narrow screens the form comes first. Keep Noto Sans with Cyrillic, existing forest primary, semantic tokens, and source-owned Button/Input. Motion only for control feedback; honor reduced motion.

Research: inspected the exact user screenshot in Chrome and [related Maze onboarding](https://mobbin.com/screens/f839ee1e-019d-4999-b23b-3ceaac469fe3) through Mobbin MCP. Inspected source/dependencies of [21st.dev login-03](https://21st.dev/@ephraimduncan/components/login-03), ID 21494. Adopt native labeled field structure; reuse NOMERA Button and adapt Input. Do not adopt dead links, social authentication, centered card composition or additional form libraries.

Hallmark, Tastemaker and GPT Taste apply within the approved project system. No arbitrary layout randomization, forced GSAP, fake logos, metrics, tours or navigation. Travel art is generated conceptual brand illustration, not evidence of an actual tour.

Implementation map:
- `packages/schemas/src/auth.ts`: bounded credentials and session response validation.
- `packages/appwrite/src/server/auth.ts`: request-local session creation/revocation and bounded authorized workspace discovery.
- `apps/admin/app/sign-in`: server actions and responsive sign-in.
- `apps/admin/app/workspaces`: authenticated real workspace selection; no invented Dashboard.
- `apps/admin/components/auth*`, shared Input/tokens, both locale catalogs, public artwork.

Verification: meaningful session/security tests, all four project gates, rendered widths 320/375/414/768/1024/1440, both locales/themes, keyboard, validation, loading/error and reduced motion. Remote successful login requires configured server credentials and an existing verified account; report unverified conditions explicitly.
