---
name: database-indexing
description: Database indexing strategies — B-tree, GIN, GiST, hash, BRIN index types, EXPLAIN ANALYZE interpretation, query plan optimization, partial and composite indexes, index maintenance for PostgreSQL
layer: domain
category: database
triggers:
  - "database index"
  - "indexing"
  - "explain analyze"
  - "query plan"
  - "slow query"
  - "index optimization"
  - "missing index"
  - "sequential scan"
inputs:
  - Slow query or EXPLAIN ANALYZE output
  - Table schema and row counts
  - Query patterns (read/write ratio, common WHERE clauses)
  - Current indexes
outputs:
  - Index recommendations with CREATE INDEX statements
  - EXPLAIN ANALYZE interpretation
  - Index maintenance plan
  - Query rewrite suggestions
  - Before/after performance comparison
linksTo: [postgresql, performance-profiler, monitoring]
linkedFrom: [optimize, debug, code-review]
preferredNextSkills: [postgresql, performance-profiler]
fallbackSkills: [optimize]
riskLevel: medium
memoryReadPolicy: selective
memoryWritePolicy: selective
sideEffects: [creates database indexes, may lock tables during creation, increases storage]
---

# Database Indexing Specialist

## Purpose

Indexes are the single most impactful tool for query performance. A missing index turns a 2ms query into a 20-second table scan. A redundant index wastes storage and slows writes. This skill covers index types, reading query plans, designing optimal indexes, and maintaining index health — focused on PostgreSQL but with principles applicable to any RDBMS.

## Key Concepts

### Index Types and When to Use Them

| Index Type | Best For | Example |
|-----------|----------|---------|
| **B-tree** (default) | Equality, range, sorting, LIKE 'prefix%' | `WHERE created_at > '2024-01-01'` |
| **Hash** | Equality only (faster than B-tree for =) | `WHERE id = 'abc123'` |
| **GIN** | Arrays, JSONB, full-text search, trgm | `WHERE tags @> '{postgres}'` |
| **GiST** | Geometry, ranges, nearest-neighbor, trgm | `WHERE location <-> point(x,y) < 1000` |
| **BRIN** | Large tables with naturally ordered data | `WHERE created_at BETWEEN ...` on append-only tables |
| **SP-GiST** | Non-balanced tree structures, phone numbers, IP ranges | `WHERE ip << '192.168.0.0/16'` |

### Anatomy of a Query Plan

```
EXPLAIN ANALYZE SELECT * FROM orders WHERE user_id = 42 AND status = 'shipped';

                                          QUERY PLAN
---------------------------------------------------------------------------------------------
 Index Scan using idx_orders_user_status on orders  (cost=0.43..8.45 rows=1 width=120)
   Index Cond: ((user_id = 42) AND (status = 'shipped'))
   Buffers: shared hit=4
 Planning Time: 0.152 ms
 Execution Time: 0.065 ms
```

**Key fields to read:**

| Field | Meaning |
|-------|---------|
| `Seq Scan` | Full table scan — usually bad on large tables |
| `Index Scan` | Uses index, then fetches rows from table |
| `Index Only Scan` | Answered entirely from index (best case) |
| `Bitmap Index Scan` | Builds bitmap from index, then scans table |
| `cost=X..Y` | Startup cost..total cost (arbitrary units) |
| `rows=N` | Estimated rows returned |
| `actual time=X..Y` | Real milliseconds (only with ANALYZE) |
| `Buffers: shared hit=N` | Pages read from cache (good) vs `read=N` from disk (slow) |
| `loops=N` | How many times this node executed |

## Workflow

### Step 1: Identify Slow Queries

```sql
-- Find slowest queries (requires pg_stat_statements extension)
SELECT
  substring(query, 1, 100) AS short_query,
  calls,
  round(total_exec_time::numeric, 2) AS total_ms,
  round(mean_exec_time::numeric, 2) AS avg_ms,
  round((100 * total_exec_time / sum(total_exec_time) OVER ())::numeric, 2) AS pct,
  rows
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 20;
```

```sql
-- Find tables with excessive sequential scans
SELECT
  schemaname,
  relname AS table_name,
  seq_scan,
  seq_tup_read,
  idx_scan,
  CASE WHEN seq_scan > 0
    THEN round(seq_tup_read::numeric / seq_scan, 0)
    ELSE 0
  END AS avg_rows_per_seq_scan
FROM pg_stat_user_tables
WHERE seq_scan > 100
ORDER BY seq_tup_read DESC
LIMIT 20;
```

### Step 2: Analyze the Query Plan

```sql
-- Always use ANALYZE + BUFFERS for real execution data
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT o.id, o.total, u.name
FROM orders o
JOIN users u ON u.id = o.user_id
WHERE o.status = 'pending'
  AND o.created_at > now() - interval '7 days'
ORDER BY o.created_at DESC
LIMIT 20;
```

**Red flags in query plans:**

