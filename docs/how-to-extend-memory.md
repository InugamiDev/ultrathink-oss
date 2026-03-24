# How to Extend Memory

## Overview

UltraThink's memory system is designed for extensibility. You can add new memory categories, create custom tags, extend the database schema with new tables, and write custom query functions -- all without modifying the core memory service.

## Adding New Memory Categories

### Step 1: Define the Category

Memory categories are string values in the `category` column of the `memories` table. There is no enum constraint, so you can add new categories simply by using them.

Existing categories:
- `decision` -- Architectural decisions
- `pattern` -- Codebase patterns
- `preference` -- User preferences
- `solution` -- Bug solutions
- `architecture` -- System design insights
- `convention` -- Repository conventions
- `insight` -- General observations

### Step 2: Use the Category in Code

```typescript
import { createMemory } from "./memory/src/memory.js";

const memory = await createMemory({
  content: "API rate limiting should use token bucket algorithm for burst tolerance",
  category: "best-practice",  // New custom category
  importance: 7,
  confidence: 0.9,
  scope: "api/rate-limiting",
  tags: ["#api", "#performance", "#verified"],
});
```

### Step 3: Document the Category

Add the category to `.claude/references/memory.md` so all agents know when to use it:

```markdown
### `best-practice`
- Store confirmed best practices for specific domains
- Importance range: 5-8
- Confidence should be 0.7+ (only store verified practices)
```

### Step 4: Update the Dashboard

If the dashboard has category-specific UI (filters, color coding), update the relevant components to recognize the new category.

## Creating Custom Tags

Tags are free-form strings stored in the `memory_tags` table. Create any tag by using it:

```typescript
import { addMemoryTags } from "./memory/src/memory.js";

await addMemoryTags(memoryId, [
  "#rate-limiting",
  "#token-bucket",
  "#api-gateway",
  "#high-traffic",
]);
```

### Tag Naming Conventions

Follow the existing conventions from `.claude/references/memory.md`:

| Prefix | Purpose | Examples |
|--------|---------|---------|
| (none) | Domain tags | `#frontend`, `#backend`, `#database` |
| (none) | Category tags | `#architecture`, `#pattern`, `#bugfix` |
| (none) | Technology tags | `#react`, `#nextjs`, `#postgresql` |
| (none) | Status tags | `#verified`, `#unverified`, `#deprecated` |
| (none) | Project/feature tags | `#auth-system`, `#payment-flow` |

All tags use the `#` prefix by convention for easy visual identification.

### Querying by Tags

The current `searchMemories` function supports tag-based filtering:

```typescript
import { searchMemories } from "./memory/src/memory.js";

// Search with tags
const memories = await searchMemories({
  tags: ["#rate-limiting", "#verified"],
  minImportance: 5,
});
```

For more complex tag queries, you can extend the search function or write custom queries (see below).

## Extending the Schema

### Step 1: Create a Migration

Create a new migration file in `memory/migrations/`:

```bash
touch memory/migrations/006_custom_tables.sql
```

### Step 2: Write the Migration SQL

```sql
-- 006_custom_tables.sql
-- Custom: Code snippets library

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

### Step 3: Run the Migration

```bash
npm run migrate
```

### Step 4: Create a TypeScript Service

Create a new service file for your custom table:

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
  memory_id?: string;
  session_id?: string;
  tags?: string[];
  usage_count: number;
  created_at: string;
  updated_at: string;
}

export async function createSnippet(input: {
  title: string;
  language: string;
  code: string;
  description?: string;
  category?: string;
  memory_id?: string;
  tags?: string[];
}): Promise<CodeSnippet> {
  const sql = getClient();
  const rows = await sql`
    INSERT INTO code_snippets (title, language, code, description, category, memory_id, tags)
    VALUES (
      ${input.title},
      ${input.language},
      ${input.code},
      ${input.description ?? null},
      ${input.category ?? null},
      ${input.memory_id ?? null},
      ${input.tags ?? null}
    )
    RETURNING *
  `;
  return rows[0] as CodeSnippet;
}

export async function searchSnippets(opts: {
  language?: string;
  category?: string;
  query?: string;
  limit?: number;
}): Promise<CodeSnippet[]> {
  const sql = getClient();
  const limit = opts.limit ?? 20;

  if (opts.query) {
    return (await sql`
      SELECT * FROM code_snippets
      WHERE (${opts.language ?? null}::text IS NULL OR language = ${opts.language ?? null})
        AND (${opts.category ?? null}::text IS NULL OR category = ${opts.category ?? null})
        AND (title ILIKE ${"%" + opts.query + "%"} OR code ILIKE ${"%" + opts.query + "%"})
      ORDER BY usage_count DESC, created_at DESC
      LIMIT ${limit}
    `) as CodeSnippet[];
  }

  return (await sql`
    SELECT * FROM code_snippets
    WHERE (${opts.language ?? null}::text IS NULL OR language = ${opts.language ?? null})
      AND (${opts.category ?? null}::text IS NULL OR category = ${opts.category ?? null})
    ORDER BY usage_count DESC, created_at DESC
    LIMIT ${limit}
  `) as CodeSnippet[];
}

export async function incrementSnippetUsage(id: string): Promise<void> {
  const sql = getClient();
  await sql`UPDATE code_snippets SET usage_count = usage_count + 1, updated_at = NOW() WHERE id = ${id}`;
}
```

