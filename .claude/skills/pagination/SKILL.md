---
name: pagination
description: Implement pagination patterns — cursor-based, offset, keyset, infinite scroll — across APIs, databases, and React components
layer: utility
category: backend
triggers:
  - "pagination"
  - "paginate"
  - "cursor pagination"
  - "infinite scroll"
  - "load more"
  - "offset pagination"
  - "keyset pagination"
  - "next page"
  - "page size"
inputs:
  - Data source (database table, API endpoint)
  - Expected dataset size and growth rate
  - UX pattern (page numbers, infinite scroll, load more)
  - Sort requirements (single field, multi-field, stable sort)
outputs:
  - Pagination API endpoint with chosen strategy
  - Database query with efficient pagination
  - React component (infinite scroll or page controls)
  - Type-safe pagination utilities
linksTo:
  - api-designer
  - postgresql
  - react
  - caching
  - search
linkedFrom:
  - ecommerce
  - optimize
preferredNextSkills:
  - caching
  - api-designer
fallbackSkills:
  - postgresql
riskLevel: low
memoryReadPolicy: selective
memoryWritePolicy: none
sideEffects: []
---

# Pagination Skill

## Purpose

Pagination is how you serve large datasets without killing your database, your bandwidth, or your users' patience. This skill covers choosing the right pagination strategy, implementing it correctly at the database and API level, and building the matching frontend components.

## When to Use What

| Strategy | Best For | Drawbacks | Consistency |
|----------|----------|-----------|-------------|
| **Offset** (`LIMIT/OFFSET`) | Small datasets, page-number UX | Slow on large offsets, drift on inserts | Unstable |
| **Cursor-based** | Infinite scroll, real-time feeds | No jump-to-page, complex multi-field cursors | Stable |
| **Keyset** | Large sorted datasets, APIs | Requires unique sortable column | Stable |
| **Page tokens** | Public APIs, opaque cursors | Extra encoding step | Stable |

**Decision shortcut:**
- Need page numbers (1, 2, 3...)? **Offset** (but cap max page)
- Feed, timeline, or infinite scroll? **Cursor-based**
- Large dataset, API consumers? **Keyset with opaque tokens**

## Key Concepts

### Why Offset Pagination Breaks at Scale

```sql
-- Page 1: fast (scans 20 rows)
SELECT * FROM posts ORDER BY created_at DESC LIMIT 20 OFFSET 0;

-- Page 500: slow (scans 10,000 rows, discards 9,980)
SELECT * FROM posts ORDER BY created_at DESC LIMIT 20 OFFSET 9980;

-- Also: if a new post is inserted while paginating,
-- a post from page N shifts to page N+1 → user sees it twice.
```

### Cursor vs Keyset

- **Cursor**: Opaque token encoding the position (e.g., base64-encoded JSON). Client cannot inspect it.
- **Keyset**: Uses actual column values (e.g., `WHERE created_at < '2025-01-01' AND id < 42`). The cursor IS the keyset condition, just encoded.
- In practice, "cursor-based" pagination almost always uses keyset conditions under the hood.

## Implementation Patterns

### 1. Cursor-Based Pagination (API + Database)

```typescript
// Types
interface PaginationParams {
  first?: number;   // Forward pagination: number of items
  after?: string;   // Forward pagination: cursor
  last?: number;    // Backward pagination: number of items
  before?: string;  // Backward pagination: cursor
}

interface PageInfo {
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  startCursor: string | null;
  endCursor: string | null;
}

interface Edge<T> {
  node: T;
  cursor: string;
}

interface Connection<T> {
  edges: Edge<T>[];
  pageInfo: PageInfo;
  totalCount?: number;
}

// Cursor encoding/decoding
function encodeCursor(data: Record<string, unknown>): string {
  return Buffer.from(JSON.stringify(data)).toString('base64url');
}

function decodeCursor(cursor: string): Record<string, unknown> {
  return JSON.parse(Buffer.from(cursor, 'base64url').toString('utf-8'));
}
```

```typescript
// Database query (PostgreSQL + Drizzle)
import { and, lt, gt, desc, asc, sql, eq } from 'drizzle-orm';
import { posts } from './schema';

async function getPosts(params: PaginationParams): Promise<Connection<Post>> {
  const limit = Math.min(params.first ?? params.last ?? 20, 100);
  const isForward = !params.last;

  // Decode cursor to keyset values
  let cursorValues: { createdAt: string; id: string } | null = null;
  const cursorRaw = params.after ?? params.before;
  if (cursorRaw) {
    cursorValues = decodeCursor(cursorRaw) as typeof cursorValues;
  }

  // Build WHERE condition using keyset
  const conditions = [];
  if (cursorValues) {
    // Composite keyset: (created_at, id) for stable ordering
    if (isForward) {
      conditions.push(
        sql`(${posts.createdAt}, ${posts.id}) < (${cursorValues.createdAt}, ${cursorValues.id})`
      );
    } else {
      conditions.push(
        sql`(${posts.createdAt}, ${posts.id}) > (${cursorValues.createdAt}, ${cursorValues.id})`
      );
    }
  }

  // Fetch limit + 1 to determine if there are more items
  const rows = await db
    .select()
    .from(posts)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(isForward ? desc(posts.createdAt) : asc(posts.createdAt),
             isForward ? desc(posts.id) : asc(posts.id))
    .limit(limit + 1);

  // Check if there's a next/previous page
  const hasMore = rows.length > limit;
  if (hasMore) rows.pop();

  // Reverse if backward pagination
  if (!isForward) rows.reverse();

  const edges: Edge<Post>[] = rows.map((row) => ({
    node: row,
    cursor: encodeCursor({ createdAt: row.createdAt, id: row.id }),
  }));

  return {
    edges,
    pageInfo: {
      hasNextPage: isForward ? hasMore : !!params.before,
      hasPreviousPage: isForward ? !!params.after : hasMore,
      startCursor: edges[0]?.cursor ?? null,
      endCursor: edges[edges.length - 1]?.cursor ?? null,
    },
  };
}
```

