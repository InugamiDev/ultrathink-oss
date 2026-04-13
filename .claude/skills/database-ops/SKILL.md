---
name: database-ops
description: "Unified database operations toolkit — B-tree/GIN/GiST/partial/composite indexing, seeding and fixtures, transaction patterns (isolation levels, sagas, distributed), backup strategies (pg_dump, WAL, PITR), query optimization (EXPLAIN ANALYZE, materialized views), replication (read replicas, streaming, logical), migration patterns (zero-downtime, expand-contract, backfill), connection pooling, sharding, partitioning. Vendor-agnostic DB ops."
layer: utility
category: database
triggers: ["b-tree", "backfill", "backup strategy", "database backup", "database index", "database seed", "db restore", "deadlock", "expand contract", "explain analyze", "failover", "faker", "fixtures", "gin index", "indexing", "isolation level", "logical replication", "materialized view", "migration pattern", "optimistic locking", "partitioning", "pg_dump", "point in time recovery", "primary-replica", "query optimization", "query plan", "read replica", "replication", "saga pattern", "schema migration", "seed data", "seed script", "slow query", "streaming replication", "table partition", "test data", "transaction", "two phase commit", "wal archiving", "zero downtime migration"]
---

# database-ops

Unified database operations toolkit — B-tree/GIN/GiST/partial/composite indexing, seeding and fixtures, transaction patterns (isolation levels, sagas, distributed), backup strategies (pg_dump, WAL, PITR), query optimization (EXPLAIN ANALYZE, materialized views), replication (read replicas, streaming, logical), migration patterns (zero-downtime, expand-contract, backfill), connection pooling, sharding, partitioning. Vendor-agnostic DB ops.


## Absorbs

- `database-indexing`
- `database-seeding`
- `database-transactions`
- `database-backup`
- `database-optimization`
- `database-replication`
- `database-migration-patterns`
- `database-connection-pooling`
- `database-sharding`
- `database-partitioning`


---

## From `database-indexing`

> Database indexing strategies — B-tree, GIN, GiST, hash, BRIN index types, EXPLAIN ANALYZE interpretation, query plan optimization, partial and composite indexes, index maintenance for PostgreSQL

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


---

## From `database-seeding`

> Database seeding — seed scripts, faker data generation, deterministic seeds, test data patterns, and environment-specific seeding strategies

# Database Seeding Skill

## Purpose

Seed scripts populate databases with realistic data for development, testing, and staging environments. Good seeds are deterministic (reproducible), fast, respect foreign key constraints, and generate data that looks real. This skill covers seed architecture, faker patterns, and environment-specific strategies.

## Key Concepts

### Seeding Environments

| Environment | Data Volume | Realism | Determinism | Speed Priority |
|-------------|-------------|---------|-------------|----------------|
| **Development** | Small (100s) | High (realistic) | Optional | Fast |
| **Testing** | Minimal | Relevant to tests | Required | Fastest |
| **Staging** | Production-like (1000s+) | Very high | Optional | Less important |
| **Demo** | Curated | Perfect | Required | N/A |

### Seed Architecture

```
seeds/
  index.ts            # Main entry point
  config.ts           # Seed counts, deterministic seed value
  factories/          # Data generators per entity
    user.factory.ts
    post.factory.ts
    order.factory.ts
  scenarios/          # Pre-built data scenarios
    demo.ts           # Demo account with curated data
    load-test.ts      # Large volume for perf testing
    empty.ts          # Schema only, no data
  utils/
    reset.ts          # Truncate/clean database
    helpers.ts        # Shared utilities
```

## Workflow

### Step 1: Install Dependencies

```bash
npm install --save-dev @faker-js/faker
# or for Prisma:
# npx prisma db seed is built-in
```

### Step 2: Factory Pattern with Faker

```typescript
// seeds/factories/user.factory.ts
import { faker } from '@faker-js/faker';

export interface UserSeed {
  email: string;
  name: string;
  avatarUrl: string;
  role: 'admin' | 'editor' | 'viewer';
  createdAt: Date;
}

export function createUser(overrides: Partial<UserSeed> = {}): UserSeed {
  return {
    email: faker.internet.email().toLowerCase(),
    name: faker.person.fullName(),
    avatarUrl: faker.image.avatar(),
    role: faker.helpers.weightedArrayElement([
      { value: 'viewer', weight: 7 },
      { value: 'editor', weight: 2 },
      { value: 'admin', weight: 1 },
    ]),
    createdAt: faker.date.between({
      from: '2023-01-01',
      to: new Date(),
    }),
    ...overrides,
  };
}

export function createUsers(count: number, overrides: Partial<UserSeed> = {}): UserSeed[] {
  return Array.from({ length: count }, () => createUser(overrides));
}

// seeds/factories/post.factory.ts
import { faker } from '@faker-js/faker';

export interface PostSeed {
  title: string;
  slug: string;
  body: string;
  status: 'draft' | 'published' | 'archived';
  publishedAt: Date | null;
  authorId: string; // Set after user creation
}

export function createPost(overrides: Partial<PostSeed> = {}): Omit<PostSeed, 'authorId'> & { authorId?: string } {
  const title = faker.lorem.sentence({ min: 4, max: 10 });
  const status = faker.helpers.arrayElement(['draft', 'published', 'published', 'published', 'archived']);

  return {
    title,
    slug: faker.helpers.slugify(title).toLowerCase(),
    body: faker.lorem.paragraphs({ min: 3, max: 8 }, '\n\n'),
    status,
    publishedAt: status === 'published'
      ? faker.date.between({ from: '2023-06-01', to: new Date() })
      : null,
    ...overrides,
  };
}
```

### Step 3: Deterministic Seeds (Reproducible Data)

```typescript
// seeds/config.ts
import { faker } from '@faker-js/faker';

// CRITICAL: Set a fixed seed for reproducible data
// Same seed = same data every time = deterministic tests
export function initSeed(seed: number = 42) {
  faker.seed(seed);
}

// Usage
initSeed(42);
const user1 = createUser(); // Always produces the same user
const user2 = createUser(); // Always produces the same second user

// For tests that need isolation:
export function withSeed<T>(seed: number, fn: () => T): T {
  faker.seed(seed);
  const result = fn();
  faker.seed(); // Reset to random
  return result;
}
```

### Step 4: Main Seed Script (Prisma)

