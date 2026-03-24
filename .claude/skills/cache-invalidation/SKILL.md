---
name: cache-invalidation
description: Cache invalidation — TTL, event-driven, cache-aside, write-through, SWR, tag purge
layer: domain
category: backend
triggers:
  - cache invalidation
  - stale cache
  - cache busting
  - cache aside
  - write through
  - stale while revalidate
  - cache purge
  - tag-based invalidation
linksTo:
  - caching
  - redis
  - api-caching
linkedFrom:
  - caching
  - redis
riskLevel: medium
---

# Cache Invalidation

## Overview

Cache invalidation is the process of removing or updating stale cached data when the underlying source of truth changes. It is famously one of the two hard problems in computer science. The goal is to balance freshness (serving current data) against performance (avoiding unnecessary origin fetches).

## When to Use

- Any system with a caching layer (Redis, CDN, in-memory, browser)
- APIs where data freshness requirements vary by endpoint
- E-commerce catalogs, CMS content, user profiles — data that changes but not on every request
- Multi-tier caches (browser -> CDN -> app cache -> database)

## Key Patterns

### Cache-Aside (Lazy Loading)

Application checks cache first; on miss, reads from DB and populates cache.

```typescript
async function getProduct(id: string): Promise<Product> {
  const cacheKey = `product:${id}`;
  const cached = await redis.get(cacheKey);
  if (cached) return JSON.parse(cached);

  const product = await db.query('SELECT * FROM products WHERE id = $1', [id]);
  await redis.setex(cacheKey, 3600, JSON.stringify(product)); // 1h TTL
  return product;
}

async function updateProduct(id: string, data: Partial<Product>) {
  await db.query('UPDATE products SET ... WHERE id = $1', [id]);
  await redis.del(`product:${id}`); // invalidate — next read repopulates
}
```

### Write-Through

Write to cache and DB simultaneously. Cache is always fresh but writes are slower.

```typescript
async function updateProduct(id: string, data: Partial<Product>) {
  const updated = await db.query(
    'UPDATE products SET ... WHERE id = $1 RETURNING *', [id]
  );
  await redis.setex(`product:${id}`, 3600, JSON.stringify(updated));
  return updated;
}
```

### Event-Driven Invalidation

Decouple invalidation from the write path using events.

```typescript
// Publisher (in the write service)
await db.query('UPDATE products SET price = $1 WHERE id = $2', [newPrice, id]);
await eventBus.publish('product.updated', { id, fields: ['price'] });

// Subscriber (cache invalidation worker)
eventBus.subscribe('product.updated', async (event) => {
  await redis.del(`product:${event.id}`);
  await cdn.purgeTag(`product-${event.id}`);
});
```

### Tag-Based Purging (CDN / Vercel)

```typescript
// Set tags when caching
// Next.js revalidateTag example
import { revalidateTag } from 'next/cache';

// In a fetch call
fetch('https://api.example.com/products', {
  next: { tags: ['products', `category-${categoryId}`] },
});

// On mutation — purge all caches with this tag
export async function updateCategory(id: string) {
  await db.updateCategory(id);
  revalidateTag(`category-${id}`);
}
```

### Stale-While-Revalidate (SWR)

Serve stale data immediately while refreshing in the background.

```typescript
// HTTP header approach
// Cache-Control: public, max-age=60, stale-while-revalidate=300

// Application-level SWR
async function getWithSWR<T>(key: string, fetcher: () => Promise<T>, ttl: number, swrWindow: number) {
  const entry = await redis.hgetall(`swr:${key}`);

  if (entry.data) {
    const age = Date.now() - Number(entry.timestamp);
    if (age < ttl * 1000) return JSON.parse(entry.data); // fresh

    if (age < (ttl + swrWindow) * 1000) {
      // stale but within SWR window — return stale, refresh async
      refreshInBackground(key, fetcher, ttl);
      return JSON.parse(entry.data);
    }
  }

  // Cache miss or expired beyond SWR window
  const fresh = await fetcher();
  await redis.hset(`swr:${key}`, { data: JSON.stringify(fresh), timestamp: Date.now() });
  return fresh;
}
```

## Pitfalls

- **Delete vs. update race**: Two concurrent writes can leave stale data. Prefer delete-on-write (cache-aside) over set-on-write unless you use versioning.
- **Thundering herd**: When a popular key expires, hundreds of requests hit the DB simultaneously. Use request coalescing or a lock to let one request repopulate.
- **Multi-layer inconsistency**: Browser cache, CDN, and app cache can all hold different versions. Set consistent TTLs and use `Vary` headers correctly.
- **Forgetting related keys**: Updating a product may require invalidating the product key, the category listing, search results, and recommendation caches. Use tag-based invalidation to group related entries.
- **TTL = 0 is not invalidation**: Zero TTL means "always revalidate," not "never cache." Understand the difference between no-cache and no-store.
