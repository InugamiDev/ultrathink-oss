---
name: database-optimization
description: Database query optimization — EXPLAIN ANALYZE, query plans, index hints, materialized views, partitioning
layer: domain
category: database
triggers:
  - "query optimization"
  - "explain analyze"
  - "slow query"
  - "materialized view"
  - "partitioning"
  - "query plan"
  - "table partition"
inputs:
  - "Slow queries or query plan output"
  - "Table schemas needing optimization"
  - "High-traffic query patterns"
  - "Partitioning strategy requirements"
outputs:
  - "Optimized queries with improved plans"
  - "Materialized view definitions"
  - "Partitioning strategies"
  - "Index recommendations based on query patterns"
linksTo:
  - postgresql
  - database-indexing
  - database-transactions
linkedFrom:
  - optimize
  - postgresql
preferredNextSkills:
  - database-indexing
  - postgresql
fallbackSkills:
  - prisma
riskLevel: low
memoryReadPolicy: selective
memoryWritePolicy: none
sideEffects: []
---

# Database Query Optimization

## Purpose

Provide expert guidance on diagnosing and resolving database performance issues through query plan analysis, strategic indexing, materialized views, and table partitioning. Focused on PostgreSQL but principles apply broadly to relational databases.

## Key Patterns

### Reading EXPLAIN ANALYZE Output

Always use `EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)` for real execution statistics, not just estimates.

```sql
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT u.name, COUNT(o.id) AS order_count
FROM users u
JOIN orders o ON o.user_id = u.id
WHERE u.created_at > '2025-01-01'
GROUP BY u.id, u.name
ORDER BY order_count DESC
LIMIT 20;
```

**What to look for in the output:**

| Signal | Meaning | Action |
|--------|---------|--------|
| `Seq Scan` on large table | Missing index | Add index on filter/join columns |
| `actual rows` >> `rows` (estimated) | Stale statistics | Run `ANALYZE tablename` |
| `Buffers: shared read` high | Cold cache / large scan | Add index or materialize |
| `Sort Method: external merge` | Sort spilling to disk | Increase `work_mem` or add index for ordering |
| `Hash Join` with high `Batches` | Hash spilling to disk | Increase `work_mem` |
| `Nested Loop` on large sets | O(n*m) explosion | Rewrite to use hash/merge join or add indexes |

### Query Optimization Techniques

**Avoid SELECT * -- project only needed columns:**

```sql
-- BAD: fetches all columns, may prevent index-only scans
SELECT * FROM orders WHERE status = 'pending';

-- GOOD: enables covering index (status, created_at, total)
SELECT id, created_at, total FROM orders WHERE status = 'pending';
```

**Push filters early with CTEs vs subqueries:**

```sql
-- PostgreSQL 12+ may inline CTEs, but explicit subqueries are clearer for the planner
-- BAD: CTE materializes before filtering
WITH all_orders AS (
  SELECT * FROM orders
)
SELECT * FROM all_orders WHERE status = 'pending' AND created_at > NOW() - INTERVAL '7 days';

-- GOOD: Filter directly
SELECT id, created_at, total
FROM orders
WHERE status = 'pending'
  AND created_at > NOW() - INTERVAL '7 days';
```

**Use EXISTS instead of IN for correlated checks:**

```sql
-- Slower: IN subquery may materialize full result
SELECT * FROM users u
WHERE u.id IN (SELECT user_id FROM orders WHERE total > 1000);

-- Faster: EXISTS short-circuits per row
SELECT * FROM users u
WHERE EXISTS (
  SELECT 1 FROM orders o
  WHERE o.user_id = u.id AND o.total > 1000
);
```

### Materialized Views

Use materialized views for expensive aggregations that tolerate staleness.

```sql
-- Create a materialized view for dashboard stats
CREATE MATERIALIZED VIEW mv_daily_revenue AS
SELECT
  date_trunc('day', created_at) AS day,
  COUNT(*) AS order_count,
  SUM(total) AS revenue,
  AVG(total) AS avg_order_value
FROM orders
WHERE status = 'completed'
GROUP BY date_trunc('day', created_at);

-- Add an index for fast lookups
CREATE UNIQUE INDEX idx_mv_daily_revenue_day ON mv_daily_revenue (day);

-- Refresh concurrently (requires unique index) -- no read locks
REFRESH MATERIALIZED VIEW CONCURRENTLY mv_daily_revenue;
```

**Refresh strategies:**

| Strategy | Use When |
|----------|----------|
| `REFRESH MATERIALIZED VIEW CONCURRENTLY` | Read-heavy, can tolerate minutes of staleness |
| Trigger-based refresh | Near real-time needed, low write volume |
| pg_cron scheduled refresh | Regular intervals (hourly, daily) |
| Application-level cache | Sub-second freshness needed |

