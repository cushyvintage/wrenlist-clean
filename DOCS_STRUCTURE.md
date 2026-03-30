# Documentation Structure

Quick guide for what each doc contains and when to update it.

## Active Docs (Keep in Root)

| File | Purpose | Update When |
|------|---------|------------|
| **README.md** | Project overview, quick start, tech stack | Setup or phase changes |
| **CLAUDE.md** | Dev instructions, patterns, gotchas | New patterns or gotchas discovered |
| **ARCHITECTURE.md** | System design, data flows, components | Architectural decisions change |
| **DATABASE_SCHEMA.md** | Schema, tables, relationships | Database migrations or new tables |
| **DESIGN_PATTERNS.md** | Tailwind, components, colors, spacing | Design system updates |
| **API.md** | REST API endpoints, auth, responses | Endpoint changes or new routes |
| **PRD.md** | Product requirements, phases, features | Feature scope changes |
| **SETUP.md** | Local dev setup, env vars, commands | Setup process changes |

## Reference (Meta Docs)

- **DOCS_STRUCTURE.md** — This file; documentation guidelines

## Archive (.archive/)

**Historical**: Phase build notes, page logs, old schemas, roadmaps
**Implementation Details**: Feature-specific setup guides (auth, Supabase, marketplaces, tests)

Archive when docs are >30 days old or superseded by root documentation.

---

## Guidelines

- **Root docs are canonical** — single source of truth
- **Archive for history** — implementation details, old patterns
- **Link to code** — reference actual implementations in `/src`
- **Keep current** — date decisions and update timestamps
- **One topic per file** — clear separation of concerns

**Last tidied**: 2026-03-30 | 8 active docs + 1 reference + archive