```typescript
// prisma/seed.ts
import { PrismaClient } from '@prisma/client';
import { faker } from '@faker-js/faker';
import { createUser, createUsers } from '../seeds/factories/user.factory';
import { createPost } from '../seeds/factories/post.factory';

const prisma = new PrismaClient();

async function main() {
  const startTime = Date.now();

  // Set deterministic seed
  faker.seed(42);

  console.log('Cleaning database...');
  await cleanDatabase();

  console.log('Seeding users...');
  const users = await seedUsers();

  console.log('Seeding posts...');
  await seedPosts(users.map(u => u.id));

  console.log('Seeding demo account...');
  await seedDemoAccount();

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`Seeding complete in ${elapsed}s`);
}

async function cleanDatabase() {
  // Truncate in reverse dependency order
  // Using raw SQL for speed (Prisma deleteMany is slow for bulk)
  await prisma.$executeRaw`TRUNCATE TABLE comments, posts, user_roles, users CASCADE`;
}

async function seedUsers() {
  // Create admin user (always same credentials for dev login)
  const admin = await prisma.user.create({
    data: {
      email: 'admin@localhost.dev',
      name: 'Admin User',
      avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=admin',
      passwordHash: await hashPassword('admin123'), // Dev only!
      emailVerifiedAt: new Date(),
    },
  });

  await prisma.userRole.create({
    data: { userId: admin.id, roleId: await getRoleId('admin') },
  });

  // Create regular users
  const userData = createUsers(50);
  const users = await prisma.user.createManyAndReturn({
    data: userData.map(u => ({
      ...u,
      passwordHash: '$2b$10$fixedhashfordevseeding', // Placeholder — dev only
      emailVerifiedAt: faker.datatype.boolean(0.8) ? faker.date.past() : null,
    })),
  });

  // Assign roles
  for (const user of users) {
    const role = faker.helpers.weightedArrayElement([
      { value: 'viewer', weight: 6 },
      { value: 'editor', weight: 3 },
      { value: 'admin', weight: 1 },
    ]);
    await prisma.userRole.create({
      data: { userId: user.id, roleId: await getRoleId(role) },
    });
  }

  return [admin, ...users];
}

async function seedPosts(userIds: string[]) {
  const posts: any[] = [];

  for (let i = 0; i < 200; i++) {
    const post = createPost();
    posts.push({
      ...post,
      authorId: faker.helpers.arrayElement(userIds),
    });
  }

  await prisma.post.createMany({ data: posts });

  // Seed comments on published posts
  const publishedPosts = await prisma.post.findMany({
    where: { status: 'published' },
    select: { id: true },
  });

  const comments: any[] = [];
  for (const post of publishedPosts) {
    const commentCount = faker.number.int({ min: 0, max: 10 });
    for (let i = 0; i < commentCount; i++) {
      comments.push({
        postId: post.id,
        authorId: faker.helpers.arrayElement(userIds),
        body: faker.lorem.paragraph(),
        createdAt: faker.date.recent({ days: 30 }),
      });
    }
  }

  await prisma.comment.createMany({ data: comments });
}

async function seedDemoAccount() {
  // Create a curated demo account with specific, good-looking data
  const demo = await prisma.user.create({
    data: {
      email: 'demo@localhost.dev',
      name: 'Jane Cooper',
      avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=demo',
      passwordHash: await hashPassword('demo123'),
      emailVerifiedAt: new Date(),
    },
  });

  // Create specific demo posts with real-looking content
  await prisma.post.createMany({
    data: [
      {
        title: 'Getting Started with Our Platform',
        slug: 'getting-started',
        body: 'Welcome to the platform! This guide walks you through...',
        status: 'published',
        publishedAt: new Date('2024-01-15'),
        authorId: demo.id,
      },
      {
        title: 'Advanced Tips and Tricks',
        slug: 'advanced-tips',
        body: 'Once you have mastered the basics, try these advanced features...',
        status: 'published',
        publishedAt: new Date('2024-02-20'),
        authorId: demo.id,
      },
      {
        title: 'Draft: Upcoming Feature Preview',
        slug: 'upcoming-features-preview',
        body: 'We are working on exciting new features...',
        status: 'draft',
        publishedAt: null,
        authorId: demo.id,
      },
    ],
  });
}

// Prisma seed entry point
main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
```

### Step 5: Configure Prisma to Run Seeds

```json
// package.json
{
  "prisma": {
    "seed": "npx tsx prisma/seed.ts"
  },
  "scripts": {
    "db:seed": "npx prisma db seed",
    "db:reset": "npx prisma migrate reset",
    "db:fresh": "npx prisma migrate reset --force && npx prisma db seed"
  }
}
```

### Step 6: Drizzle Seed Script

```typescript
// seeds/index.ts (Drizzle)
import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import { faker } from '@faker-js/faker';
import { users, posts, comments } from '../src/db/schema';

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql);

async function seed() {
  faker.seed(42);

  // Clean
  await db.delete(comments);
  await db.delete(posts);
  await db.delete(users);

  // Insert users
  const insertedUsers = await db.insert(users).values(
    createUsers(50).map(u => ({
      email: u.email,
      name: u.name,
      avatarUrl: u.avatarUrl,
      createdAt: u.createdAt,
    }))
  ).returning({ id: users.id });

  // Insert posts with random authors
  const userIds = insertedUsers.map(u => u.id);
  await db.insert(posts).values(
    Array.from({ length: 200 }, () => ({
      ...createPost(),
      authorId: faker.helpers.arrayElement(userIds),
    }))
  );

  console.log('Seeded successfully');
}

seed().catch(console.error);
```

### Step 7: Test Fixtures (Lightweight Seeds for Tests)

```typescript
// tests/fixtures.ts
import { faker } from '@faker-js/faker';
import { createUser } from '../seeds/factories/user.factory';

/**
 * Create a minimal test fixture — only what the test needs.
 * Unlike full seeds, fixtures are scoped to individual tests.
 */
export async function createTestUser(db: PrismaClient, overrides: Partial<UserSeed> = {}) {
  const data = createUser(overrides);
  return db.user.create({ data });
}

export async function createTestPostWithAuthor(db: PrismaClient) {
  const author = await createTestUser(db);
  const post = await db.post.create({
    data: {
      ...createPost(),
      authorId: author.id,
    },
  });
  return { author, post };
}

// Usage in test
describe('Post API', () => {
  beforeEach(async () => {
    faker.seed(123); // Deterministic per test
    await cleanDatabase();
  });

  it('returns published posts', async () => {
    const { post } = await createTestPostWithAuthor(prisma);
    const response = await app.get('/api/posts');
    expect(response.body.data).toHaveLength(1);
  });
});
```

## Common Pitfalls

1. **Non-deterministic seeds breaking tests** — If tests depend on seeded data, they must be deterministic. Always call `faker.seed(N)` before generating data.
2. **Foreign key order** — Seed parent tables before children. Users before posts, posts before comments. Truncate in reverse order.
3. **Using production seed scripts in tests** — Full seeds are slow. Tests should use minimal fixtures scoped to what they need.
4. **Hardcoded IDs** — Never hardcode UUIDs unless necessary for demo accounts. Let the database generate IDs and reference them via variables.
5. **Seeding passwords in plain text** — Even in dev, use hashed passwords. Store a known dev password hash as a constant to avoid hashing per-user (which is slow).
6. **Not cleaning before seeding** — Always truncate before seeding. Running seed twice should produce the same result (idempotent).
7. **Forgetting `CASCADE` on truncate** — `TRUNCATE users` fails if posts reference users. Use `TRUNCATE users CASCADE` or truncate in correct order.

