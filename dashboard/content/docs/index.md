# UltraThink

**A Workflow OS for Claude Code** — persistent memory, 4-layer skill mesh, privacy hooks, and an observability dashboard.

---

## What is UltraThink?

UltraThink transforms Claude Code from a stateless assistant into a **persistent, skill-aware agent** that remembers your preferences, enforces your coding standards, and adapts to your workflow — across sessions.

```
You ──► Claude Code ──► UltraThink hooks fire ──► Skills matched, memories recalled
                                                  ──► Context injected into Claude
                                                  ──► Better, personalized responses
```

## Why?

Claude Code is powerful but stateless. Every session starts fresh. UltraThink fixes that:

- **Memory** — Claude remembers your architectural decisions, patterns, and preferences across sessions
- **Skills** — 125+ domain skills auto-activate based on intent detection (build, debug, deploy, design...)
- **Skill Chaining** — Skills link via graph edges. When `react` fires, it pulls in `nextjs`, `tailwindcss`, and `testing-library` automatically
- **Privacy** — Hooks block access to `.env`, `.pem`, credentials before Claude sees them
- **Observability** — Dashboard shows memory usage, skill activations, hook events, and token costs
- **Quality Gates** — Auto-format on edit, JSON validation, shell syntax checking

## Key Differentiators

| Feature | How it works |
|---------|-------------|
| **Skill Auto-Activate** | Every prompt scored against the full skill registry (&lt;30ms). Top 5 skills injected as context. No manual `/skill` invocations. |
| **Skill Chaining** | `linksTo`/`linkedFrom` graph edges. One skill triggers, related skills follow via 1-hop traversal. |
| **Full Skill Library** | 125+ skills across 4 layers — from orchestrators (`gsd`, `plan`) to domain specialists (`stripe`, `drizzle`). |
| **Open for Contribution** | Clean format (single `SKILL.md`), registry-based graph, documented hook lifecycle. Adding a skill takes 5 minutes. |
| **Persistent Memory** | Postgres-backed 3-tier search (tsvector + trigram + ILIKE). Memories scoped by project, ranked by importance. |
| **Quality of Life** | Statusline, desktop notifications, stuck-agent detection, auto-formatting, context warnings. |

## Quick Links

- [Quickstart](/getting-started/quickstart) — Install and run in 5 minutes
- [Architecture](/architecture/overview) — How the system fits together
- [Skill Mesh](/features/skill-mesh) — The 4-layer auto-trigger engine
- [Memory System](/features/memory) — Persistent cross-session memory
- [Create a Skill](/guides/create-skill) — Add your own skill in 5 minutes
- [Contributing](/contributing/overview) — Help build UltraThink
