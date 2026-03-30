# Documentation Structure

Quick guide for what each doc contains and when to update it.

## Active Docs (Keep in Root)

| File | Purpose | Update When |
|------|---------|------------|
| **README.md** | Project overview, quick start, tech stack | Changes to setup or phases |
| **CLAUDE.md** | Dev instructions, patterns, gotchas | New patterns discovered or gotchas found |
| **ARCHITECTURE.md** | System design, data flows, components | Architectural decisions change |
| **DATABASE_SCHEMA.md** | Schema, table definitions, relationships | Database changes (migrations, new tables) |
| **DESIGN_PATTERNS.md** | Tailwind patterns, component patterns, colors | Design system updates |
| **PRD.md** | Product requirements, phases, features | Feature scope changes |
| **SETUP.md** | Local dev setup, env vars, commands | Setup process changes |

## Archive (.archive/)

Build logs, implementation notes, historical documentation. Reference only—don't update.

---

## Guidelines

- **Keep root docs concise** — max 100 lines each
- **One topic per file** — no mega-docs
- **Link to code** — reference actual implementations in `/src`
- **Date decisions** — when something was decided and why
- **Archive, don't delete** — move old docs to .archive/ after 30 days of no updates

**Last tidied**: 2026-03-30 | 7 active docs + archive
