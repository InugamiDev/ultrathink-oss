---
name: edge-functions
description: Edge computing — Vercel Edge Functions, Cloudflare Workers, edge middleware, geo-routing, edge config, runtime limitations
layer: domain
category: backend
triggers:
  - "edge function"
  - "edge runtime"
  - "cloudflare worker"
  - "edge middleware"
  - "geo routing"
  - "edge config"
linksTo:
  - nextjs
  - vercel
  - cloudflare
  - caching
linkedFrom:
  - optimize
  - vercel
  - cloudflare
---

# Edge Functions Skill

## Purpose

Edge functions run at CDN nodes closest to the user with sub-50ms cold starts. Use for auth checks, redirects, A/B testing, geo-routing, and header manipulation.

## Edge vs Node.js Runtime

| Feature | Edge Runtime | Node.js Runtime |
|---------|-------------|-----------------|
| Cold start | < 50ms | 250ms+ |
| Node.js APIs | Subset (no `fs`, `net`) | Full |
| Database | HTTP clients only | TCP + HTTP |
| Max size | 1-4 MB | 50 MB+ |
| npm packages | Web-compatible only | All |

## Vercel Edge API Route

```typescript
// app/api/geo/route.ts
export const runtime = 'edge';

export async function GET(request: Request) {
  const country = request.headers.get('x-vercel-ip-country') ?? 'US';
  const city = request.headers.get('x-vercel-ip-city') ?? 'Unknown';
  return Response.json({ country, city, timestamp: Date.now() });
}
```

## Edge Middleware

```typescript
// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const country = request.geo?.country ?? 'US';

  // Geo-based redirect
  if (pathname === '/' && country === 'DE') {
    return NextResponse.redirect(new URL('/de', request.url));
  }

  // A/B testing
  if (!request.cookies.get('ab-bucket') && pathname === '/pricing') {
    const bucket = Math.random() < 0.5 ? 'control' : 'variant';
    const res = NextResponse.rewrite(new URL(`/pricing/${bucket}`, request.url));
    res.cookies.set('ab-bucket', bucket, { maxAge: 60 * 60 * 24 * 30 });
    return res;
  }

  // Security headers
  const response = NextResponse.next();
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
```

## Vercel Edge Config

```typescript
import { get } from '@vercel/edge-config';
export const runtime = 'edge';

export async function GET() {
  const maintenance = await get<boolean>('maintenance_mode');
  const flags = await get<Record<string, boolean>>('feature_flags');
  if (maintenance) return new Response('Under maintenance', { status: 503 });
  return Response.json({ flags });
}
```

## Edge-Compatible Database Access

```typescript
// Use HTTP-based clients (not TCP) at the edge
import { neon } from '@neondatabase/serverless';
export const runtime = 'edge';

export async function GET() {
  const sql = neon(process.env.DATABASE_URL!);
  const posts = await sql`SELECT * FROM posts WHERE published = true LIMIT 20`;
  return Response.json(posts);
}
```

## Cloudflare Workers

```typescript
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const country = (request as any).cf?.country ?? 'US';
    const cached = await env.MY_KV.get('config', 'json');
    const result = await env.DB.prepare('SELECT * FROM posts LIMIT 10').all();
    return Response.json({ country, posts: result.results, config: cached });
  },
};
```

## Best Practices

1. **Keep bundles small** — 1-4 MB limits are strict
2. **Use HTTP database clients** (Neon serverless, PlanetScale) not TCP
3. **Use Edge Config** for feature flags (sub-ms reads)
4. **Scope middleware matchers** to exclude `_next/static`
5. **Test locally** with `vercel dev` or `wrangler dev`
6. **Don't assume global state** — edge functions are stateless between requests