## Writing Custom Queries

### Adding to the Existing Memory Service

Extend `memory/src/memory.ts` with new query functions:

```typescript
// Get memories by multiple tags (AND logic)
export async function getMemoriesByAllTags(tags: string[]): Promise<Memory[]> {
  const sql = getClient();
  return (await sql`
    SELECT m.*, array_agg(mt.tag) FILTER (WHERE mt.tag IS NOT NULL) as tags
    FROM memories m
    JOIN memory_tags mt ON m.id = mt.memory_id
    WHERE m.is_archived = false
      AND mt.tag = ANY(${tags})
    GROUP BY m.id
    HAVING COUNT(DISTINCT mt.tag) = ${tags.length}
    ORDER BY m.importance DESC, m.created_at DESC
  `) as Memory[];
}

// Get related memories via memory_relations
export async function getRelatedMemories(
  memoryId: string,
  relationType?: string
): Promise<Memory[]> {
  const sql = getClient();
  return (await sql`
    SELECT m.*, mr.relation_type,
           array_agg(mt.tag) FILTER (WHERE mt.tag IS NOT NULL) as tags
    FROM memory_relations mr
    JOIN memories m ON m.id = mr.target_id
    LEFT JOIN memory_tags mt ON m.id = mt.memory_id
    WHERE mr.source_id = ${memoryId}
      AND (${relationType ?? null}::text IS NULL OR mr.relation_type = ${relationType ?? null})
      AND m.is_archived = false
    GROUP BY m.id, mr.relation_type
    ORDER BY m.importance DESC
  `) as Memory[];
}

// Get stale memories (not accessed in N days)
export async function getStaleMemories(daysOld: number = 30): Promise<Memory[]> {
  const sql = getClient();
  return (await sql`
    SELECT m.*, array_agg(mt.tag) FILTER (WHERE mt.tag IS NOT NULL) as tags
    FROM memories m
    LEFT JOIN memory_tags mt ON m.id = mt.memory_id
    WHERE m.is_archived = false
      AND m.accessed_at < NOW() - INTERVAL '1 day' * ${daysOld}
    GROUP BY m.id
    ORDER BY m.accessed_at ASC
    LIMIT 50
  `) as Memory[];
}

// Get memory timeline (memories created per day)
export async function getMemoryTimeline(days: number = 30): Promise<{
  date: string;
  count: number;
  categories: Record<string, number>;
}[]> {
  const sql = getClient();
  const rows = await sql`
    SELECT
      DATE(created_at) as date,
      COUNT(*) as count,
      jsonb_object_agg(category, cat_count) as categories
    FROM (
      SELECT created_at, category, COUNT(*) as cat_count
      FROM memories
      WHERE created_at > NOW() - INTERVAL '1 day' * ${days}
      GROUP BY DATE(created_at), category
    ) sub
    GROUP BY DATE(created_at)
    ORDER BY date DESC
  `;
  return rows as any[];
}
```

### Adding Memory Relations

The `memory_relations` table supports typed relationships between memories:

```typescript
import { getClient } from "./client.js";

export async function createRelation(
  sourceId: string,
  targetId: string,
  relationType: string
): Promise<void> {
  const sql = getClient();
  await sql`
    INSERT INTO memory_relations (source_id, target_id, relation_type)
    VALUES (${sourceId}, ${targetId}, ${relationType})
    ON CONFLICT DO NOTHING
  `;
}

// Example: Link a new decision to the one it supersedes
await createRelation(newDecisionId, oldDecisionId, "supersedes");

// Example: Link related patterns
await createRelation(patternA, patternB, "related");
```

**Relation types**:
- `supersedes` -- New memory replaces old one
- `contradicts` -- Memories are in conflict (needs resolution)
- `extends` -- New memory adds detail to existing one
- `supports` -- Evidence supporting another memory
- `related` -- General relationship

## Adding an API Route

If your extension needs dashboard access, add an API route:

```typescript
// dashboard/app/api/snippets/route.ts
import { NextResponse } from "next/server";
import { searchSnippets, createSnippet } from "@/../../memory/src/snippets";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const language = searchParams.get("language") || undefined;
  const query = searchParams.get("q") || undefined;

  const snippets = await searchSnippets({ language, query });
  return NextResponse.json(snippets);
}

export async function POST(request: Request) {
  const body = await request.json();
  const snippet = await createSnippet(body);
  return NextResponse.json(snippet, { status: 201 });
}
```

## Custom Compaction Logic

If your custom memories need special compaction rules, extend `memory/scripts/compact.ts`:

```typescript
// Add after the main compaction logic:

async function compactSnippets() {
  console.log("\nSnippet compaction starting...");

  // Archive snippets with zero usage older than 90 days
  const result = await sql`
    UPDATE code_snippets
    SET updated_at = NOW()
    WHERE usage_count = 0
      AND created_at < NOW() - INTERVAL '90 days'
    RETURNING id
  `;

  console.log(`Archived ${result.length} unused snippets`);
}
```

## Related Documentation

- [Memory System](./memory-system.md) -- Memory architecture and policies
- [Memory Schema](./memory-schema.md) -- Full schema reference
- [Troubleshooting](./troubleshooting.md) -- Database and migration issues
