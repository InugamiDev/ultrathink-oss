# Memory System

Postgres-backed persistent memory with 3-tier search that remembers your architectural decisions, patterns, and preferences across sessions.

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

## 3-Tier Search

1. **tsvector** full-text search (best precision)
2. **pg_trgm** trigram fuzzy matching (typo-tolerant)
3. **ILIKE** substring fallback

```sql
SELECT *, similarity(content, $1) as sim
FROM memories
WHERE is_archived = false
  AND (similarity(content, $1) > 0.05 OR content ILIKE '%' || $1 || '%')
ORDER BY sim DESC, importance DESC
LIMIT 15;
```

A GIN index on `content` with `gin_trgm_ops` accelerates these queries.

## Memory Categories

| Category | Use For | Typical Importance |
|----------|---------|-------------------|
| `decision` | Architectural decisions and their rationale | 7-10 |
| `pattern` | Confirmed codebase patterns and conventions | 5-8 |
| `preference` | User/team preferences expressed across sessions | 4-7 |
| `solution` | Bug solutions that took significant effort | 6-9 |
| `architecture` | System design insights and component relationships | 7-10 |
| `convention` | Repository conventions (naming, structure, style) | 4-7 |
| `insight` | General observations and learnings | 3-6 |

## Memory Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `content` | TEXT | Yes | The information being stored |
| `category` | VARCHAR(50) | Yes | One of the categories above |
| `importance` | SMALLINT (1-10) | No (default: 5) | 10 = critical, 1 = minor |
| `confidence` | DECIMAL (0-1) | No (default: 0.80) | 1.0 = verified, 0.5 = guess |
| `scope` | VARCHAR(100) | No | Project or file path scope |
| `source` | VARCHAR(200) | No | Where this info came from |
| `tags` | TEXT[] | No | Tags for filtering |

## Read Policies

Governed by `memoryReadPolicy` in skill metadata:

- **`always`** -- Read before every major action. Used by orchestrators.
- **`selective`** (default) -- Read only when the task touches covered areas.
- **`none`** -- No memory reads. Used by stateless utilities.

### Auto-Recall

When `memory.autoRecall` is `true` in `ck.json` (default), the system queries memories matching the current project scope at session start, providing context about recent decisions, patterns, bugs, and preferences.

## Write Policies

- **`always`** -- Write after every significant action.
- **`selective`** (default) -- Write only lasting-value results: decisions, patterns, solutions, preferences.
- **`none`** -- No writes. Used by read-only skills like `scout` and `preview`.

### What NOT to persist

- Session-specific debugging state
- Temporary workarounds
- Unverified assumptions
- Information already in `CLAUDE.md` or documentation
- Secrets, credentials, or tokens
- Large code blocks (reference file paths instead)

## Deduplication and Auto-Linking

- Before creating a memory, `findSimilar()` checks for existing memories with `similarity() > 0.6` to prevent duplicates.
- New memories are automatically linked to similar existing memories (similarity > 0.15) via `memory_relations` edges.

## Compaction

When memory count exceeds the `compactionThreshold` (default: 100 per scope):

1. Find scopes with 5+ low-importance (1-3) uncompacted memories
2. Group and concatenate eligible memories into a summary
3. Insert summary into `summaries` table
4. Archive originals (`is_compacted = true`, `is_archived = true`)

**Rules**: Only `importance <= 3` are candidates. Importance 8+ are never compacted. All `decision` memories are preserved.

```bash
npm run compact
```

## CLI Commands

```bash
npx tsx memory/scripts/memory-runner.ts search "authentication pattern"
npx tsx memory/scripts/memory-runner.ts save "content" "category" importance
npx tsx memory/scripts/memory-runner.ts flush
npx tsx memory/scripts/memory-runner.ts session-start
npx tsx memory/scripts/memory-runner.ts compact
```

## Memory Service API

```typescript
// Create
const memory = await createMemory({
  content: "Next.js 15 requires React 19",
  category: "pattern",
  importance: 6,
  confidence: 1.0,
  scope: "nextjs/dependencies",
  tags: ["#nextjs", "#react", "#verified"],
});

// Search
const memories = await searchMemories({
  category: "decision",
  scope: "authentication",
  query: "JWT vs session",
  limit: 10,
  minImportance: 5,
});

// Other operations
await getMemory(id);
await updateMemory(id, updates);
await deleteMemory(id);
await addMemoryTags(memoryId, tags);
await getMemoryStats();
```

## Tag Conventions

| Type | Examples |
|------|---------|
| Domain | `#frontend`, `#backend`, `#database` |
| Category | `#architecture`, `#pattern`, `#bugfix` |
| Technology | `#react`, `#nextjs`, `#postgresql` |
| Status | `#verified`, `#unverified`, `#deprecated` |
| Project | `#auth-system`, `#payment-flow` |
