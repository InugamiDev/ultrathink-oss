# Memory System

## Overview

UltraThink's memory system provides **persistent, structured recall** across sessions. It stores architectural decisions, bug solutions, user preferences, codebase patterns, and lessons learned in a Neon serverless Postgres database with pgvector for semantic search.

Memory is not a dump. The system enforces disciplined read-before-write policies, confidence scoring, and automatic compaction to prevent bloat while preserving high-value information.

## Architecture

```
Claude Code Session
    |
    | read/write via TypeScript API
    v
memory/src/memory.ts   (Memory service)
memory/src/plans.ts    (Plans & tasks service)
memory/src/hooks.ts    (Hook event logging)
memory/src/client.ts   (Neon connection client)
    |
    | SQL queries
    v
Neon Postgres + pg_trgm
    |
    | trigram fuzzy search
    v
similarity() + ILIKE on memories table
```

### Components

| Component | Path | Purpose |
|-----------|------|---------|
| Client | `memory/src/client.ts` | Neon serverless connection using `@neondatabase/serverless` |
| Memory Service | `memory/src/memory.ts` | CRUD operations for memories, tags, relations, search |
| Plans Service | `memory/src/plans.ts` | Plans, tasks, and journal management |
| Hooks Service | `memory/src/hooks.ts` | Hook event logging and statistics |
| Schema | `memory/schema/schema.sql` | Combined schema reference |
| Migrations | `memory/migrations/*.sql` | Incremental schema migrations |
| Compaction | `memory/scripts/compact.ts` | Memory compaction script |
| Seeding | `memory/scripts/seed.ts` | Sample data seeding |

## Memory Categories

Every memory must belong to a category. The available categories and their intended use:

| Category | Use For | Typical Importance |
|----------|---------|-------------------|
| `decision` | Architectural decisions and their rationale | 7-10 |
| `pattern` | Confirmed codebase patterns and conventions | 5-8 |
| `preference` | User/team preferences expressed across sessions | 4-7 |
| `solution` | Bug solutions that took significant effort | 6-9 |
| `architecture` | System design insights and component relationships | 7-10 |
| `convention` | Repository conventions (naming, structure, style) | 4-7 |
| `insight` | General observations and learnings | 3-6 |

## Read Policies

Memory read operations are governed by the `memoryReadPolicy` field in skill metadata:

### `always`
Read relevant memories before every major action. Used by orchestrators that need full context.

### `selective` (default)
Read memories only when the current task touches areas covered by existing memories. Check memory before major decisions, but skip for routine operations.

### `none`
Do not read memory. Used by stateless utility skills that don't benefit from prior context.

### Auto-Recall

When `memory.autoRecall` is `true` in `ck.json` (default), the system automatically queries memories matching the current project scope at session start. This provides immediate context about:
- Recent architectural decisions
- Known patterns and conventions
- Active bugs and blockers
- User preferences

## Write Policies

Memory write operations are governed by the `memoryWritePolicy` field in skill metadata:

### `always`
Write back results after every significant action. Used by orchestrators that produce reusable knowledge.

### `selective` (default)
Write only when the result has lasting value:
- Architectural decisions and rationale
- Confirmed patterns and conventions
- Bug solutions that required significant effort
- User preferences expressed across sessions
- Key file paths and project structure insights

### `none`
Do not write memory. Used by read-only skills like `scout` and `preview`.

### What NOT to Persist

The following should never be written to memory:
- Session-specific debugging state
- Temporary workarounds
- Unverified assumptions
- Information already in `CLAUDE.md` or documentation
- Secrets, credentials, or tokens
- Large code blocks (reference file paths instead)

## Memory Fields

Every memory record contains these fields:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `content` | TEXT | Yes | The information being stored |
| `category` | VARCHAR(50) | Yes | One of the categories listed above |
| `importance` | SMALLINT (1-10) | No (default: 5) | 10 = critical decision, 1 = minor observation |
| `confidence` | DECIMAL (0.00-1.00) | No (default: 0.80) | 1.0 = verified fact, 0.5 = educated guess |
| `scope` | VARCHAR(100) | No | Project or file path this applies to |
| `source` | VARCHAR(200) | No | Where this information came from |
| `session_id` | UUID | No | Session that created this memory |
| `plan_id` | UUID | No | Plan this memory is associated with |
| `file_path` | TEXT | No | Specific file this memory relates to |
| `tags` | TEXT[] | No | Tags for filtering (via `memory_tags` join table) |

