# NOMERA — Claude Code development instructions

@AGENTS.md

Read and follow the root `AGENTS.md` before working. It is the canonical policy for product scope, architecture, security, design and verification. If automatic imports are unavailable, open it explicitly. Keep shared rules in `AGENTS.md` rather than maintaining a divergent copy here.

## Mandatory frontend workflow

For every frontend task, always read and apply all three skills:

- [hallmark](C:/Users/byrln/.agents/skills/hallmark/SKILL.md)
- [tastemaker](C:/Users/byrln/.agents/skills/tastemaker/SKILL.md)
- [gpt-taste](C:/Users/byrln/.agents/skills/gpt-taste/SKILL.md)

Always use **Mobbin MCP** for workflow/reference research and **21st.dev MCP** for component research. Inspect returned evidence and any source selected for adoption. Reuse NOMERA primitives when suitable; never blindly copy screens or install registry components.

Apply the frontend execution sequence, skill conflict rules and anti-AI-slop acceptance gate in `AGENTS.md`. Keep admin compact and operational, and storefront editorial and traveler-focused. Preserve approved tokens, Cyrillic typography, localization, accessibility and performance. Report missing skills/MCPs honestly using the documented fallback; never claim research or verification that did not happen.

## Development essentials

- Use Bun, strict TypeScript and the existing two-app Turborepo structure.
- Keep `DATABASE_URL` server-only. PostgreSQL access goes through `@nomera/postgres`; do not add a second ORM or competing database stack.
- Preserve unrelated work and existing environment files. Implement only the requested development phase.
- Before completion, run `bun run check` and verify changed frontend behavior in the browser. Report actual results and limitations.