## Best Practices

- **Factory + Scenario pattern**: Factories generate individual entities, scenarios compose them into meaningful datasets
- **Deterministic for tests**: Always `faker.seed(N)` in test fixtures
- **Dev login credentials**: Always create a known admin account (`admin@localhost.dev` / `admin123`) for easy dev login
- **Batch inserts**: Use `createMany` or raw `INSERT` for performance, not individual `create` calls
- **Realistic volumes**: Dev seeds should be small (fast), staging seeds should match production scale
- **Weighted distributions**: Use `faker.helpers.weightedArrayElement` for realistic role/status distributions
- **Separate demo data**: Curated, handcrafted data for demos — not random faker output


---

## From `database-transactions`

> Transaction isolation levels, distributed transactions, saga pattern, optimistic/pessimistic locking, and ACID guarantees across SQL and NoSQL databases

# Database Transactions Skill

## Purpose

Correct transaction handling is the difference between a system that works and one that silently corrupts data under load. This skill covers isolation levels, distributed transaction patterns (2PC, sagas), optimistic and pessimistic locking, and deadlock prevention. It prioritizes correctness first, then performance.

## Key Concepts

### ACID Properties

| Property | Meaning | Failure Mode Without It |
|----------|---------|------------------------|
| **Atomicity** | All or nothing | Partial writes leave inconsistent state |
| **Consistency** | DB moves from one valid state to another | Constraint violations, orphaned records |
| **Isolation** | Concurrent transactions don't interfere | Dirty reads, phantom reads, lost updates |
| **Durability** | Committed data survives crashes | Data loss on restart |

### Isolation Levels (Weakest to Strongest)

```
READ UNCOMMITTED   ──  Dirty reads possible (almost never use this)
READ COMMITTED     ──  Default in Postgres; no dirty reads
REPEATABLE READ    ──  Default in MySQL InnoDB; no non-repeatable reads
SERIALIZABLE       ──  Full isolation; transactions behave as if sequential
```

**Postgres Isolation Behavior:**

| Level | Dirty Read | Non-Repeatable Read | Phantom Read | Serialization Anomaly |
|-------|-----------|--------------------|--------------|-----------------------|
| Read Committed | No | Possible | Possible | Possible |
| Repeatable Read | No | No | No (in PG) | Possible |
| Serializable | No | No | No | No |

## Workflow

### Step 1: Determine Consistency Requirements

```
Is this a financial transaction or inventory decrement?
  -> Serializable or explicit locking

Is this a read-heavy dashboard query?
  -> Read Committed is fine

Are multiple services writing to the same resource?
  -> Distributed transaction pattern (saga)

Is this a user-facing update with low contention?
  -> Optimistic locking with version column
```

### Step 2: Implement the Appropriate Pattern

#### Basic Transaction with Proper Error Handling (Postgres + Drizzle)

```typescript
import { db } from '@/db';
import { accounts } from '@/db/schema';
import { eq, sql } from 'drizzle-orm';

async function transferFunds(
  fromId: string,
  toId: string,
  amount: number
): Promise<void> {
  await db.transaction(async (tx) => {
    // Always acquire locks in consistent order to prevent deadlocks
    const [from, to] = fromId < toId
      ? [
          await tx.select().from(accounts).where(eq(accounts.id, fromId)).for('update'),
          await tx.select().from(accounts).where(eq(accounts.id, toId)).for('update'),
        ]
      : [
          // Reverse select order but keep variable assignment correct
          ...(await (async () => {
            const t = await tx.select().from(accounts).where(eq(accounts.id, toId)).for('update');
            const f = await tx.select().from(accounts).where(eq(accounts.id, fromId)).for('update');
            return [f, t] as const;
          })()),
        ];

    if (!from[0] || !to[0]) {
      throw new Error('Account not found');
    }

    if (from[0].balance < amount) {
      throw new Error('Insufficient funds');
    }

    await tx.update(accounts)
      .set({ balance: sql`${accounts.balance} - ${amount}` })
      .where(eq(accounts.id, fromId));

    await tx.update(accounts)
      .set({ balance: sql`${accounts.balance} + ${amount}` })
      .where(eq(accounts.id, toId));
  });
}
```

#### Optimistic Locking with Version Column

```typescript
import { eq, and } from 'drizzle-orm';

// Schema includes a `version` integer column
async function updateProductPrice(
  productId: string,
  newPrice: number,
  expectedVersion: number
): Promise<boolean> {
  const result = await db.update(products)
    .set({
      price: newPrice,
      version: expectedVersion + 1,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(products.id, productId),
        eq(products.version, expectedVersion) // Only update if version matches
      )
    )
    .returning();

  if (result.length === 0) {
    // Version mismatch — another transaction modified this row
    // Caller should re-read and retry or inform the user
    return false;
  }

  return true;
}

// Retry wrapper for optimistic locking
async function withOptimisticRetry<T>(
  fn: () => Promise<T | null>,
  maxRetries = 3
): Promise<T> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const result = await fn();
    if (result !== null) return result;
    // Exponential backoff with jitter
    await new Promise((r) =>
      setTimeout(r, Math.random() * 50 * Math.pow(2, attempt))
    );
  }
  throw new Error('Optimistic locking failed after max retries');
}
```

#### Pessimistic Locking (SELECT FOR UPDATE)

```typescript
// Use when contention is HIGH and you want to block rather than retry
async function decrementInventory(
  productId: string,
  quantity: number
): Promise<void> {
  await db.transaction(async (tx) => {
    // Lock the row — other transactions will WAIT here
    const [product] = await tx
      .select()
      .from(products)
      .where(eq(products.id, productId))
      .for('update');

    if (!product) throw new Error('Product not found');
    if (product.stock < quantity) throw new Error('Insufficient stock');

    await tx.update(products)
      .set({ stock: product.stock - quantity })
      .where(eq(products.id, productId));
  });
}

// FOR UPDATE SKIP LOCKED — great for job queues
async function claimNextJob(): Promise<Job | null> {
  return db.transaction(async (tx) => {
    const [job] = await tx
      .select()
      .from(jobs)
      .where(eq(jobs.status, 'pending'))
      .orderBy(jobs.createdAt)
      .limit(1)
      .for('update', { skipLocked: true }); // Skip rows locked by other workers

    if (!job) return null;

    await tx.update(jobs)
      .set({ status: 'processing', claimedAt: new Date() })
      .where(eq(jobs.id, job.id));

    return job;
  });
}
```

#### Raw SQL Transaction with Serializable Isolation (Postgres)

```sql
BEGIN TRANSACTION ISOLATION LEVEL SERIALIZABLE;

-- Idempotent insert: create account summary or update it
INSERT INTO account_summaries (account_id, total_transactions, total_amount)
SELECT
  account_id,
  COUNT(*),
  SUM(amount)
FROM transactions
WHERE account_id = $1
  AND processed = false
GROUP BY account_id
ON CONFLICT (account_id) DO UPDATE SET
  total_transactions = account_summaries.total_transactions + EXCLUDED.total_transactions,
  total_amount = account_summaries.total_amount + EXCLUDED.total_amount;

UPDATE transactions SET processed = true WHERE account_id = $1 AND processed = false;

COMMIT;
-- On serialization failure (SQLSTATE 40001), the application MUST retry
```

