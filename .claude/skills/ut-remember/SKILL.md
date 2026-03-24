---
name: ut-remember
version: 1.0.0
layer: utility
triggers:
  - /ut-remember
  - remember this
  - save to memory
  - persist this
description: Explicitly save a memory to the UltraThink persistent brain
linksTo:
  - ut-recall
linkedFrom:
  - cook
  - plan
preferredNextSkills:
  - ut-recall
---

# ut-remember — Explicit Memory Save

## Purpose

Save a specific piece of information to the UltraThink persistent brain. This is the **manual override** for the auto-memory system — use it when you want to ensure something specific is remembered.

## Usage

```
/ut-remember <what to remember>
```

## Behavior

1. Parse the user's input to extract the memory content
2. Determine the best category: `preference`, `decision`, `pattern`, `solution`, `convention`, `architecture`, `insight`
3. Assign importance (1-10) based on how broadly useful this is
4. Write the memory JSON file to `/tmp/ultrathink-memories/`

The Stop hook will automatically flush it to the database.

## Memory File Format

Write to `/tmp/ultrathink-memories/<timestamp>-<short-slug>.json`:

```json
{
  "content": "User prefers bun over npm for all package management",
  "category": "preference",
  "importance": 8,
  "confidence": 1.0,
  "scope": "global",
  "tags": ["#preference", "#tooling"]
}
```

## Category Guide

| Category | When to Use | Example |
|----------|-------------|---------|
| `preference` | User explicitly states a preference | "Always use bun" |
| `decision` | Architectural or tech choice made | "Chose Drizzle over Prisma" |
| `pattern` | Recurring code/workflow pattern | "Uses barrel exports in /lib" |
| `solution` | Bug fix or workaround found | "Fix: pgvector needs CREATE EXTENSION" |
| `convention` | Project naming/structure convention | "Components use PascalCase" |
| `architecture` | System design choice | "Microservices with event bus" |
| `insight` | General observation | "Build takes 45s on this project" |

## Importance Guide

| Score | Meaning | Example |
|-------|---------|---------|
| 9-10 | Critical — affects every session | "User is building a SaaS product" |
| 7-8 | Important — affects many sessions | "Always use TypeScript strict mode" |
| 5-6 | Useful — affects some sessions | "Project uses Tailwind v4" |
| 3-4 | Minor — occasionally relevant | "Prefers 2-space indentation" |
| 1-2 | Trivial — rarely needed | "Tested on Chrome 120" |

## Response

After saving, confirm briefly:

> Saved to memory: "[content summary]" (category: preference, importance: 8)

Do NOT be verbose about it. One line is enough.
