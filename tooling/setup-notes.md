# Setup provenance

2026-09-12 environment: Node 24.18.0, Git 2.55.0.windows.3. Bun was missing and installed using the official Windows installer: 1.4.2. Existing Git configuration retained.

No Better Fullstack MCP was available. Inspected `bun create better-fullstack@latest --help`.

Successful dry run in the OS temporary directory:

```sh
bun create better-fullstack@latest nomera --dry-run --shape frontend --ecosystem typescript --frontend next --backend none --runtime none --database none --orm none --auth none --api none --payments none --email none --package-manager bun --workspace-shape monorepo --css-framework tailwind --ui-library shadcn-ui --shadcn-base radix --shadcn-font noto-sans --validation zod --testing vitest --i18n next-intl --examples none --no-git --no-install --disable-analytics
```

The dry run listed 45 files, one `apps/web`, local UI, `packages/env`, `packages/config` and Turbo. It defaulted forms to react-hook-form; actual generation explicitly disabled forms:

```sh
bun create better-fullstack@latest nomera-foundation-scaffold --shape frontend --ecosystem typescript --frontend next --backend none --runtime none --database none --orm none --auth none --api none --payments none --email none --forms none --package-manager bun --workspace-shape monorepo --css-framework tailwind --ui-library shadcn-ui --shadcn-base radix --shadcn-font noto-sans --validation zod --testing vitest --i18n next-intl --examples none --ai-docs none --no-git --no-install --disable-analytics
```

The generated project was inspected in the temporary directory. Workspace and TypeScript conventions were adapted into NOMERA. No generated backend/auth/database code was imported. Live validation rejected `--yes` combined with core flags and `--shape` combined with `--part`; successful commands above use supported combinations. Turborepo comes with the frontend monorepo shape.

## Adaptations and removals

- One `apps/web` became two named Next apps. The CLI exposed framework choices rather than two separately named Next applications.
- Radix selection generated Base UI code and both dependencies. Generated the required Radix source directly:

```sh
bunx --bun shadcn@latest add button badge card separator --cwd packages/ui --yes
```

- Added self-alias resolution to UI TypeScript config. Replaced the CLI's external `cn` imports/dependency with `@nomera/ui/lib/utils`.
- Discarded unused Base UI, TanStack Form, Sonner, React compiler plugin, dotenv, fontsource, shadcn runtime/CLI dependency, testing-library/jsdom/coverage/UI test extras and app-local UI duplicates. No DB/ORM/auth/API dependencies remain. Kept next-themes for exercised theme persistence.
- Biome was chosen because the scaffold had no linter configuration. Its recommended rules are enabled.
- French examples replaced by small Mongolian/English catalogs. Cookie locales keep root previews simple; storefront SEO/tenant locale routing is deferred. Previews are noindex.
- Noto Sans and Noto Serif load with next/font and Cyrillic subsets. No empty feature folders, actual themes, domain schemas, business pages or fake data.
- Browser plugin/skill was unavailable; browser QA used bundled Playwright with artifacts outside the repository.

## Sources

- [Bun installation](https://bun.sh/docs/installation)
- [Railway variables](https://docs.railway.com/variables)
- [Railway PostgreSQL](https://docs.railway.com/guides/postgresql)
- [next-intl App Router setup](https://next-intl.dev/docs/getting-started/app-router)
- [shadcn Radix primitives](https://ui.shadcn.com/docs/components/radix/button)

## MCP checks

Mobbin: **connected**, one `application setup checklist` screen search returned a result.
21st.dev: **connected**, one `button` metadata search returned a result.
These were read-only connection checks, not UX research or component installation.