### Step 3: Distributed Transactions — The Saga Pattern

When transactions span multiple services, traditional ACID is not possible. Use sagas instead.

#### Choreography-Based Saga (Event-Driven)

```typescript
// Each service listens for events and emits compensating events on failure
// Order Service
async function createOrder(orderData: OrderInput) {
  const order = await db.insert(orders).values({
    ...orderData,
    status: 'pending',
  }).returning();

  // Emit event — payment service listens
  await messageQueue.publish('order.created', {
    orderId: order[0].id,
    amount: orderData.total,
    customerId: orderData.customerId,
  });

  return order[0];
}

// Payment Service (listening to order.created)
async function handleOrderCreated(event: OrderCreatedEvent) {
  try {
    const payment = await processPayment(event.customerId, event.amount);
    await messageQueue.publish('payment.completed', {
      orderId: event.orderId,
      paymentId: payment.id,
    });
  } catch (error) {
    // Compensating action: tell order service to cancel
    await messageQueue.publish('payment.failed', {
      orderId: event.orderId,
      reason: error.message,
    });
  }
}
```

#### Orchestration-Based Saga (Central Coordinator)

```typescript
interface SagaStep<T> {
  name: string;
  execute: (context: T) => Promise<T>;
  compensate: (context: T) => Promise<void>;
}

class SagaOrchestrator<T> {
  private steps: SagaStep<T>[] = [];
  private completedSteps: SagaStep<T>[] = [];

  addStep(step: SagaStep<T>): this {
    this.steps.push(step);
    return this;
  }

  async execute(initialContext: T): Promise<T> {
    let context = initialContext;

    for (const step of this.steps) {
      try {
        context = await step.execute(context);
        this.completedSteps.push(step);
      } catch (error) {
        // Compensate in reverse order
        console.error(`Saga failed at step "${step.name}":`, error);
        await this.compensate(context);
        throw new Error(`Saga failed at "${step.name}": ${error.message}`);
      }
    }

    return context;
  }

  private async compensate(context: T): Promise<void> {
    for (const step of [...this.completedSteps].reverse()) {
      try {
        await step.compensate(context);
      } catch (compError) {
        console.error(`Compensation failed for "${step.name}":`, compError);
        // Log for manual intervention — do NOT throw
      }
    }
  }
}

// Usage
const orderSaga = new SagaOrchestrator<OrderContext>()
  .addStep({
    name: 'reserve-inventory',
    execute: async (ctx) => {
      ctx.reservationId = await inventoryService.reserve(ctx.items);
      return ctx;
    },
    compensate: async (ctx) => {
      await inventoryService.release(ctx.reservationId);
    },
  })
  .addStep({
    name: 'charge-payment',
    execute: async (ctx) => {
      ctx.paymentId = await paymentService.charge(ctx.customerId, ctx.total);
      return ctx;
    },
    compensate: async (ctx) => {
      await paymentService.refund(ctx.paymentId);
    },
  })
  .addStep({
    name: 'create-shipment',
    execute: async (ctx) => {
      ctx.shipmentId = await shippingService.create(ctx.address, ctx.items);
      return ctx;
    },
    compensate: async (ctx) => {
      await shippingService.cancel(ctx.shipmentId);
    },
  });

await orderSaga.execute({ customerId, items, total, address });
```

## Best Practices

1. **Always order lock acquisition** — Acquire locks on rows/tables in a consistent order (e.g., by ID ascending) to prevent deadlocks.
2. **Keep transactions short** — Long transactions hold locks and block other queries. Do all non-DB work (API calls, file I/O) outside the transaction.
3. **Use the weakest isolation level that is correct** — Serializable is safest but slowest. Read Committed is sufficient for most CRUD operations.
4. **Retry serialization failures** — Postgres SERIALIZABLE isolation will throw error code `40001` on conflicts. Your application must catch and retry.
5. **Prefer optimistic locking for low-contention writes** — A version column is cheaper than holding row locks when conflicts are rare.
6. **Design sagas with idempotent steps** — Compensations and retries may fire multiple times. Every step must be safe to re-run.
7. **Set statement_timeout in Postgres** — Prevent runaway transactions: `SET statement_timeout = '5s';`
8. **Monitor lock waits** — Query `pg_stat_activity` for `wait_event_type = 'Lock'` to detect contention.

## Common Pitfalls

| Pitfall | Symptom | Fix |
|---------|---------|-----|
| **Deadlock from inconsistent lock order** | `ERROR: deadlock detected` | Always lock rows in a deterministic order (e.g., sort by PK) |
| **Long-running transaction holding locks** | Other queries timeout or queue up | Move non-DB work outside the transaction; set `idle_in_transaction_session_timeout` |
| **Lost update (no locking)** | Two users edit the same row, last write wins silently | Add a `version` column and use optimistic locking |
| **Saga without idempotency** | Double-charge on retry, duplicate inventory deduction | Use idempotency keys; make every saga step re-runnable |
| **Catching errors inside transaction without re-throwing** | Transaction commits despite a failed step | Always re-throw or explicitly call `tx.rollback()` |
| **N+1 lock acquisition** | Locking rows one at a time in a loop causes serialization failures | Batch lock acquisition: `SELECT ... WHERE id IN (...) FOR UPDATE` |
| **Using SERIALIZABLE everywhere** | Massive retry overhead, throughput collapse | Reserve SERIALIZABLE for financial/inventory operations; use Read Committed elsewhere |
| **Forgetting to handle serialization retries** | App crashes on `40001` errors under load | Wrap serializable transactions in a retry loop with exponential backoff |


---

## From `database-backup`

> PostgreSQL backup strategies including pg_dump, WAL archiving, point-in-time recovery (PITR), and automated backup pipelines

# Database Backup & Recovery

## Purpose

Provide comprehensive guidance on PostgreSQL backup strategies from logical dumps to continuous archiving with point-in-time recovery. Covers self-hosted, managed (RDS, Cloud SQL), and serverless (Neon) environments with automated pipeline patterns.

## Key Patterns

### pg_dump -- Logical Backups

**Basic full backup:**

```bash
# Custom format (compressed, parallel restore capable)
pg_dump \
  --format=custom \
  --compress=zstd:6 \
  --jobs=4 \
  --file="/backups/mydb_$(date +%Y%m%d_%H%M%S).dump" \
  --verbose \
  "postgresql://user:pass@host:5432/mydb"

# Restore from custom format
pg_restore \
  --jobs=4 \
  --clean \
  --if-exists \
  --no-owner \
  --dbname="postgresql://user:pass@host:5432/mydb_restored" \
  /backups/mydb_20250310_120000.dump
```

