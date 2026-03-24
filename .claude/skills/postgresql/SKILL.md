---
name: postgresql
description: PostgreSQL optimization, indexing strategies, CTEs, window functions, extensions (pg_trgm, PostGIS), partitioning, and production tuning
layer: domain
category: database
triggers:
  - "postgresql"
  - "postgres"
  - "pg"
  - "sql optimization"
  - "database indexing"
  - "cte"
  - "window function"
  - "database partitioning"
inputs:
  - "Schema design requirements"
  - "Query performance issues"
  - "Scaling requirements"
outputs:
  - "Optimized schema designs"
  - "Query optimization strategies"
  - "Indexing recommendations"
linksTo:
  - prisma
  - drizzle
  - supabase
  - django
  - fastapi
  - nodejs
  - golang
linkedFrom:
  - error-handling
  - monitoring
preferredNextSkills:
  - prisma
  - drizzle
  - supabase
fallbackSkills:
  - mongodb
riskLevel: low
memoryReadPolicy: selective
memoryWritePolicy: none
sideEffects: []
---

# PostgreSQL Domain Skill

## Purpose

Provide expert-level guidance on PostgreSQL schema design, indexing strategies, query optimization, CTEs, window functions, partitioning, extensions, connection management, and production tuning.

## Key Patterns

### 1. Schema Design

```sql
-- Use UUIDs for distributed-safe primary keys
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Base table pattern with audit fields
CREATE TABLE users (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email       TEXT NOT NULL,
    name        TEXT NOT NULL,
    role        TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member', 'viewer')),
    is_active   BOOLEAN NOT NULL DEFAULT true,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at  TIMESTAMPTZ, -- Soft delete

    CONSTRAINT users_email_unique UNIQUE (email),
    CONSTRAINT users_email_format CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

-- Partial index: only index active, non-deleted users
CREATE INDEX idx_users_email_active
    ON users (email)
    WHERE is_active = true AND deleted_at IS NULL;

-- Composite index for common queries
CREATE INDEX idx_users_role_created
    ON users (role, created_at DESC)
    WHERE deleted_at IS NULL;
```

### 2. Indexing Strategies

```sql
-- B-tree (default): Equality and range queries
CREATE INDEX idx_orders_user_date ON orders (user_id, created_at DESC);

-- GIN: Array, JSONB, and full-text search
CREATE INDEX idx_products_tags ON products USING GIN (tags);
CREATE INDEX idx_products_metadata ON products USING GIN (metadata jsonb_path_ops);
CREATE INDEX idx_products_search ON products USING GIN (to_tsvector('english', name || ' ' || description));

-- GiST: Geometric, range, and full-text search
CREATE INDEX idx_locations_coords ON locations USING GIST (coordinates);

-- BRIN: Large, naturally ordered tables (timestamps, sequential IDs)
CREATE INDEX idx_logs_created ON logs USING BRIN (created_at);

-- Partial index: Only index what you query
CREATE INDEX idx_orders_pending ON orders (created_at)
    WHERE status = 'pending'; -- Much smaller than full index

-- Covering index (INCLUDE): Avoid table lookups
CREATE INDEX idx_orders_user_covering ON orders (user_id)
    INCLUDE (status, total, created_at);
    -- SELECT status, total, created_at FROM orders WHERE user_id = $1
    -- Can be answered from index alone (index-only scan)

-- Expression index
CREATE INDEX idx_users_lower_email ON users (lower(email));

-- Multicolumn index ordering matters!
-- This index: (user_id, created_at DESC)
-- Supports: WHERE user_id = ? ORDER BY created_at DESC  ✓
-- Supports: WHERE user_id = ?                            ✓
-- Does NOT support: WHERE created_at > ?                  ✗ (user_id must be first)
```

### 3. CTEs and Window Functions

```sql
-- Recursive CTE: Organization hierarchy
WITH RECURSIVE org_tree AS (
    -- Base case: top-level departments
    SELECT id, name, parent_id, 0 AS depth, ARRAY[id] AS path
    FROM departments
    WHERE parent_id IS NULL

    UNION ALL

    -- Recursive case
    SELECT d.id, d.name, d.parent_id, t.depth + 1, t.path || d.id
    FROM departments d
    JOIN org_tree t ON d.parent_id = t.id
    WHERE t.depth < 10  -- Safety limit
)
SELECT * FROM org_tree ORDER BY path;

-- Window functions: Running totals, rankings, moving averages
SELECT
    date,
    revenue,
    SUM(revenue) OVER (ORDER BY date) AS running_total,
    AVG(revenue) OVER (
        ORDER BY date
        ROWS BETWEEN 6 PRECEDING AND CURRENT ROW
    ) AS moving_avg_7d,
    RANK() OVER (ORDER BY revenue DESC) AS revenue_rank,
    LAG(revenue, 1) OVER (ORDER BY date) AS previous_day,
    revenue - LAG(revenue, 1) OVER (ORDER BY date) AS day_over_day
FROM daily_revenue
WHERE date >= CURRENT_DATE - INTERVAL '30 days';

-- Deduplication with ROW_NUMBER
WITH ranked AS (
    SELECT *,
        ROW_NUMBER() OVER (
            PARTITION BY email
            ORDER BY created_at DESC
        ) AS rn
    FROM user_imports
)
DELETE FROM user_imports
WHERE id IN (SELECT id FROM ranked WHERE rn > 1);

-- Percentile calculations
SELECT
    department,
    PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY salary) AS median_salary,
    PERCENTILE_CONT(0.90) WITHIN GROUP (ORDER BY salary) AS p90_salary,
    PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY salary) AS p99_salary
FROM employees
GROUP BY department;
```

