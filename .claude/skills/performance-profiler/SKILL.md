---
name: performance-profiler
description: Profile, benchmark, and identify performance bottlenecks in applications — CPU, memory, network, rendering, and database query performance
layer: utility
category: performance
triggers:
  - "profile this"
  - "why is this slow"
  - "benchmark"
  - "performance bottleneck"
  - "optimize performance"
  - "memory leak"
  - "slow query"
  - "render performance"
  - "bundle size"
inputs:
  - Code, endpoint, or page to profile
  - Performance target (latency budget, bundle size limit, FPS target)
  - Current performance metrics if available
  - Environment (Node.js, browser, edge, database)
outputs:
  - Performance analysis with identified bottlenecks
  - Prioritized optimization recommendations
  - Before/after benchmark comparisons
  - Profiling tool commands and configuration
  - Optimized code implementations
linksTo:
  - caching
  - optimize
  - data-modeling
linkedFrom:
  - optimize
  - ship
  - code-review
preferredNextSkills:
  - caching
  - optimize
fallbackSkills:
  - debug
riskLevel: low
memoryReadPolicy: selective
memoryWritePolicy: selective
sideEffects:
  - May modify code for optimization
  - May add profiling dependencies temporarily
  - May suggest infrastructure changes
---

# Performance Profiler Skill

## Purpose

Find the actual bottleneck before optimizing. This skill applies systematic profiling methodology to identify where time and resources are being spent, then provides targeted optimizations ranked by impact. The cardinal rule: **measure first, optimize second**.

## Key Concepts

### The Performance Budget

Define targets before measuring:

```
Web Vitals Targets:
  LCP  (Largest Contentful Paint)  < 2.5s
  FID  (First Input Delay)         < 100ms
  CLS  (Cumulative Layout Shift)   < 0.1
  TTFB (Time to First Byte)        < 800ms
  INP  (Interaction to Next Paint) < 200ms

API Targets:
  p50 latency   < 100ms
  p95 latency   < 500ms
  p99 latency   < 1000ms
  Error rate    < 0.1%

Bundle Targets:
  Initial JS    < 100KB gzipped
  Total JS      < 300KB gzipped
  First load    < 200KB transferred
```

### Bottleneck Categories

| Category | Symptoms | Profiling Tool |
|----------|----------|----------------|
| **CPU-bound** | High CPU usage, slow computation | Node.js profiler, Chrome DevTools Performance |
| **Memory-bound** | Growing heap, GC pauses, OOM | Heap snapshots, `--inspect`, memwatch |
| **I/O-bound** | Waiting on network, disk, DB | Async traces, DB query logs |
| **Render-bound** | Jank, low FPS, layout thrashing | Chrome Performance tab, React Profiler |
| **Network-bound** | Large payloads, many requests | Network tab, WebPageTest, Lighthouse |
| **Database-bound** | Slow queries, N+1 problems | EXPLAIN ANALYZE, query logs |

## Workflow

### Phase 1: Measure Baseline

#### Node.js / Server

```bash
# Built-in profiling
node --prof app.js
# Process the output
node --prof-process isolate-*.log > profile.txt

# Clinic.js suite (comprehensive)
npx clinic doctor -- node app.js
npx clinic flame -- node app.js     # CPU flamegraph
npx clinic bubbleprof -- node app.js # Async bottlenecks

# Simple benchmarking
npx autocannon -c 100 -d 10 http://localhost:3000/api/endpoint
```

#### Browser / Frontend

```javascript
// Performance API — measure specific operations
performance.mark('fetch-start');
const data = await fetch('/api/data');
performance.mark('fetch-end');
performance.measure('API Fetch', 'fetch-start', 'fetch-end');

const measure = performance.getEntriesByName('API Fetch')[0];
console.log(`API call took ${measure.duration.toFixed(2)}ms`);

// Long Task Observer — detect jank
const observer = new PerformanceObserver((list) => {
  for (const entry of list.getEntries()) {
    console.warn(`Long task detected: ${entry.duration.toFixed(0)}ms`, entry);
  }
});
observer.observe({ type: 'longtask', buffered: true });
```

#### React Specific

```typescript
// React Profiler component
import { Profiler } from 'react';

function onRenderCallback(
  id: string,
  phase: 'mount' | 'update',
  actualDuration: number,
  baseDuration: number,
) {
  if (actualDuration > 16) { // Over one frame budget (60fps)
    console.warn(`Slow render: ${id} (${phase}) took ${actualDuration.toFixed(1)}ms`);
  }
}

<Profiler id="ProductList" onRender={onRenderCallback}>
  <ProductList items={items} />
</Profiler>

// why-did-you-render (development only)
// Detects unnecessary re-renders
```

#### Database Queries

```sql
-- PostgreSQL: Analyze query plan
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT u.*, COUNT(p.id) as post_count
FROM users u
LEFT JOIN posts p ON p.user_id = u.id
WHERE u.created_at > '2024-01-01'
GROUP BY u.id
ORDER BY post_count DESC
LIMIT 20;

-- Look for:
-- Seq Scan on large tables → needs index
-- Nested Loop with high row count → consider join strategy
-- Sort with high memory → add index for ORDER BY
-- Actual rows >> Estimated rows → stale statistics (run ANALYZE)
```

### Phase 2: Identify Bottleneck

**The 80/20 Rule**: 80% of time is spent in 20% of code. Find that 20%.