**Schema-only and data-only backups:**

```bash
# Schema only (for version control)
pg_dump --schema-only --format=plain \
  --file="/backups/schema_$(date +%Y%m%d).sql" \
  "$DATABASE_URL"

# Data only (for seeding)
pg_dump --data-only --format=custom \
  --exclude-table='audit_logs' \
  --exclude-table='sessions' \
  --file="/backups/data_$(date +%Y%m%d).dump" \
  "$DATABASE_URL"
```

**Selective table backup:**

```bash
# Backup specific tables
pg_dump --format=custom \
  --table='public.users' \
  --table='public.orders' \
  --table='public.order_items' \
  --file="/backups/orders_$(date +%Y%m%d).dump" \
  "$DATABASE_URL"
```

### WAL Archiving -- Continuous Archiving

**postgresql.conf setup:**

```ini
# Enable WAL archiving
wal_level = replica
archive_mode = on
archive_command = 'test ! -f /archive/%f && cp %p /archive/%f'
archive_timeout = 300  # Force archive every 5 min even if WAL not full

# For S3 archiving (using wal-g)
# archive_command = 'wal-g wal-push %p'
```

**Using wal-g for cloud archiving:**

```bash
# Install wal-g
# Configure S3 backend
export WALG_S3_PREFIX=s3://my-backups/wal-archive
export AWS_REGION=us-east-1
export PGHOST=/var/run/postgresql

# Create base backup
wal-g backup-push $PGDATA

# List backups
wal-g backup-list

# Restore to latest
wal-g backup-fetch $PGDATA LATEST
```

### Point-in-Time Recovery (PITR)

**Recovery to a specific timestamp:**

```bash
# 1. Stop PostgreSQL
sudo systemctl stop postgresql

# 2. Move current data directory
mv $PGDATA ${PGDATA}.old

# 3. Restore base backup
pg_basebackup -D $PGDATA -h backup-host -U replicator
# OR with wal-g:
wal-g backup-fetch $PGDATA LATEST

# 4. Create recovery configuration
cat > $PGDATA/postgresql.auto.conf << 'EOF'
restore_command = 'cp /archive/%f %p'
recovery_target_time = '2025-03-10 14:30:00 UTC'
recovery_target_action = 'promote'
EOF

# 5. Create recovery signal file
touch $PGDATA/recovery.signal

# 6. Start PostgreSQL (will replay WAL to target time)
sudo systemctl start postgresql
```

### Automated Backup Pipeline

**Shell script with rotation:**

```bash
#!/usr/bin/env bash
set -euo pipefail

# Configuration
DB_URL="${DATABASE_URL:?DATABASE_URL not set}"
BACKUP_DIR="/backups/postgres"
RETENTION_DAYS=30
S3_BUCKET="s3://myapp-backups/postgres"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/backup_${TIMESTAMP}.dump"

# Ensure backup directory exists
mkdir -p "$BACKUP_DIR"

# Create backup
echo "[$(date)] Starting backup..."
pg_dump \
  --format=custom \
  --compress=zstd:6 \
  --jobs=4 \
  --file="$BACKUP_FILE" \
  "$DB_URL"

BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
echo "[$(date)] Backup complete: $BACKUP_FILE ($BACKUP_SIZE)"

# Upload to S3
aws s3 cp "$BACKUP_FILE" "$S3_BUCKET/$(basename $BACKUP_FILE)" \
  --storage-class STANDARD_IA

# Verify backup integrity
pg_restore --list "$BACKUP_FILE" > /dev/null 2>&1
echo "[$(date)] Backup verified"

# Rotate old local backups
find "$BACKUP_DIR" -name "backup_*.dump" -mtime +$RETENTION_DAYS -delete
echo "[$(date)] Rotated backups older than $RETENTION_DAYS days"

# Rotate old S3 backups (lifecycle policy preferred, but as fallback)
aws s3 ls "$S3_BUCKET/" | \
  awk '{print $4}' | \
  head -n -$RETENTION_DAYS | \
  xargs -I{} aws s3 rm "$S3_BUCKET/{}"
```

**Cron schedule:**

```cron
# Daily full backup at 2 AM UTC
0 2 * * * /opt/scripts/backup-postgres.sh >> /var/log/pg-backup.log 2>&1

# Hourly WAL push (if not using continuous archiving)
0 * * * * wal-g wal-push /var/lib/postgresql/data/pg_wal/ >> /var/log/wal-push.log 2>&1
```

### Docker-Based Backup

```yaml
# docker-compose.backup.yml
services:
  pg-backup:
    image: postgres:16-alpine
    environment:
      PGHOST: db
      PGUSER: postgres
      PGPASSWORD_FILE: /run/secrets/db_password
    volumes:
      - backup-data:/backups
      - ./scripts/backup.sh:/backup.sh:ro
    entrypoint: ["crond", "-f", "-d", "8"]
    configs:
      - source: backup-cron
        target: /var/spool/cron/crontabs/root

configs:
  backup-cron:
    content: |
      0 2 * * * /backup.sh

volumes:
  backup-data:
```

### Managed Service Backups

**Neon (serverless Postgres):**

```typescript
// Neon handles backups automatically via branching
// Create a point-in-time branch for recovery:
import { neonClient } from './neon';

async function createRecoveryBranch(timestamp: string) {
  const branch = await neonClient.createBranch({
    projectId: process.env.NEON_PROJECT_ID!,
    parentId: 'main',
    parentTimestamp: timestamp, // ISO 8601
    name: `recovery-${Date.now()}`,
  });

  return branch.connectionUri;
}
```

**AWS RDS:**

```bash
# Restore to point in time
aws rds restore-db-instance-to-point-in-time \
  --source-db-instance-identifier mydb-prod \
  --target-db-instance-identifier mydb-recovery \
  --restore-time "2025-03-10T14:30:00Z" \
  --db-instance-class db.t3.medium
```

## Best Practices

1. **Define RPO and RTO first** -- Recovery Point Objective (max data loss) and Recovery Time Objective (max downtime) drive your backup strategy.
2. **Test restores regularly** -- An untested backup is not a backup. Schedule monthly restore drills.
3. **Use custom format for pg_dump** -- It compresses well, supports parallel restore, and allows selective table restore.
4. **Combine logical + physical backups** -- pg_dump for portability, WAL archiving for minimal data loss.
5. **Encrypt backups at rest and in transit** -- Use `--compress=zstd` with GPG encryption or S3 server-side encryption.
6. **Store backups in a different region** -- Cross-region replication protects against regional outages.
7. **Monitor backup jobs** -- Alert on failures. A silent backup failure is worse than no backup at all.
8. **Version your backup scripts** -- Keep backup and restore procedures in version control alongside your application.

## Common Pitfalls