### 4. Advanced Queries

```sql
-- UPSERT (INSERT ... ON CONFLICT)
INSERT INTO page_views (page_id, date, count)
VALUES ($1, CURRENT_DATE, 1)
ON CONFLICT (page_id, date)
DO UPDATE SET count = page_views.count + 1;

-- Batch upsert with UNNEST
INSERT INTO products (id, name, price)
SELECT * FROM UNNEST($1::uuid[], $2::text[], $3::int[])
ON CONFLICT (id)
DO UPDATE SET
    name = EXCLUDED.name,
    price = EXCLUDED.price,
    updated_at = now();

-- LATERAL JOIN: For-each-row subquery
SELECT u.id, u.name, recent_orders.*
FROM users u
CROSS JOIN LATERAL (
    SELECT id, total, created_at
    FROM orders
    WHERE orders.user_id = u.id
    ORDER BY created_at DESC
    LIMIT 3
) recent_orders;

-- Full-text search with ranking
SELECT
    id, name, description,
    ts_rank(search_vector, query) AS rank
FROM products,
    to_tsquery('english', 'wireless & (headphone | earphone)') query
WHERE search_vector @@ query
ORDER BY rank DESC
LIMIT 20;

-- JSONB querying
SELECT * FROM events
WHERE metadata @> '{"type": "purchase"}'  -- Contains
  AND metadata ->> 'amount' > '100'        -- Text comparison
  AND metadata ? 'coupon_code';            -- Key exists
```

### 5. Partitioning

```sql
-- Range partitioning for time-series data
CREATE TABLE events (
    id          UUID NOT NULL DEFAULT gen_random_uuid(),
    event_type  TEXT NOT NULL,
    payload     JSONB NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
) PARTITION BY RANGE (created_at);

-- Create partitions
CREATE TABLE events_2024_q1 PARTITION OF events
    FOR VALUES FROM ('2024-01-01') TO ('2024-04-01');

CREATE TABLE events_2024_q2 PARTITION OF events
    FOR VALUES FROM ('2024-04-01') TO ('2024-07-01');

-- Auto-create future partitions with pg_partman
CREATE EXTENSION pg_partman;
SELECT partman.create_parent(
    p_parent_table := 'public.events',
    p_control := 'created_at',
    p_type := 'native',
    p_interval := '1 month',
    p_premake := 3  -- Create 3 months ahead
);
```

### 6. Performance Tuning

```sql
-- EXPLAIN ANALYZE to understand query plans
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT * FROM orders
WHERE user_id = $1 AND status = 'pending'
ORDER BY created_at DESC
LIMIT 10;

-- Key things to look for:
-- Seq Scan on large tables → Need an index
-- Nested Loop with large row counts → Consider Hash Join
-- Sort with high cost → Add index with matching ORDER BY
-- Buffers: shared hit vs read → Cache hit ratio
```

```ini
# postgresql.conf tuning for production (assuming 16GB RAM, SSD)
shared_buffers = 4GB              # 25% of RAM
effective_cache_size = 12GB       # 75% of RAM
work_mem = 64MB                   # Per-operation sort/hash memory
maintenance_work_mem = 1GB        # For VACUUM, CREATE INDEX
wal_buffers = 64MB
max_connections = 200
random_page_cost = 1.1            # SSD (default 4.0 is for HDD)
effective_io_concurrency = 200    # SSD
max_parallel_workers_per_gather = 4
max_worker_processes = 8
```

## Best Practices

1. **Always use `TIMESTAMPTZ`** not `TIMESTAMP` -- avoid timezone bugs
2. **Use `TEXT`** instead of `VARCHAR(n)` -- no performance difference, less migration pain
3. **Index foreign keys** -- PostgreSQL does not auto-index them
4. **Use partial indexes** for queries that filter on common conditions
5. **Use `EXPLAIN (ANALYZE, BUFFERS)`** to diagnose slow queries
6. **Set `statement_timeout`** to prevent runaway queries
7. **Use connection pooling** (PgBouncer) -- PostgreSQL handles ~500 connections max efficiently
8. **Run `VACUUM ANALYZE`** regularly (autovacuum should be enabled)
9. **Use `pg_stat_statements`** extension to find slow queries
10. **Prefer `bigint`** over `integer` for primary keys if you might exceed 2B rows

## Common Pitfalls

| Pitfall | Impact | Fix |
|---------|--------|-----|
| Missing indexes on foreign keys | Slow JOINs and CASCADE deletes | Index all FK columns |
| Using `SELECT *` | Fetches unnecessary data, prevents index-only scans | Select only needed columns |
| N+1 queries from ORM | Excessive round trips | Use JOINs, batch loading |
| Not using connection pooling | Connection exhaustion | PgBouncer in transaction mode |
| `LIKE '%term%'` without trigram index | Full table scan | Use `pg_trgm` extension with GIN index |
| Large transactions holding locks | Blocking other queries | Keep transactions short, use SKIP LOCKED |
| Not monitoring `pg_stat_user_tables` | Undetected table bloat | Monitor dead tuples, tune autovacuum |