### Table Partitioning

Use partitioning when tables exceed tens of millions of rows and queries filter on the partition key.

```sql
-- Range partitioning by date (most common)
CREATE TABLE events (
  id         bigint GENERATED ALWAYS AS IDENTITY,
  event_type text NOT NULL,
  payload    jsonb,
  created_at timestamptz NOT NULL DEFAULT NOW()
) PARTITION BY RANGE (created_at);

-- Create monthly partitions
CREATE TABLE events_2025_01 PARTITION OF events
  FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');
CREATE TABLE events_2025_02 PARTITION OF events
  FOR VALUES FROM ('2025-02-01') TO ('2025-03-01');
-- ... generate ahead with pg_partman or a cron script

-- List partitioning by category
CREATE TABLE logs (
  id       bigint GENERATED ALWAYS AS IDENTITY,
  level    text NOT NULL,
  message  text,
  ts       timestamptz DEFAULT NOW()
) PARTITION BY LIST (level);

CREATE TABLE logs_error PARTITION OF logs FOR VALUES IN ('error', 'fatal');
CREATE TABLE logs_info  PARTITION OF logs FOR VALUES IN ('info', 'debug');

-- Hash partitioning for even distribution
CREATE TABLE sessions (
  id      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id bigint NOT NULL,
  data    jsonb
) PARTITION BY HASH (user_id);

CREATE TABLE sessions_0 PARTITION OF sessions FOR VALUES WITH (MODULUS 4, REMAINDER 0);
CREATE TABLE sessions_1 PARTITION OF sessions FOR VALUES WITH (MODULUS 4, REMAINDER 1);
CREATE TABLE sessions_2 PARTITION OF sessions FOR VALUES WITH (MODULUS 4, REMAINDER 2);
CREATE TABLE sessions_3 PARTITION OF sessions FOR VALUES WITH (MODULUS 4, REMAINDER 3);
```

**Partition maintenance with pg_partman:**

```sql
-- Auto-create future partitions and detach old ones
CREATE EXTENSION IF NOT EXISTS pg_partman;

SELECT partman.create_parent(
  p_parent_table := 'public.events',
  p_control := 'created_at',
  p_type := 'range',
  p_interval := '1 month',
  p_premake := 3  -- create 3 months ahead
);
```

### Query Plan Anti-Patterns

**N+1 at the database level:**

```sql
-- BAD: Application sends N queries
-- SELECT * FROM users WHERE id = 1;
-- SELECT * FROM users WHERE id = 2;
-- ...

-- GOOD: Batch with ANY
SELECT * FROM users WHERE id = ANY($1::int[]);
```

**Over-indexing:**

```sql
-- BAD: Redundant indexes waste write performance and storage
CREATE INDEX idx_orders_user ON orders (user_id);
CREATE INDEX idx_orders_user_status ON orders (user_id, status);
-- The second index covers queries the first would handle

-- GOOD: Use compound index that covers multiple query patterns
CREATE INDEX idx_orders_user_status ON orders (user_id, status);
-- This serves: WHERE user_id = X AND WHERE user_id = X AND status = Y
```

## Best Practices

- **Always measure before optimizing** -- use `EXPLAIN (ANALYZE, BUFFERS)` with realistic data volumes, not empty dev databases.
- **Run `ANALYZE` after bulk data changes** to keep planner statistics accurate.
- **Prefer partial indexes** for queries that filter to a subset: `CREATE INDEX idx_pending ON orders (created_at) WHERE status = 'pending'`.
- **Use `pg_stat_statements`** to find the most time-consuming queries in production.
- **Set appropriate `work_mem`** per query for sorts and hash joins: `SET LOCAL work_mem = '256MB'` for analytics queries.
- **Partition early** if you know data will grow -- retrofitting partitioning is painful.
- **Monitor index usage** with `pg_stat_user_indexes` -- drop indexes with zero scans.

## Common Pitfalls

| Pitfall | Problem | Fix |
|---------|---------|-----|
| Optimizing on dev data | Plans differ with 100 rows vs 10M rows | Test with production-like data volumes |
| Missing `ANALYZE` after migrations | Planner uses default statistics, picks bad plans | Run `ANALYZE` on affected tables after bulk inserts/schema changes |
| Index on low-cardinality column | Full table scan is faster than index scan on boolean/enum | Use partial indexes or composite indexes instead |
| Materialized view without unique index | `REFRESH CONCURRENTLY` fails | Always create a unique index on materialized views |
| Partitioning without partition key in queries | Planner scans all partitions | Ensure WHERE clause always includes partition key |
| Too many partitions | Planning overhead increases per partition | Keep under ~1000 partitions; use larger intervals |
