---
name: api-caching
description: API caching strategies — HTTP cache headers, ETag, stale-while-revalidate, CDN caching, ISR
layer: domain
category: backend
triggers:
  - "api caching"
  - "cache control"
  - "etag"
  - "stale while revalidate"
  - "cdn cache"
  - "isr"
  - "cache headers"
inputs:
  - "API endpoints needing cache optimization"
  - "Cache invalidation requirements"
  - "CDN or edge caching configuration needs"
  - "Stale-while-revalidate strategy questions"
outputs:
  - "HTTP cache header configurations"
  - "ETag implementation patterns"
  - "CDN caching strategies"
  - "ISR and on-demand revalidation setups"
linksTo:
  - caching
  - nextjs
  - cloudflare
  - nginx
linkedFrom:
  - caching
preferredNextSkills:
  - caching
  - nextjs
fallbackSkills:
  - cloudflare
riskLevel: low
memoryReadPolicy: selective
memoryWritePolicy: none
sideEffects: []
---

# API Caching Strategies

## Purpose

Design and implement effective API caching at every layer — HTTP cache headers, conditional requests with ETags, stale-while-revalidate patterns, CDN edge caching, and Next.js ISR. Reduces latency, lowers origin load, and improves user experience.

## Key Patterns

### HTTP Cache Headers

**Cache-Control directives:**

```typescript
// Next.js API route with proper cache headers
import { NextRequest, NextResponse } from 'next/server';

// Public, cacheable by CDN and browser
export async function GET(request: NextRequest) {
  const data = await fetchProducts();

  return NextResponse.json(data, {
    headers: {
      // CDN + browser cache for 60s, serve stale up to 1 hour while revalidating
      'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=3600',
    },
  });
}

// Private, user-specific data — no CDN caching
export async function GET(request: NextRequest) {
  const user = await getAuthenticatedUser(request);
  const profile = await fetchProfile(user.id);

  return NextResponse.json(profile, {
    headers: {
      // Browser-only cache, 5 min, must revalidate after
      'Cache-Control': 'private, max-age=300, must-revalidate',
    },
  });
}

// No caching — real-time data
export async function GET() {
  const liveData = await fetchLiveMetrics();

  return NextResponse.json(liveData, {
    headers: {
      'Cache-Control': 'no-store',
    },
  });
}
```

**Cache-Control cheat sheet:**

| Directive | Meaning |
|-----------|---------|
| `public` | CDN and browser can cache |
| `private` | Browser only, no CDN |
| `s-maxage=N` | CDN cache duration (overrides max-age for CDN) |
| `max-age=N` | Browser cache duration in seconds |
| `stale-while-revalidate=N` | Serve stale for N seconds while fetching fresh |
| `stale-if-error=N` | Serve stale for N seconds if origin errors |
| `no-cache` | Must revalidate before using cached version |
| `no-store` | Never cache |
| `must-revalidate` | Do not serve stale after max-age expires |
| `immutable` | Never changes — skip revalidation (use with hashed URLs) |

### ETag / Conditional Requests

**Server-side ETag generation:**

```typescript
import { createHash } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const data = await fetchProducts();
  const body = JSON.stringify(data);

  // Generate ETag from content hash
  const etag = `"${createHash('md5').update(body).digest('hex')}"`;

  // Check If-None-Match header
  const ifNoneMatch = request.headers.get('If-None-Match');
  if (ifNoneMatch === etag) {
    return new NextResponse(null, { status: 304 });
  }

  return new NextResponse(body, {
    headers: {
      'Content-Type': 'application/json',
      'ETag': etag,
      'Cache-Control': 'public, max-age=0, must-revalidate',
    },
  });
}
```

**Weak ETags for semantic equivalence:**

```typescript
// Weak ETag — content is semantically equivalent but may differ in encoding
const weakEtag = `W/"${version}-${lastModified.getTime()}"`;
// Use when minor formatting changes should not invalidate cache
```

### Stale-While-Revalidate Pattern

**Application-level SWR (not HTTP header):**

```typescript
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

async function swrFetch<T>(
  key: string,
  fetcher: () => Promise<T>,
  opts: { maxAge: number; staleWhileRevalidate: number }
): Promise<T> {
  const cached = await redis.get<CacheEntry<T>>(key);
  const now = Date.now();

  if (cached) {
    const age = now - cached.timestamp;

    if (age < opts.maxAge * 1000) {
      // Fresh — return immediately
      return cached.data;
    }

    if (age < (opts.maxAge + opts.staleWhileRevalidate) * 1000) {
      // Stale but within revalidation window — return stale, refresh in background
      refreshCache(key, fetcher).catch(console.error);
      return cached.data;
    }
  }

  // Expired or no cache — fetch fresh
  const data = await fetcher();
  await redis.set(key, { data, timestamp: now } satisfies CacheEntry<T>, {
    ex: opts.maxAge + opts.staleWhileRevalidate,
  });
  return data;
}

async function refreshCache<T>(key: string, fetcher: () => Promise<T>) {
  const data = await fetcher();
  await redis.set(key, { data, timestamp: Date.now() }, { ex: 3600 });
}

// Usage
const products = await swrFetch(
  'products:featured',
  () => db.query.products.findMany({ where: eq(products.featured, true) }),
  { maxAge: 60, staleWhileRevalidate: 300 }
);
```

