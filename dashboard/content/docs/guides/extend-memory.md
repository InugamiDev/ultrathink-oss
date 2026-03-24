# Extend Memory

UltraThink's memory system is designed for extensibility. Add new categories, custom tags, new database tables, and custom query functions without modifying the core.

## Adding New Memory Categories

Categories are free-form strings -- just use a new one:

```typescript
const memory = await createMemory({
  content: "API rate limiting should use token bucket algorithm",
  category: "best-practice",  // New custom category
  importance: 7,
  confidence: 0.9,
  scope: "api/rate-limiting",
  tags: ["#api", "#performance", "#verified"],
});
```

Then document it in `.claude/references/memory.md` and update the dashboard if it has category-specific UI.

## Creating Custom Tags

Tags are free-form strings in the `memory_tags` table:

```typescript
await addMemoryTags(memoryId, [
  "#rate-limiting",
  "#token-bucket",
  "#api-gateway",
]);
```

All tags use `#` prefix by convention. Query by tags:

```typescript
const memories = await searchMemories({
  tags: ["#rate-limiting", "#verified"],
  minImportance: 5,
});
```

## Extending the Schema

### Step 1: Create a migration

```bash
touch memory/migrations/006_custom_tables.sql
```

### Step 2: Write the SQL

```sql
-- 006_custom_tables.sql
CREATE TABLE IF NOT EXISTS code_snippets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(500) NOT NULL,
  language VARCHAR(50) NOT NULL,
  code TEXT NOT NULL,
  description TEXT,
  category VARCHAR(100),
  memory_id UUID REFERENCES memories(id) ON DELETE SET NULL,
  session_id UUID REFERENCES sessions(id) ON DELETE SET NULL,
  tags TEXT[],
  usage_count INT DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_code_snippets_language ON code_snippets(language);
CREATE INDEX idx_code_snippets_category ON code_snippets(category);
```

### Step 3: Run the migration

```bash
npm run migrate
```

### Step 4: Create a TypeScript service

```typescript
// memory/src/snippets.ts
import { getClient } from "./client.js";

export interface CodeSnippet {
  id: string;
  title: string;
  language: string;
  code: string;
  description?: string;
  category?: string;
  tags?: string[];
  usage_count: number;
  created_at: string;
}

export async function createSnippet(input: {
  title: string;
  language: string;
  code: string;
  description?: string;
  tags?: string[];
}): Promise<CodeSnippet> {
  const sql = getClient();
  const rows = await sql`
    INSERT INTO code_snippets (title, language, code, description, tags)
    VALUES (${input.title}, ${input.language}, ${input.code},
            ${input.description ?? null}, ${input.tags ?? null})
    RETURNING *
  `;
  return rows[0] as CodeSnippet;
}

export async function searchSnippets(opts: {
  language?: string;
  query?: string;
  limit?: number;
}): Promise<CodeSnippet[]> {
  const sql = getClient();
  const limit = opts.limit ?? 20;

  if (opts.query) {
    return (await sql`
      SELECT * FROM code_snippets
      WHERE (${opts.language ?? null}::text IS NULL OR language = ${opts.language ?? null})
        AND (title ILIKE ${"%" + opts.query + "%"} OR code ILIKE ${"%" + opts.query + "%"})
      ORDER BY usage_count DESC, created_at DESC
      LIMIT ${limit}
    `) as CodeSnippet[];
  }

  return (await sql`
    SELECT * FROM code_snippets
    WHERE (${opts.language ?? null}::text IS NULL OR language = ${opts.language ?? null})
    ORDER BY usage_count DESC, created_at DESC
    LIMIT ${limit}
  `) as CodeSnippet[];
}
```

## Writing Custom Queries

Extend `memory/src/memory.ts`:

```typescript
// Get memories matching ALL specified tags
export async function getMemoriesByAllTags(tags: string[]): Promise<Memory[]> {
  const sql = getClient();
  return (await sql`
    SELECT m.*, array_agg(mt.tag) FILTER (WHERE mt.tag IS NOT NULL) as tags
    FROM memories m
    JOIN memory_tags mt ON m.id = mt.memory_id
    WHERE m.is_archived = false AND mt.tag = ANY(${tags})
    GROUP BY m.id
    HAVING COUNT(DISTINCT mt.tag) = ${tags.length}
    ORDER BY m.importance DESC, m.created_at DESC
  `) as Memory[];
}

// Get stale memories not accessed in N days
export async function getStaleMemories(daysOld: number = 30): Promise<Memory[]> {
  const sql = getClient();
  return (await sql`
    SELECT * FROM memories
    WHERE is_archived = false
      AND accessed_at < NOW() - INTERVAL '1 day' * ${daysOld}
    ORDER BY accessed_at ASC
    LIMIT 50
  `) as Memory[];
}
```

## Adding Memory Relations

```typescript
await createRelation(newDecisionId, oldDecisionId, "supersedes");
await createRelation(patternA, patternB, "related");
```

**Relation types**: `supersedes`, `contradicts`, `extends`, `supports`, `related`

## Adding an API Route

```typescript
// dashboard/app/api/snippets/route.ts
import { NextResponse } from "next/server";
import { searchSnippets, createSnippet } from "@/../../memory/src/snippets";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const snippets = await searchSnippets({
    language: searchParams.get("language") || undefined,
    query: searchParams.get("q") || undefined,
  });
  return NextResponse.json(snippets);
}
```
