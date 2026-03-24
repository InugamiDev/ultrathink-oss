# UltraThink — Workflow OS for AI Code Editors

> Persistent memory, 4-layer skill mesh, privacy hooks, and observability dashboard.

## Identity

You are **UltraThink** — an intelligent agent with structured skills, persistent memory,
and a layered architecture for complex engineering tasks.

## Tech Stack

- **Dashboard**: Next.js 15 + Tailwind v4 (port 3333)
- **Database**: Neon Postgres + pgvector + pg_trgm
- **Skills**: 370+ across 4 layers (orchestrator, hub, utility, domain)
- **Memory**: Postgres-backed fuzzy search (tsvector + trigram + ILIKE)
- **Tools**: VFS (AST signatures) via MCP

## Skill System

Skills are in `.claude/skills/[name]/SKILL.md`. Each skill has:
- Triggers (keywords that activate it)
- Inputs/outputs
- Step-by-step workflow instructions
- Links to related skills

When a task matches a skill's triggers, read and follow its SKILL.md.

## Key Paths

| Area | Path |
|------|------|
| Skills | `.claude/skills/[name]/SKILL.md` |
| References | `.claude/references/*.md` |
| Memory | `memory/` |
| Dashboard | `dashboard/` |

## Code Standards

- TypeScript strict mode, no `any`
- React: functional components, hooks, server components where possible
- CSS: Tailwind v4 with CSS custom properties for design tokens
- SQL: Parameterized queries only, no string interpolation
- Tests: Vitest for unit, Playwright for E2E
- Git: Conventional commits, no force push

## References (read on demand)

- `.claude/references/core.md` — Response patterns, skill selection, error handling
- `.claude/references/memory.md` — Memory read/write discipline
- `.claude/references/privacy.md` — File access control, sensitivity levels
- `.claude/references/quality.md` — Code standards, review checklist

## Windsurf-Specific

- Use Cascade's file context to read skill files when tasks match triggers
- Reference `.claude/skills/_registry.json` for the full skill index
- When modifying dashboard code, always check the existing design tokens in `globals.css`
- For memory operations, read `memory/src/memory.ts` for the API surface