| Pitfall | Problem | Fix |
|---------|---------|-----|
| Never testing restores | Discover corrupt backups during an actual emergency | Schedule automated monthly restore verification |
| Plain SQL format for large DBs | Cannot restore in parallel, extremely slow | Use `--format=custom` with `--jobs=N` for parallel restore |
| No WAL archiving | RPO limited to backup frequency (hours of data loss) | Enable WAL archiving for near-zero RPO |
| Backups on the same disk | Disk failure loses both data and backups | Store backups on separate storage, ideally different region |
| Missing `--no-owner` on restore | Restore fails due to missing roles | Use `--no-owner --no-privileges` when restoring to a different environment |
| Unmonitored backup cron | Backup silently fails for weeks | Send alerts on failure; check backup age in monitoring |
| No retention policy | Disk fills up with old backups | Implement rotation: 7 daily, 4 weekly, 12 monthly |
| Backing up during peak load | Locks and performance degradation | Schedule backups during low-traffic windows; use `--no-synchronized-snapshots` for standbys |


---

## From `database-optimization`

> Database query optimization — EXPLAIN ANALYZE, query plans, index hints, materialized views, partitioning

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


---

## From `database-replication`

> Database replication patterns — read replicas, streaming replication, logical replication, and failover.

# Database Replication Patterns

## Purpose

Provide expert guidance on database replication architectures including streaming replication, logical replication, read replicas, failover strategies, and application-level routing. Primarily focused on PostgreSQL but patterns apply broadly. This is a **high-risk** skill — replication misconfiguration can cause data loss.

## Key Patterns

### Replication Types

| Type | Mechanism | Use Case | Lag |
|------|-----------|----------|-----|
| **Streaming (Physical)** | WAL shipping byte-for-byte | Read replicas, HA failover | Sub-second |
| **Logical** | Row-level changes decoded from WAL | Selective replication, version upgrades | Seconds |
| **Synchronous** | Commit waits for replica ACK | Zero data loss (RPO=0) | Higher latency |
| **Asynchronous** | Commit returns immediately | Read scaling, best performance | Sub-second typical |

### PostgreSQL Streaming Replication

**Primary configuration (postgresql.conf):**

```ini
# WAL settings
wal_level = replica                    # minimum for streaming replication
max_wal_senders = 10                   # max number of replicas
wal_keep_size = 1GB                    # WAL retained for slow replicas
max_replication_slots = 10             # prevents WAL cleanup before replica catches up

# Synchronous replication (optional — for zero data loss)
# synchronous_standby_names = 'FIRST 1 (replica1, replica2)'
# synchronous_commit = on
```

**pg_hba.conf — allow replication connections:**

```
# TYPE  DATABASE        USER            ADDRESS                 METHOD
host    replication     replicator      10.0.0.0/24             scram-sha-256
```

**Replica setup:**

```bash
# Create base backup from primary
pg_basebackup -h primary-host -U replicator -D /var/lib/postgresql/data \
  --checkpoint=fast --wal-method=stream --progress

# Create standby signal file
touch /var/lib/postgresql/data/standby.signal
```

**Replica configuration (postgresql.conf):**

```ini
primary_conninfo = 'host=primary-host port=5432 user=replicator password=secret application_name=replica1'
primary_slot_name = 'replica1_slot'
hot_standby = on                       # allow read queries on replica
hot_standby_feedback = on              # prevents vacuum cleanup conflicts
```

### Logical Replication

For selective table replication, cross-version upgrades, or multi-primary setups:

**On the publisher (primary):**

```sql
-- Create a publication for specific tables
CREATE PUBLICATION order_pub FOR TABLE orders, order_items;

-- Or replicate all tables
CREATE PUBLICATION all_tables_pub FOR ALL TABLES;

-- Replicate only INSERT/UPDATE (skip deletes)
CREATE PUBLICATION insert_only_pub FOR TABLE audit_log
  WITH (publish = 'insert, update');
```

**On the subscriber (replica):**

```sql
-- Create matching tables first (schema not replicated)
-- Then create subscription
CREATE SUBSCRIPTION order_sub
  CONNECTION 'host=primary-host port=5432 dbname=mydb user=replicator password=secret'
  PUBLICATION order_pub
  WITH (
    copy_data = true,           -- initial data copy
    create_slot = true,         -- auto-create replication slot
    synchronous_commit = 'off'  -- async for performance
  );
```

### Application-Level Read/Write Routing

**Node.js with connection pool routing:**

```typescript
import { Pool } from "pg";

const primaryPool = new Pool({
  host: process.env.DB_PRIMARY_HOST,
  port: 5432,
  database: "mydb",
  max: 20,
});

const replicaPool = new Pool({
  host: process.env.DB_REPLICA_HOST,
  port: 5432,
  database: "mydb",
  max: 40, // more connections for reads
});

type QueryIntent = "read" | "write";

export async function query(sql: string, params: unknown[], intent: QueryIntent = "read") {
  const pool = intent === "write" ? primaryPool : replicaPool;
  return pool.query(sql, params);
}

// For queries that must see their own writes (read-after-write consistency)
export async function queryPrimary(sql: string, params: unknown[]) {
  return primaryPool.query(sql, params);
}
```

**Django with database routers:**

```python
# settings.py
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'HOST': os.environ['DB_PRIMARY_HOST'],
        'NAME': 'mydb',
    },
    'replica': {
        'ENGINE': 'django.db.backends.postgresql',
        'HOST': os.environ['DB_REPLICA_HOST'],
        'NAME': 'mydb',
    },
}

DATABASE_ROUTERS = ['myapp.routers.PrimaryReplicaRouter']

# routers.py
class PrimaryReplicaRouter:
    def db_for_read(self, model, **hints):
        return 'replica'

    def db_for_write(self, model, **hints):
        return 'default'

    def allow_relation(self, obj1, obj2, **hints):
        return True

    def allow_migrate(self, db, app_label, model_name=None, **hints):
        return db == 'default'
```

**Spring Boot with read/write routing:**

```java
@Configuration
public class DataSourceConfig {

    @Bean
    public DataSource routingDataSource(
            @Qualifier("primaryDataSource") DataSource primary,
            @Qualifier("replicaDataSource") DataSource replica) {

        var router = new ReadWriteRoutingDataSource();
        router.setTargetDataSources(Map.of(
                DataSourceType.PRIMARY, primary,
                DataSourceType.REPLICA, replica
        ));
        router.setDefaultTargetDataSource(primary);
        return router;
    }
}

public class ReadWriteRoutingDataSource extends AbstractRoutingDataSource {
    @Override
    protected Object determineCurrentLookupKey() {
        return TransactionSynchronizationManager.isCurrentTransactionReadOnly()
                ? DataSourceType.REPLICA
                : DataSourceType.PRIMARY;
    }
}
```

### Failover Strategies

**Automated failover with Patroni (PostgreSQL):**

```yaml
# patroni.yml
scope: my-cluster
name: node1

restapi:
  listen: 0.0.0.0:8008

postgresql:
  listen: 0.0.0.0:5432
  data_dir: /var/lib/postgresql/data
  parameters:
    max_connections: 200
    wal_level: replica
    max_wal_senders: 10

bootstrap:
  dcs:
    ttl: 30
    loop_wait: 10
    retry_timeout: 10
    maximum_lag_on_failover: 1048576  # 1MB max lag for failover candidate
    postgresql:
      use_pg_rewind: true

etcd:
  hosts: etcd1:2379,etcd2:2379,etcd3:2379
```