| Red Flag | Meaning | Action |
|----------|---------|--------|
| `Seq Scan` on large table | No usable index | Add an index on the filtered/joined column |
| `rows=1` but `actual rows=50000` | Bad row estimate | Run `ANALYZE tablename` to update statistics |
| `Sort` with `Sort Method: external merge` | Sort spills to disk | Add index matching ORDER BY, or increase `work_mem` |
| `Nested Loop` with high `loops=` | N+1 join pattern | Ensure inner table has index on join column |
| `Bitmap Heap Scan` with `Recheck Cond` | Lossy bitmap | Acceptable, but check if a direct Index Scan is possible |
| `Filter: (rows removed=N)` | Index fetches too many rows, then filters | Make the index more selective (composite/partial) |

### Step 3: Design the Right Index

#### Single-Column Index

```sql
-- Basic B-tree index for equality and range queries
CREATE INDEX idx_orders_user_id ON orders (user_id);

-- With sorting support
CREATE INDEX idx_orders_created_at ON orders (created_at DESC);
```

#### Composite Index (Multi-Column)

```sql
-- Column order matters! Put equality columns first, then range/sort columns
-- For: WHERE user_id = ? AND status = ? ORDER BY created_at DESC
CREATE INDEX idx_orders_user_status_created
  ON orders (user_id, status, created_at DESC);
```

**The Equality-Sort-Range (ESR) rule:**

```
Composite index column order:
  1. Equality columns first   (WHERE x = ?)
  2. Sort columns next        (ORDER BY y)
  3. Range columns last       (WHERE z > ?)

Example query:
  WHERE user_id = 42 AND created_at > '2024-01-01' ORDER BY priority DESC

Optimal index:
  CREATE INDEX ON orders (user_id, priority DESC, created_at);
  -- user_id (equality) -> priority (sort) -> created_at (range)
```

#### Partial Index

```sql
-- Index only rows that match a condition — smaller, faster
CREATE INDEX idx_orders_pending
  ON orders (created_at DESC)
  WHERE status = 'pending';

-- Only 5% of orders are 'pending', so this index is 20x smaller
-- Matches: SELECT * FROM orders WHERE status = 'pending' ORDER BY created_at DESC
```

#### Covering Index (Index-Only Scans)

```sql
-- INCLUDE columns that are selected but not filtered/sorted
-- Enables Index Only Scan — no table lookup needed
CREATE INDEX idx_orders_user_covering
  ON orders (user_id)
  INCLUDE (status, total, created_at);

-- This query can be answered entirely from the index:
-- SELECT status, total, created_at FROM orders WHERE user_id = 42
```

#### GIN Index for JSONB

```sql
-- Index JSONB columns for containment queries
CREATE INDEX idx_products_metadata ON products USING GIN (metadata);

-- Supports:
-- WHERE metadata @> '{"color": "red"}'
-- WHERE metadata ? 'color'
-- WHERE metadata ?& array['color', 'size']

-- For specific key paths (more efficient than full GIN):
CREATE INDEX idx_products_metadata_color
  ON products USING BTREE ((metadata->>'color'));

-- WHERE metadata->>'color' = 'red'
```

#### GIN Index for Full-Text Search

```sql
-- Add a tsvector column or use expression index
CREATE INDEX idx_articles_search
  ON articles USING GIN (to_tsvector('english', title || ' ' || body));

-- Query:
SELECT * FROM articles
WHERE to_tsvector('english', title || ' ' || body) @@ to_tsquery('english', 'postgres & indexing');
```

#### GIN Trigram Index for LIKE/ILIKE

```sql
-- Enable extension
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Trigram index supports LIKE '%substring%' (not just prefix)
CREATE INDEX idx_users_name_trgm ON users USING GIN (name gin_trgm_ops);

-- Now this is fast even without prefix:
SELECT * FROM users WHERE name ILIKE '%garcia%';

-- Also enables similarity search:
SELECT * FROM users WHERE name % 'Garcia' ORDER BY similarity(name, 'Garcia') DESC;
```

#### BRIN Index for Time-Series Data

```sql
-- BRIN is tiny — stores min/max per block range
-- Perfect for append-only tables where column values correlate with physical order
CREATE INDEX idx_events_created_brin
  ON events USING BRIN (created_at)
  WITH (pages_per_range = 32);

-- Size comparison on 100M rows:
-- B-tree: ~2.1 GB
-- BRIN:   ~0.5 MB (4000x smaller)

-- Trade-off: BRIN is less precise, may scan extra blocks
```

### Step 4: Validate the Improvement

```sql
-- Before: check current plan
EXPLAIN (ANALYZE, BUFFERS) SELECT ...;

-- Create index concurrently (no table lock in production!)
CREATE INDEX CONCURRENTLY idx_orders_user_status
  ON orders (user_id, status);

-- After: verify index is used
EXPLAIN (ANALYZE, BUFFERS) SELECT ...;

-- Compare execution time, buffer hits, and scan type
```

### Step 5: Ongoing Index Maintenance

