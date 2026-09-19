# Source-owned shadcn components

User requirement: shadcn or inspected 21st.dev components for product UI, with only limited semantic HTML exceptions. This is recorded in AGENTS.md for subsequent phases.

Official registry: https://ui.shadcn.com/r/styles/radix-nova/{component}.json. Sources inspected through `bunx --bun shadcn@latest view` after `info`, `docs` and an `add --dry-run` preview. Existing Button, Card, Badge, Input and Separator were preserved. The dry run proposed an unrelated `cn` dependency and overwriting existing primitives, so new registry files were imported individually with NOMERA aliases and Lucide icons. Recharts 3.10.1 is the existing application's version and is now an explicit UI package dependency.

Added compositions: Sidebar, Chart, Table, Field, Select, Checkbox, ToggleGroup, Collapsible, Empty, Alert, Progress, Skeleton, Item, Tooltip, Label, Sheet, Toggle, Textarea, Tabs, Dialog and Pagination, with Sidebar's mobile hook.

Adaptations: NOMERA semantic tokens and control height; explicit Radix `data-state` / `data-orientation` selectors; localized Sidebar and Dialog labels; focusable Table scroll-container props; stable SSR skeleton width; accessible Progress value; targeted transitions and global reduced-motion override. Chart styles are rendered as escaped React text, and chart keyboard focus remains visible. No unrelated component framework or `cn` package installed.

21st.dev: https://21st.dev/@originui/components/table (demo96) and Table Edit demo7457 were inspected. Their useful table composition is already represented by the official shadcn source. Demonstration data fetches and client-only editing were rejected.

Raw HTML exceptions: semantic main/header/form/heading/text structure, layout containers, hidden form inputs, SVG/Recharts output, and the DOM internals of shared primitives. Feature code uses the actual primitives for interactive controls, cards, dialogs, fields, tables, chart containers, alerts and empty/loading states.