### CDN Caching with Vercel / Cloudflare

**Vercel edge caching:**

```typescript
// Next.js App Router — cached at Vercel's edge
export const revalidate = 60; // ISR: revalidate every 60 seconds

export default async function ProductsPage() {
  const products = await fetchProducts(); // cached at build + revalidated
  return <ProductList products={products} />;
}

// On-demand revalidation via webhook
// app/api/revalidate/route.ts
import { revalidatePath, revalidateTag } from 'next/cache';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const secret = request.headers.get('x-revalidation-secret');
  if (secret !== process.env.REVALIDATION_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { path, tag } = await request.json();

  if (tag) {
    revalidateTag(tag); // Invalidate all fetches with this tag
  } else if (path) {
    revalidatePath(path); // Invalidate specific page
  }

  return NextResponse.json({ revalidated: true, now: Date.now() });
}
```

**Fetch with cache tags (Next.js):**

```typescript
// Tag-based cache invalidation
const products = await fetch('https://api.example.com/products', {
  next: {
    tags: ['products'],
    revalidate: 3600,
  },
});

// Later, invalidate all product caches
revalidateTag('products');
```

**Cloudflare Cache API (Workers):**

```typescript
export default {
  async fetch(request: Request): Promise<Response> {
    const cache = caches.default;
    const cacheKey = new Request(request.url, request);

    // Check cache
    let response = await cache.match(cacheKey);
    if (response) return response;

    // Fetch from origin
    response = await fetch(request);
    response = new Response(response.body, response);
    response.headers.set('Cache-Control', 'public, s-maxage=600');

    // Store in cache (non-blocking)
    const ctx = (globalThis as any).waitUntil;
    ctx?.(cache.put(cacheKey, response.clone()));

    return response;
  },
};
```

### Cache Invalidation Strategies

**Pattern: Event-driven invalidation:**

```typescript
// When product is updated, invalidate related caches
async function updateProduct(id: string, data: ProductUpdate) {
  await db.update(products).set(data).where(eq(products.id, id));

  // Invalidate specific product cache
  await redis.del(`product:${id}`);

  // Invalidate list caches that include this product
  await redis.del('products:featured');
  await redis.del(`products:category:${data.categoryId}`);

  // Trigger CDN revalidation
  await fetch(`${process.env.NEXT_PUBLIC_URL}/api/revalidate`, {
    method: 'POST',
    headers: {
      'x-revalidation-secret': process.env.REVALIDATION_SECRET!,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ tag: 'products' }),
  });
}
```

**Pattern: Cache key versioning:**

```typescript
// Bust cache by changing key version
const CACHE_VERSION = 'v2';

function cacheKey(resource: string, id: string): string {
  return `${CACHE_VERSION}:${resource}:${id}`;
}
```

### Vary Header — Cache by Request Attributes

```typescript
// Different cached versions for different Accept-Language values
return NextResponse.json(data, {
  headers: {
    'Cache-Control': 'public, s-maxage=3600',
    'Vary': 'Accept-Language, Accept-Encoding',
  },
});
```

## Best Practices

1. **Cache close to the user** — Browser > CDN edge > application cache > database cache. Each layer reduces latency.
2. **Use `s-maxage` for CDN, `max-age` for browser** — Keep CDN cache long, browser cache short so users see updates after CDN revalidation.
3. **Always set `Vary` for personalized responses** — Without it, CDNs serve the wrong cached version to different users.
4. **Use `stale-while-revalidate`** — Users get instant responses while fresh data loads in background.
5. **Hash-based URLs for static assets** — Use `immutable` directive with content-hashed filenames (`style.a1b2c3.css`).
6. **Invalidate explicitly, not by TTL alone** — Event-driven invalidation (on write) is more reliable than hoping TTL expires at the right time.
7. **Monitor cache hit rates** — Track `x-cache: HIT` vs `MISS` in your CDN. Aim for >90% hit rate on static content.
8. **Never cache errors** — Ensure 4xx/5xx responses have `Cache-Control: no-store` to avoid caching failures.

## Common Pitfalls

| Pitfall | Problem | Fix |
|---------|---------|-----|
| Missing `Vary` header | CDN serves cached response for wrong user/language | Add `Vary: Cookie` or `Vary: Authorization` for personalized content |
| Caching authenticated responses on CDN | User A sees User B's data | Use `Cache-Control: private` for auth-dependent responses |
| No cache invalidation strategy | Stale data persists until TTL expires | Implement webhook-based or event-driven invalidation |
| Over-caching POST/PUT responses | Mutations return stale data | Only cache GET requests; bust related GET caches on mutation |
| CDN caches error responses | 500 error served to all users for TTL duration | Set `Cache-Control: no-store` on error responses |
| Cache stampede on expiry | All caches expire simultaneously, hammering origin | Use jitter: add random seconds to TTL, or use SWR pattern |
| Forgetting `no-store` on sensitive data | Browser disk-caches private information | Use `Cache-Control: no-store` for PII, tokens, financial data |
| ISR with slow revalidation | First visitor after TTL gets slow response | Use `stale-while-revalidate` so first visitor still gets stale fast |
