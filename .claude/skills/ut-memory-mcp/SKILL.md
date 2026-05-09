---
name: ut-memory-mcp
description: MCP tools for UltraThink memory — save, search, recall, link, Tekiō
layer: utility
triggers:
  - remember this
  - save memory
  - search memory
  - recall brain
  - memory recall
  - tekio status
  - wheel stats
  - link memories
  - what do you remember
linksTo:
  - ut-recall
  - ut-remember
linkedFrom:
  - cook
  - plan
  - debug
  - gsd
---

# UltraThink Memory MCP

First-class MCP tools for the Second Brain. Use these instead of bash scripts.

## Tools

### `mcp__memory__memory_save`
Save a memory. **Title is required** — no anonymous memories.

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| title | string(5-80) | yes | Short descriptive title |
| content | string(20-4000) | yes | What to remember |
| category | enum | yes | Determines wing/hall placement |
| tags | string[] | no | Search enrichment tags |
| importance | 1-10 | no | Default 5. 10=identity, 7=decision, 5=useful |
| confidence | 0-1 | no | Default 0.8 |
| wing | enum | no | Override auto-inferred wing |
| hall | string | no | Override auto-inferred hall |
| scope | string | no | Project scope |

**Categories → Wings:**
- `identity, preference, style-preference, tool-preference, workflow-pattern` → **user/**
- `decision, solution, architecture, pattern, insight, project-context` → **knowledge/**
- `session-summary, correction-log, learning` → **experience/**

### `mcp__memory__memory_search`
Hybrid semantic search (tsvector + trigram + ILIKE).

| Param | Type | Required |
|-------|------|----------|
| query | string | yes |
| scope | string | no |
| limit | 1-30 | no (default 10) |
| min_importance | 1-10 | no (default 1) |

### `mcp__memory__memory_recall`
4-layer brain recall. Use at session start or when context is needed.

| Param | Type | Default |
|-------|------|---------|
| scope | string | none |
| compact | boolean | false |
| aaak | boolean | false |
| max_tokens | number | 900 |

### `mcp__memory__memory_link`
Zettelkasten relation between two memories.

| Param | Type | Required |
|-------|------|----------|
| source_id | UUID | yes |
| target_id | UUID | yes |
| relation | enum | yes |
| strength | 0-1 | no (default 0.5) |

**Relations:** `learned-from | contradicts | supports | applies-to | caused-by | supersedes | related_to`

### `mcp__memory__tekio_status`
Wheel stats — no params.

### `mcp__memory__tekio_turn`
Manual wheel turn from a failure.

| Param | Type | Required |
|-------|------|----------|
| error | string(10+) | yes |
| context | string | yes |
| tool | string | no |

## When to Use

- **User says "remember this"** → `memory_save` with explicit title
- **Need to find something** → `memory_search`
- **Session start / need context** → `memory_recall`
- **Tool failure worth learning** → `tekio_turn`
- **Check adaptations** → `tekio_status`
- **Connect related knowledge** → `memory_link`