### 2. Next.js API Route

```typescript
// /api/posts/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;

  const first = params.get('first') ? Number(params.get('first')) : undefined;
  const after = params.get('after') ?? undefined;
  const last = params.get('last') ? Number(params.get('last')) : undefined;
  const before = params.get('before') ?? undefined;

  // Validate: cannot use both forward and backward at once
  if ((first && last) || (after && before)) {
    return NextResponse.json(
      { error: 'Cannot combine forward (first/after) and backward (last/before) pagination' },
      { status: 400 }
    );
  }

  const connection = await getPosts({ first, after, last, before });

  return NextResponse.json(connection, {
    headers: {
      'Cache-Control': 'public, max-age=10, stale-while-revalidate=30',
    },
  });
}
```

### 3. Offset Pagination (When You Need Page Numbers)

```typescript
// Only use for small-to-medium datasets with page-number UX
interface OffsetPaginationParams {
  page: number;
  pageSize: number;
}

interface OffsetPaginationResult<T> {
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

async function getPostsPaginated(
  params: OffsetPaginationParams
): Promise<OffsetPaginationResult<Post>> {
  const page = Math.max(1, params.page);
  const pageSize = Math.min(Math.max(1, params.pageSize), 100);
  const offset = (page - 1) * pageSize;

  // Cap maximum offset to prevent deep pagination abuse
  const MAX_OFFSET = 10_000;
  if (offset > MAX_OFFSET) {
    throw new Error(`Cannot paginate beyond ${MAX_OFFSET} items. Use cursor-based pagination.`);
  }

  const [rows, countResult] = await Promise.all([
    db.select().from(posts).orderBy(desc(posts.createdAt)).limit(pageSize).offset(offset),
    db.select({ count: sql<number>`count(*)` }).from(posts),
  ]);

  const totalItems = countResult[0].count;
  const totalPages = Math.ceil(totalItems / pageSize);

  return {
    data: rows,
    pagination: {
      page,
      pageSize,
      totalItems,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
    },
  };
}
```

### 4. Infinite Scroll React Component

```typescript
import { useEffect, useRef, useCallback, useState } from 'react';

interface UseInfiniteScrollOptions<T> {
  fetchPage: (cursor?: string) => Promise<{
    items: T[];
    nextCursor: string | null;
  }>;
  enabled?: boolean;
  rootMargin?: string;
}

function useInfiniteScroll<T>({
  fetchPage,
  enabled = true,
  rootMargin = '200px',
}: UseInfiniteScrollOptions<T>) {
  const [items, setItems] = useState<T[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const cursorRef = useRef<string | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const loadMore = useCallback(async () => {
    if (isLoading || !hasMore || !enabled) return;

    setIsLoading(true);
    setError(null);

    try {
      const { items: newItems, nextCursor } = await fetchPage(
        cursorRef.current ?? undefined
      );
      setItems((prev) => [...prev, ...newItems]);
      cursorRef.current = nextCursor;
      setHasMore(nextCursor !== null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load'));
    } finally {
      setIsLoading(false);
    }
  }, [fetchPage, isLoading, hasMore, enabled]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !enabled) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          loadMore();
        }
      },
      { rootMargin }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [loadMore, rootMargin, enabled]);

  const reset = useCallback(() => {
    setItems([]);
    cursorRef.current = null;
    setHasMore(true);
    setError(null);
  }, []);

  return { items, isLoading, error, hasMore, sentinelRef, reset };
}

// Usage
function PostFeed() {
  const { items, isLoading, error, hasMore, sentinelRef } = useInfiniteScroll({
    fetchPage: async (cursor) => {
      const params = new URLSearchParams({ first: '20' });
      if (cursor) params.set('after', cursor);
      const res = await fetch(`/api/posts?${params}`);
      const data = await res.json();
      return {
        items: data.edges.map((e: Edge<Post>) => e.node),
        nextCursor: data.pageInfo.hasNextPage ? data.pageInfo.endCursor : null,
      };
    },
  });

  return (
    <div className="space-y-4 py-16">
      {items.map((post) => (
        <article key={post.id} className="p-6 rounded-xl shadow-sm border border-gray-200">
          <h2 className="text-lg font-semibold">{post.title}</h2>
          <p className="text-base text-gray-600 mt-2">{post.excerpt}</p>
        </article>
      ))}

      {isLoading && (
        <div className="flex justify-center py-8" role="status" aria-label="Loading more posts">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600" />
        </div>
      )}

      {error && (
        <div className="text-center py-8 text-red-600" role="alert">
          <p>{error.message}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-6 py-4 text-base rounded-lg bg-red-50 text-red-700
                       transition-all duration-200 hover:bg-red-100
                       focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-red-500
                       motion-reduce:transition-none"
          >
            Retry
          </button>
        </div>
      )}

      {/* Invisible sentinel triggers next page load */}
      {hasMore && <div ref={sentinelRef} aria-hidden="true" />}

      {!hasMore && items.length > 0 && (
        <p className="text-center text-gray-500 py-8">No more posts</p>
      )}
    </div>
  );
}
```