## Tag Conventions

Use consistent tags for filtering and discovery:

### Category Tags
`#architecture`, `#pattern`, `#bugfix`, `#preference`

### Domain Tags
`#frontend`, `#backend`, `#database`, `#devops`

### Scope Tags
`#<project-name>`, `#<feature-name>`

### Status Tags
`#verified`, `#unverified`, `#deprecated`

## Fuzzy Search (pg_trgm)

Memory search uses PostgreSQL's `pg_trgm` extension for trigram-based fuzzy matching. No external embedding API needed — runs entirely in Postgres.

```sql
-- Fuzzy search with similarity scoring
SELECT *, similarity(content, $1) as sim
FROM memories
WHERE is_archived = false
  AND (similarity(content, $1) > 0.05 OR content ILIKE '%' || $1 || '%')
ORDER BY sim DESC, importance DESC
LIMIT 15;
```

A GIN index on `content` with `gin_trgm_ops` accelerates these queries.

### Deduplication

Before creating a memory, `findSimilar()` checks for existing memories with `similarity() > 0.6` to prevent duplicates.

### Auto-Linking

New memories are automatically linked to similar existing memories (similarity > 0.15) via `memory_relations` edges with `related_to` type.

## Compaction

When memory count exceeds the `compactionThreshold` (default: 100 per scope), the compaction process runs:

1. **Identify eligible scopes**: Find scopes with 5+ low-importance (1-3) uncompacted memories
2. **Group memories**: Collect all eligible memories per scope
3. **Build summary**: Concatenate memory contents into a summary text
4. **Create summary record**: Insert into `summaries` table with date range
5. **Archive originals**: Mark source memories as `is_compacted = true` and `is_archived = true`

### Running Compaction

```bash
npm run compact
# Or directly:
cd memory && npx tsx scripts/compact.ts
```

### Compaction Rules

- Only memories with `importance <= 3` are candidates
- Memories must have `is_archived = false` and `is_compacted = false`
- A scope needs 5+ eligible memories before compaction triggers
- Importance 8+ memories are **never** compacted
- All `decision` category memories are preserved
- Summaries are stored in the `summaries` table with source date ranges

## Memory Service API

The TypeScript memory service (`memory/src/memory.ts`) provides these functions:

### `createMemory(input: CreateMemoryInput): Promise<Memory>`

Create a new memory with optional tags.

```typescript
const memory = await createMemory({
  content: "Next.js 15 requires React 19 as peer dependency",
  category: "pattern",
  importance: 6,
  confidence: 1.0,
  scope: "nextjs/dependencies",
  tags: ["#nextjs", "#react", "#verified"],
});
```

### `getMemory(id: string): Promise<Memory | null>`

Retrieve a memory by ID. Updates `accessed_at` and increments `access_count`.

### `searchMemories(opts): Promise<Memory[]>`

Search memories with filters:

```typescript
const memories = await searchMemories({
  category: "decision",
  scope: "authentication",
  query: "JWT vs session",
  limit: 10,
  minImportance: 5,
  includeArchived: false,
});
```

### `updateMemory(id, updates): Promise<Memory | null>`

Update specific fields of a memory.

### `deleteMemory(id: string): Promise<boolean>`

Permanently delete a memory (use archiving instead when possible).

### `addMemoryTags(memoryId, tags): Promise<void>`

Add tags to an existing memory (idempotent).

### `removeMemoryTag(memoryId, tag): Promise<void>`

Remove a specific tag from a memory.

### `getMemoryStats(): Promise<MemoryStats>`

Get aggregate statistics: total count, by-category breakdown, average importance, archived count.

## Session Tracking

Sessions are tracked in the `sessions` table. Each session records:
- Start and end timestamps
- Summary of what was accomplished
- Task context
- Count of memories created and accessed

Memories and hook events link back to sessions via `session_id` foreign keys, enabling session-level auditing.

## Related Documentation

- [Memory Schema](./memory-schema.md) -- Full database schema reference
- [How to Extend Memory](./how-to-extend-memory.md) -- Adding custom categories and queries
- [Hooks and Privacy](./hooks-and-privacy.md) -- Memory save hook
- [Agents Catalog](./agents-catalog.md) -- Memory Curator agent
- [Troubleshooting](./troubleshooting.md) -- Database connection issues