**Health check for replica lag:**

```sql
-- On replica: check replication lag
SELECT
  now() - pg_last_xact_replay_timestamp() AS replication_lag,
  pg_is_in_recovery() AS is_replica,
  pg_last_wal_receive_lsn() AS received_lsn,
  pg_last_wal_replay_lsn() AS replayed_lsn;
```

### Monitoring Replication

**Primary-side monitoring:**

```sql
-- Check replication status from primary
SELECT
  client_addr,
  application_name,
  state,
  sent_lsn,
  write_lsn,
  flush_lsn,
  replay_lsn,
  pg_wal_lsn_diff(sent_lsn, replay_lsn) AS replay_lag_bytes,
  sync_state
FROM pg_stat_replication;

-- Check replication slots (prevent WAL bloat)
SELECT
  slot_name,
  active,
  pg_wal_lsn_diff(pg_current_wal_lsn(), restart_lsn) AS retained_bytes
FROM pg_replication_slots;
```

**Prometheus alerting rules:**

```yaml
groups:
  - name: replication
    rules:
      - alert: ReplicationLagHigh
        expr: pg_replication_lag_seconds > 30
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Replication lag exceeds 30s on {{ $labels.instance }}"

      - alert: ReplicationSlotInactive
        expr: pg_replication_slots_active == 0
        for: 10m
        labels:
          severity: critical
        annotations:
          summary: "Inactive replication slot {{ $labels.slot_name }} — WAL may bloat"
```

## Best Practices

1. **Use replication slots** — Prevents WAL cleanup before replicas consume it. Without slots, slow replicas can fall behind and require re-initialization.
2. **Monitor replication lag continuously** — Alert on lag exceeding your tolerance. For critical reads, route to primary.
3. **Use synchronous replication for zero RPO** — But accept the latency cost. Use `synchronous_commit = remote_apply` for strongest guarantee.
4. **Enable `hot_standby_feedback`** — Prevents long-running replica queries from conflicting with vacuum on the primary.
5. **Handle read-after-write consistency** — After a write, route subsequent reads to the primary for a short window (sticky session or explicit routing).
6. **Test failover regularly** — Automate failover drills. Use Patroni or PgBouncer for automated promotion.
7. **Monitor replication slot WAL retention** — Inactive slots prevent WAL cleanup and can fill the disk. Alert and drop stale slots.
8. **Use logical replication for selective sync** — When you only need certain tables replicated, logical replication avoids full WAL shipping overhead.
9. **Size replica connections separately** — Read replicas typically need more connections than the primary since they handle high read volume.
10. **Plan for split-brain** — Use consensus-based tools (etcd/ZooKeeper with Patroni) to prevent two nodes from both believing they are primary.

## Common Pitfalls

| Pitfall | Problem | Fix |
|---------|---------|-----|
| No replication slots | Replica falls behind, needs full re-sync | Always create replication slots |
| Inactive replication slots | WAL accumulates, disk fills up | Monitor and drop orphaned slots |
| Read-after-write inconsistency | User writes data, reads stale from replica | Route to primary for a few seconds after writes |
| Missing `hot_standby_feedback` | Long queries on replica cancelled by vacuum conflicts | Enable `hot_standby_feedback = on` |
| Synchronous replication without tuning | Every commit waits for network round trip | Use `synchronous_commit = remote_write` for balanced performance |
| No failover automation | Manual promotion takes minutes during outage | Use Patroni or cloud-managed HA |
| Schema changes breaking logical replication | ALTER TABLE on publisher not replicated | Apply DDL on both publisher and subscriber |
| WAL bloat from long transactions | `pg_wal` directory grows unbounded | Monitor `oldest_xact_age`, kill long transactions |


---

## From `database-migration-patterns`

> Database migration strategies — zero-downtime migrations, expand-contract, backfill, and rollback patterns.

# Database Migration Patterns

## Purpose

Guide safe, zero-downtime database schema migrations for production systems. Covers the expand-contract pattern, safe column operations, backfill strategies, index management, and rollback procedures. Focused on PostgreSQL but principles apply broadly.

## Key Patterns

### Expand-Contract Pattern

The gold standard for zero-downtime migrations. Every migration goes through three phases:

```
Phase 1 — EXPAND:   Add new structure alongside old (backward compatible)
Phase 2 — MIGRATE:  Backfill data, update application code to use new structure
Phase 3 — CONTRACT: Remove old structure once fully migrated
```

**Example: Renaming a column** (`email` -> `email_address`):

```sql
-- Phase 1: EXPAND — Add new column
ALTER TABLE users ADD COLUMN email_address TEXT;

-- Phase 2: MIGRATE — Backfill + dual-write
-- a) Backfill existing rows
UPDATE users SET email_address = email WHERE email_address IS NULL;
-- b) Deploy app code that writes to BOTH columns
-- c) Add trigger to keep columns in sync during transition
CREATE OR REPLACE FUNCTION sync_email_columns()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.email_address IS NULL THEN
    NEW.email_address := NEW.email;
  END IF;
  IF NEW.email IS NULL THEN
    NEW.email := NEW.email_address;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_sync_email
  BEFORE INSERT OR UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION sync_email_columns();

-- Phase 3: CONTRACT — Remove old column (after all code uses email_address)
DROP TRIGGER trg_sync_email ON users;
DROP FUNCTION sync_email_columns();
ALTER TABLE users DROP COLUMN email;
```

### Safe Column Operations

**Adding a column** (safe):
```sql
-- Safe: adds column with no default (instant in PG 11+)
ALTER TABLE orders ADD COLUMN tracking_number TEXT;

-- Safe in PG 11+: default value does not rewrite table
ALTER TABLE orders ADD COLUMN status TEXT NOT NULL DEFAULT 'pending';
```

**Adding NOT NULL constraint** (careful):
```sql
-- UNSAFE: Scans entire table, holds ACCESS EXCLUSIVE lock
ALTER TABLE orders ALTER COLUMN status SET NOT NULL;

-- SAFE: Use a CHECK constraint with NOT VALID, then validate separately
ALTER TABLE orders ADD CONSTRAINT orders_status_not_null
  CHECK (status IS NOT NULL) NOT VALID;

-- Later (takes ShareUpdateExclusiveLock, allows reads + writes):
ALTER TABLE orders VALIDATE CONSTRAINT orders_status_not_null;
```