### 5. Page-Number Pagination Component

```typescript
interface PaginationControlsProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

function PaginationControls({ page, totalPages, onPageChange }: PaginationControlsProps) {
  // Generate visible page numbers with ellipsis
  function getPageNumbers(): (number | 'ellipsis')[] {
    const pages: (number | 'ellipsis')[] = [];
    const delta = 2; // Pages around current page

    for (let i = 1; i <= totalPages; i++) {
      if (
        i === 1 ||
        i === totalPages ||
        (i >= page - delta && i <= page + delta)
      ) {
        pages.push(i);
      } else if (pages[pages.length - 1] !== 'ellipsis') {
        pages.push('ellipsis');
      }
    }

    return pages;
  }

  return (
    <nav aria-label="Pagination" className="flex items-center justify-center gap-2 py-8">
      <button
        onClick={() => onPageChange(page - 1)}
        disabled={page <= 1}
        aria-label="Previous page"
        className="px-4 py-3 text-base rounded-lg border border-gray-300 shadow-sm
                   transition-all duration-200 hover:bg-gray-50
                   disabled:opacity-50 disabled:cursor-not-allowed
                   focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500
                   motion-reduce:transition-none"
      >
        Previous
      </button>

      {getPageNumbers().map((p, i) =>
        p === 'ellipsis' ? (
          <span key={`ellipsis-${i}`} className="px-2 text-gray-400">...</span>
        ) : (
          <button
            key={p}
            onClick={() => onPageChange(p)}
            aria-current={p === page ? 'page' : undefined}
            aria-label={`Page ${p}`}
            className={`min-w-[2.75rem] px-4 py-3 text-base rounded-lg border shadow-sm
                       transition-all duration-200
                       focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500
                       motion-reduce:transition-none
                       ${p === page
                         ? 'bg-blue-600 text-white border-blue-600'
                         : 'border-gray-300 hover:bg-gray-50'
                       }`}
          >
            {p}
          </button>
        )
      )}

      <button
        onClick={() => onPageChange(page + 1)}
        disabled={page >= totalPages}
        aria-label="Next page"
        className="px-4 py-3 text-base rounded-lg border border-gray-300 shadow-sm
                   transition-all duration-200 hover:bg-gray-50
                   disabled:opacity-50 disabled:cursor-not-allowed
                   focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500
                   motion-reduce:transition-none"
      >
        Next
      </button>
    </nav>
  );
}
```

## Common Pitfalls

| Pitfall | Impact | Fix |
|---------|--------|-----|
| Deep offset pagination (`OFFSET 100000`) | Linear scan, massive latency | Switch to cursor/keyset, cap max offset |
| No stable sort key | Duplicate or missing items across pages | Always include a unique column (e.g., `id`) as tiebreaker |
| COUNT(*) on every request | Extra full-table scan | Cache total count, use `estimatedTotalHits`, or omit |
| No limit cap on page size | Client requests 10,000 items | Enforce `Math.min(pageSize, 100)` server-side |
| Cursor leaking internal state | Consumers depend on cursor format | Use opaque base64-encoded tokens |
| Infinite scroll with no "end" signal | Keeps firing empty requests | Check `hasNextPage` before observing sentinel |
| Missing loading/error states | Broken UX on slow networks | Always handle loading, error, and empty states |

## Examples

### Example 1: Social Feed

```
Strategy: Cursor-based (forward only, real-time inserts)
Sort: created_at DESC, id DESC (composite keyset)
Page size: 20, max 50
UX: Infinite scroll with sentinel observer
Caching: CDN cache first page (10s), no cache for subsequent
```

### Example 2: Admin Data Table

```
Strategy: Offset with page numbers (small-medium dataset)
Sort: User-selectable columns
Page size: 25, options [10, 25, 50, 100]
UX: Page numbers + "Showing 1-25 of 342" + page size selector
Caching: None (admin data should be fresh)
Cap: Max 10,000 offset, show "refine your search" beyond that
```

### Example 3: Public REST API

```
Strategy: Opaque cursor tokens (Relay-style Connection spec)
Response shape: { edges, pageInfo, totalCount }
Page size: Default 20, max 100
Headers: Link header with rel="next" for discoverability
Rate limit: Per-cursor to prevent rapid sequential fetches
```