```
Profiling Checklist:
1. Where is wall-clock time spent?
   - CPU computation
   - Waiting for I/O (DB, network, disk)
   - Garbage collection pauses

2. What is the call frequency?
   - Called once but slow → optimize the function
   - Called 1000x but fast → reduce call count (batching, caching)

3. What is the data volume?
   - Processing too much data → paginate, filter earlier
   - Transferring too much → compress, select specific fields

4. Where are allocations?
   - Creating objects in hot loops → pre-allocate, reuse
   - Large strings/arrays → streaming, chunking
```

### Phase 3: Optimize (Targeted)

#### CPU Optimization Patterns

```typescript
// BEFORE: O(n^2) nested lookup
const enriched = users.map(user => ({
  ...user,
  posts: posts.filter(p => p.userId === user.id), // O(n) for each user
}));

// AFTER: O(n) with pre-indexed lookup
const postsByUser = new Map<string, Post[]>();
for (const post of posts) {
  const existing = postsByUser.get(post.userId) ?? [];
  existing.push(post);
  postsByUser.set(post.userId, existing);
}
const enriched = users.map(user => ({
  ...user,
  posts: postsByUser.get(user.id) ?? [],
}));
```

#### Memory Optimization

```typescript
// BEFORE: Loading all records into memory
const allUsers = await db.user.findMany(); // 1M records = OOM
const activeUsers = allUsers.filter(u => u.active);

// AFTER: Filter at database level + streaming
const activeUsers = await db.user.findMany({
  where: { active: true },
  select: { id: true, name: true, email: true }, // Only needed fields
});

// For truly large datasets, use cursors
async function* streamUsers(batchSize = 1000) {
  let cursor: string | undefined;
  while (true) {
    const batch = await db.user.findMany({
      take: batchSize,
      skip: cursor ? 1 : 0,
      cursor: cursor ? { id: cursor } : undefined,
      where: { active: true },
    });
    if (batch.length === 0) break;
    yield* batch;
    cursor = batch[batch.length - 1].id;
  }
}
```

#### Network / Bundle Optimization

```typescript
// Identify large imports
// Run: npx source-map-explorer build/static/js/*.js

// BEFORE: Importing entire library
import { format, parse, addDays, subDays, isAfter, isBefore } from 'date-fns';

// AFTER: Tree-shakeable direct imports
import { format } from 'date-fns/format';
import { addDays } from 'date-fns/addDays';

// Dynamic import for heavy, non-critical modules
const ChartComponent = dynamic(() => import('@/components/Chart'), {
  loading: () => <ChartSkeleton />,
  ssr: false,
});
```

#### Database Query Optimization

```sql
-- BEFORE: N+1 query (1 query per user for their posts)
-- ORM generates: SELECT * FROM posts WHERE user_id = $1 (repeated N times)

-- AFTER: Single query with JOIN
SELECT u.id, u.name, p.id as post_id, p.title
FROM users u
LEFT JOIN posts p ON p.user_id = u.id
WHERE u.active = true;

-- Add missing indexes
CREATE INDEX CONCURRENTLY idx_posts_user_id ON posts(user_id);
CREATE INDEX CONCURRENTLY idx_users_active ON users(active) WHERE active = true;

-- Use covering index to avoid table lookup
CREATE INDEX idx_posts_user_id_covering
ON posts(user_id) INCLUDE (title, created_at);
```

#### Async / Concurrency Optimization

```typescript
// BEFORE: Sequential fetches (waterfall)
const user = await fetchUser(id);       // 200ms
const posts = await fetchPosts(id);     // 300ms
const followers = await fetchFollowers(id); // 150ms
// Total: 650ms

// AFTER: Parallel fetches
const [user, posts, followers] = await Promise.all([
  fetchUser(id),       // 200ms
  fetchPosts(id),      // 300ms (in parallel)
  fetchFollowers(id),  // 150ms (in parallel)
]);
// Total: 300ms (longest single request)
```

### Phase 4: Verify Improvement

```typescript
// Micro-benchmark pattern
function benchmark(name: string, fn: () => void, iterations = 10000) {
  // Warm up
  for (let i = 0; i < 100; i++) fn();

  const start = performance.now();
  for (let i = 0; i < iterations; i++) fn();
  const elapsed = performance.now() - start;

  console.log(`${name}: ${(elapsed / iterations).toFixed(4)}ms per call (${iterations} iterations)`);
}

// Compare before/after
benchmark('original', () => originalFunction(testData));
benchmark('optimized', () => optimizedFunction(testData));
```

## Quick Reference: Common Fixes

| Symptom | Likely Cause | Fix |
|---------|-------------|-----|
| Slow initial page load | Large JS bundle | Code splitting, dynamic imports |
| Slow API responses | N+1 queries | Eager loading, JOINs, DataLoader |
| High memory usage | Unbounded arrays/caches | Streaming, pagination, LRU eviction |
| Jank / dropped frames | Layout thrashing, heavy re-renders | `useMemo`, virtualization, CSS containment |
| Slow DB queries | Missing indexes | EXPLAIN ANALYZE, add targeted indexes |
| High TTFB | Cold start, no caching | Edge caching, connection pooling, warm-up |
| Memory leaks | Event listeners, closures, timers | Cleanup in useEffect, WeakRef, monitoring |

## Tools Cheat Sheet

```bash
# Bundle analysis
npx next-bundle-analyzer
npx source-map-explorer build/**/*.js
npx bundlephobia <package-name>

# Server profiling
npx clinic doctor -- node server.js
npx autocannon -c 50 -d 30 http://localhost:3000

# Lighthouse (headless)
npx lighthouse https://yoursite.com --output=json --output-path=./report.json

# Database
pgbadger /var/log/postgresql/postgresql.log  # PostgreSQL log analyzer
```