**Changing column type** (dangerous — use expand-contract):
```sql
-- NEVER do this on a large table:
-- ALTER TABLE users ALTER COLUMN age TYPE bigint;
-- This rewrites the entire table with ACCESS EXCLUSIVE lock

-- Instead, use expand-contract:
-- 1) Add new column
ALTER TABLE users ADD COLUMN age_v2 BIGINT;
-- 2) Backfill
UPDATE users SET age_v2 = age WHERE age_v2 IS NULL;
-- 3) Swap in application code
-- 4) Drop old column
ALTER TABLE users DROP COLUMN age;
ALTER TABLE users RENAME COLUMN age_v2 TO age;
```

### Safe Index Creation

```sql
-- NEVER: blocks writes for the entire build duration
-- CREATE INDEX idx_orders_status ON orders(status);

-- ALWAYS: concurrent index creation (allows reads + writes)
CREATE INDEX CONCURRENTLY idx_orders_status ON orders(status);

-- Check for invalid indexes after concurrent creation
SELECT indexrelid::regclass, indisvalid
FROM pg_index
WHERE NOT indisvalid;

-- If invalid, drop and recreate
DROP INDEX CONCURRENTLY idx_orders_status;
CREATE INDEX CONCURRENTLY idx_orders_status ON orders(status);
```

### Backfill Strategies

**Batched backfill** — Avoid long-running transactions:

```sql
-- Batch update with ctid-based pagination (PostgreSQL)
DO $$
DECLARE
  batch_size INT := 10000;
  affected INT;
BEGIN
  LOOP
    UPDATE users
    SET email_address = email
    WHERE email_address IS NULL
      AND ctid IN (
        SELECT ctid FROM users
        WHERE email_address IS NULL
        LIMIT batch_size
        FOR UPDATE SKIP LOCKED
      );

    GET DIAGNOSTICS affected = ROW_COUNT;
    RAISE NOTICE 'Updated % rows', affected;

    IF affected = 0 THEN
      EXIT;
    END IF;

    -- Brief pause to reduce lock contention
    PERFORM pg_sleep(0.1);
    COMMIT;
  END LOOP;
END $$;
```

**Application-level backfill** (for complex transformations):

```typescript
async function backfillInBatches(
  db: Pool,
  batchSize = 5000,
  delayMs = 100
) {
  let totalUpdated = 0;

  while (true) {
    const result = await db.query(
      `UPDATE users
       SET email_address = email
       WHERE id IN (
         SELECT id FROM users
         WHERE email_address IS NULL
         ORDER BY id
         LIMIT $1
       )
       RETURNING id`,
      [batchSize]
    );

    totalUpdated += result.rowCount ?? 0;
    console.log(`Backfilled ${totalUpdated} rows so far`);

    if ((result.rowCount ?? 0) < batchSize) break;
    await new Promise((r) => setTimeout(r, delayMs));
  }

  return totalUpdated;
}
```

### Drizzle ORM Migration Example

```typescript
// drizzle/migrations/0015_add_email_address.ts
import { sql } from 'drizzle-orm';
import type { MigrationMeta } from 'drizzle-orm/migrator';

export async function up(db: any) {
  // Phase 1: Expand
  await db.execute(sql`
    ALTER TABLE users ADD COLUMN email_address TEXT;
  `);

  // Phase 2: Backfill
  await db.execute(sql`
    UPDATE users SET email_address = email WHERE email_address IS NULL;
  `);
}

export async function down(db: any) {
  await db.execute(sql`
    ALTER TABLE users DROP COLUMN IF EXISTS email_address;
  `);
}
```

### Rollback Procedures

**Pre-migration checklist:**

```sql
-- 1. Snapshot current state
SELECT count(*) FROM users; -- Record row count
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'users';

-- 2. Create a savepoint or take a logical backup
pg_dump --table=users --data-only -f users_backup.sql mydb

-- 3. Test migration on a staging copy first
-- 4. Plan the rollback SQL before executing the migration
```

**Rollback-safe migration template:**

```typescript
interface Migration {
  name: string;
  up: string[];    // Forward migration SQL statements
  down: string[];  // Rollback SQL statements
  verify: string;  // Query to verify migration succeeded
}

const migration: Migration = {
  name: '0015_add_tracking_number',
  up: [
    'ALTER TABLE orders ADD COLUMN tracking_number TEXT;',
    'CREATE INDEX CONCURRENTLY idx_orders_tracking ON orders(tracking_number);',
  ],
  down: [
    'DROP INDEX CONCURRENTLY IF EXISTS idx_orders_tracking;',
    'ALTER TABLE orders DROP COLUMN IF EXISTS tracking_number;',
  ],
  verify: `
    SELECT column_name FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'tracking_number';
  `,
};
```

### Advisory Locks for Migration Safety

```sql
-- Prevent concurrent migration execution
SELECT pg_advisory_lock(12345); -- Acquire lock (blocks if held)

-- Run migration...

SELECT pg_advisory_unlock(12345); -- Release lock
```

```typescript
async function withMigrationLock(db: Pool, fn: () => Promise<void>) {
  const LOCK_ID = 839274; // Arbitrary but consistent
  try {
    await db.query('SELECT pg_advisory_lock($1)', [LOCK_ID]);
    await fn();
  } finally {
    await db.query('SELECT pg_advisory_unlock($1)', [LOCK_ID]);
  }
}
```

## Best Practices

1. **Never run migrations directly on production first** — Always test on a staging environment with production-sized data.
2. **Use expand-contract for destructive changes** — Column renames, type changes, and removes should always go through three phases.
3. **Create indexes concurrently** — `CREATE INDEX CONCURRENTLY` avoids blocking writes.
4. **Batch all backfills** — Never run a single `UPDATE ... SET` on millions of rows; use batches of 5k-10k with brief pauses.
5. **Write rollback SQL before the migration** — Every `up` must have a corresponding `down` written and tested.
6. **Monitor lock contention** — Use `pg_stat_activity` and `pg_locks` during migrations to catch blocking.
7. **Use advisory locks** — Prevent two migration processes from running simultaneously.
8. **Separate schema changes from data changes** — Deploy schema additions first, then backfill in a separate step.
9. **Validate constraints separately** — Use `NOT VALID` + `VALIDATE CONSTRAINT` to avoid long exclusive locks.
10. **Keep migrations small and focused** — One logical change per migration file; never combine unrelated changes.

## Common Pitfalls

| Pitfall | Problem | Fix |
|---------|---------|-----|
| Adding NOT NULL without default | Entire table rewrite + exclusive lock | Use NOT VALID CHECK constraint + validate later |
| Non-concurrent index creation | Blocks all writes during build | Always use `CREATE INDEX CONCURRENTLY` |
| Backfill in single transaction | Long-running transaction blocks vacuum, bloats table | Batch with COMMIT between batches |
| No rollback plan | Stuck with a broken migration in production | Write and test `down` migration before running `up` |
| Dropping column before code deploy | Application errors on missing column | Deploy code changes first, then drop column |
| Running migration during peak traffic | Lock contention causes timeouts | Schedule migrations during low-traffic windows |
| Forgetting to validate NOT VALID constraints | Constraint exists but not enforced on old rows | Run `ALTER TABLE ... VALIDATE CONSTRAINT` after backfill |