```sql
-- Find unused indexes (wasting space and slowing writes)
SELECT
  schemaname,
  relname AS table_name,
  indexrelname AS index_name,
  idx_scan AS times_used,
  pg_size_pretty(pg_relation_size(indexrelid)) AS index_size
FROM pg_stat_user_indexes
WHERE idx_scan = 0
  AND indexrelname NOT LIKE '%_pkey'
  AND indexrelname NOT LIKE '%_unique'
ORDER BY pg_relation_size(indexrelid) DESC;

-- Find duplicate/overlapping indexes
SELECT
  a.indexrelid::regclass AS index_a,
  b.indexrelid::regclass AS index_b,
  pg_size_pretty(pg_relation_size(a.indexrelid)) AS size_a,
  pg_size_pretty(pg_relation_size(b.indexrelid)) AS size_b
FROM pg_index a
JOIN pg_index b ON a.indrelid = b.indrelid
  AND a.indexrelid < b.indexrelid
  AND a.indkey::text = left(b.indkey::text, length(a.indkey::text))
WHERE a.indrelid::regclass::text NOT LIKE 'pg_%';

-- Check index bloat
SELECT
  tablename,
  indexname,
  pg_size_pretty(pg_relation_size(indexname::regclass)) AS index_size,
  idx_scan,
  idx_tup_read
FROM pg_stat_user_indexes
JOIN pg_indexes USING (indexname)
ORDER BY pg_relation_size(indexname::regclass) DESC
LIMIT 20;

-- Rebuild bloated indexes (online, no lock)
REINDEX INDEX CONCURRENTLY idx_orders_user_status;
```

## Best Practices

- Always use `CREATE INDEX CONCURRENTLY` in production to avoid table locks
- Follow the ESR rule for composite indexes: Equality, Sort, Range
- Use `INCLUDE` columns to enable Index Only Scans for frequent queries
- Use partial indexes when queries filter on a low-cardinality condition (e.g., `WHERE status = 'active'`)
- Run `ANALYZE` after bulk inserts so the planner has accurate statistics
- Audit unused indexes quarterly — each unused index slows every INSERT/UPDATE/DELETE
- Use `EXPLAIN (ANALYZE, BUFFERS)` not just `EXPLAIN` — estimated vs actual can differ wildly
- For JSONB queries, use expression indexes on specific paths over full GIN when possible
- Set `random_page_cost = 1.1` on SSDs (default 4.0 assumes spinning disk)

## Common Pitfalls

| Pitfall | Fix |
|---------|-----|
| Creating index without `CONCURRENTLY` in production | Always use `CONCURRENTLY` — standard `CREATE INDEX` locks the table for writes |
| Wrong column order in composite index | Put equality columns first, then sort, then range (ESR rule) |
| Indexing low-cardinality columns alone (e.g., boolean) | Use a partial index or composite index instead — B-tree on booleans is nearly useless |
| Planner ignores the index | Run `ANALYZE`; check `enable_seqscan`; verify query matches index columns; check for type mismatches or function calls on indexed columns |
| Too many indexes on write-heavy tables | Each index adds overhead to INSERT/UPDATE/DELETE — audit and remove unused ones |
| Using `!=` or `NOT IN` expecting index use | B-tree indexes do not accelerate negative conditions — restructure the query |
| Indexing expression but querying raw column | `CREATE INDEX ON t (lower(name))` only works for `WHERE lower(name) = ...`, not `WHERE name = ...` |
| BRIN on randomly ordered data | BRIN needs physical correlation — use on append-only or time-ordered tables only |

## Examples

### Real-World Index Design Session

```sql
-- The slow query (1.2 seconds on 5M rows):
SELECT id, title, status, created_at
FROM orders
WHERE user_id = 1234
  AND status IN ('pending', 'processing')
  AND created_at > now() - interval '30 days'
ORDER BY created_at DESC
LIMIT 10;

-- EXPLAIN ANALYZE shows:
-- Seq Scan on orders (actual time=1200ms, rows=15, loops=1)
--   Filter: ((user_id = 1234) AND (status = ANY('{pending,processing}')) AND ...)
--   Rows Removed by Filter: 4999985

-- Solution: composite index + covering columns
CREATE INDEX CONCURRENTLY idx_orders_user_status_created
  ON orders (user_id, status, created_at DESC)
  INCLUDE (id, title);

-- After: Index Only Scan (actual time=0.05ms, rows=15, loops=1)
-- 24,000x faster
```

### Monitoring Index Health with pg_stat_statements

```sql
-- Top queries by total time that could benefit from indexes
SELECT
  substring(query, 1, 80) AS query,
  calls,
  round(mean_exec_time::numeric, 2) AS avg_ms,
  round(total_exec_time::numeric / 1000, 2) AS total_seconds
FROM pg_stat_statements
WHERE query NOT LIKE '%pg_stat%'
  AND mean_exec_time > 100  -- slower than 100ms average
ORDER BY total_exec_time DESC
LIMIT 10;
```

### Drizzle ORM Index Definitions

```typescript
import { index, pgTable, text, timestamp, uuid, integer } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const orders = pgTable('orders', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull(),
  status: text('status').notNull().default('pending'),
  total: integer('total').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  index('idx_orders_user_status_created')
    .on(table.userId, table.status, table.createdAt.desc()),
  index('idx_orders_status_partial')
    .on(table.createdAt)
    .where(sql`status = 'pending'`),
]);
```
