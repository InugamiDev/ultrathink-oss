---
name: vercel
description: Vercel deployment, Edge Config, KV, Cron Jobs, Middleware, and platform-specific optimization
layer: domain
category: devops
triggers:
  - "vercel"
  - "vercel deploy"
  - "edge config"
  - "vercel kv"
  - "vercel cron"
  - "vercel middleware"
  - "vercel.json"
inputs: [Next.js application, deployment requirements, edge computing needs]
outputs: [vercel.json configs, middleware, edge functions, cron jobs, deployment scripts]
linksTo: [cicd, monitoring, cloudflare, nextjs]
linkedFrom: [ship, optimize, plan]
preferredNextSkills: [monitoring, cicd, nextjs]
fallbackSkills: [cloudflare, aws]
riskLevel: low
memoryReadPolicy: selective
memoryWritePolicy: none
sideEffects: [deployments, environment variable changes]
---

# Vercel Specialist

## Purpose

Optimize deployments, edge functions, middleware, cron jobs, and platform features on Vercel. This skill covers vercel.json configuration, Edge Config, Vercel KV, middleware patterns, preview deployments, and CI integration.

## Key Patterns

### vercel.json Configuration

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "framework": "nextjs",
  "regions": ["iad1", "sfo1"],
  "crons": [
    {
      "path": "/api/cron/cleanup",
      "schedule": "0 */6 * * *"
    },
    {
      "path": "/api/cron/sync",
      "schedule": "*/15 * * * *"
    }
  ],
  "headers": [
    {
      "source": "/api/(.*)",
      "headers": [
        { "key": "Cache-Control", "value": "no-store" }
      ]
    },
    {
      "source": "/(.*)\\.(.*)$",
      "headers": [
        { "key": "Cache-Control", "value": "public, max-age=31536000, immutable" }
      ]
    }
  ],
  "rewrites": [
    { "source": "/blog/:slug", "destination": "/api/blog/:slug" }
  ],
  "redirects": [
    { "source": "/old-page", "destination": "/new-page", "permanent": true }
  ]
}
```

### Middleware (Edge Runtime)

```typescript
// middleware.ts
import { NextRequest, NextResponse } from "next/server";

export const config = {
  matcher: [
    // Match all paths except static files and _next
    "/((?!_next/static|_next/image|favicon.ico|public/).*)",
  ],
};

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Geo-based routing
  const country = request.geo?.country || "US";

  // A/B testing with cookies
  const bucket = request.cookies.get("ab-bucket")?.value;
  if (!bucket) {
    const newBucket = Math.random() > 0.5 ? "a" : "b";
    const response = NextResponse.next();
    response.cookies.set("ab-bucket", newBucket, {
      httpOnly: true,
      maxAge: 60 * 60 * 24 * 30,
    });
    return response;
  }

  // Rate limiting header
  const ip = request.headers.get("x-forwarded-for") || "unknown";

  // Bot protection
  const ua = request.headers.get("user-agent") || "";
  if (isSuspiciousBot(ua)) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  // Add custom headers
  const response = NextResponse.next();
  response.headers.set("x-country", country);
  return response;
}

function isSuspiciousBot(ua: string): boolean {
  const suspiciousPatterns = [/curl/i, /python-requests/i, /scrapy/i];
  return suspiciousPatterns.some((p) => p.test(ua));
}
```

### Vercel KV (Redis) Usage

```typescript
import { kv } from "@vercel/kv";

// Rate limiting
async function checkRateLimit(ip: string, limit: number, windowSec: number): Promise<boolean> {
  const key = `rate:${ip}`;
  const count = await kv.incr(key);

  if (count === 1) {
    await kv.expire(key, windowSec);
  }

  return count <= limit;
}

// Caching
async function getCachedData<T>(key: string, fetcher: () => Promise<T>, ttl: number): Promise<T> {
  const cached = await kv.get<T>(key);
  if (cached) return cached;

  const fresh = await fetcher();
  await kv.set(key, fresh, { ex: ttl });
  return fresh;
}

// Session storage
async function setSession(sessionId: string, data: object) {
  await kv.set(`session:${sessionId}`, data, { ex: 86400 });
}
```

### Edge Config (Feature Flags)

```typescript
import { get } from "@vercel/edge-config";

// Read feature flags at the edge (ultra-low latency)
export async function isFeatureEnabled(feature: string): Promise<boolean> {
  const flags = await get<Record<string, boolean>>("featureFlags");
  return flags?.[feature] ?? false;
}

// Maintenance mode check in middleware
export async function middleware(request: NextRequest) {
  const maintenance = await get<boolean>("maintenance");
  if (maintenance) {
    return NextResponse.rewrite(new URL("/maintenance", request.url));
  }
  return NextResponse.next();
}
```

### Cron Job Handler

```typescript
// app/api/cron/cleanup/route.ts
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  // Verify the request is from Vercel Cron
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const deleted = await cleanupExpiredSessions();
    return NextResponse.json({ success: true, deleted });
  } catch (error) {
    console.error("Cron cleanup failed:", error);
    return NextResponse.json({ error: "Cleanup failed" }, { status: 500 });
  }
}
```

## Best Practices

### Deployment
- Use preview deployments for every PR
- Set up GitHub integration for automatic deploys
- Use `VERCEL_ENV` to distinguish preview/production
- Configure environment variables per environment (preview, production)
- Use `vercel --prod` only from CI, not locally

### Performance
- Place compute in regions close to your database (set `regions` in vercel.json)
- Use Edge Runtime for latency-sensitive endpoints
- Use Edge Config for feature flags and config (reads in ~1ms)
- Use ISR (Incremental Static Regeneration) for semi-static pages
- Set appropriate `Cache-Control` headers for static assets

### Middleware
- Keep middleware lightweight (it runs on every matching request)
- Use `config.matcher` to limit which paths trigger middleware
- Avoid database calls in middleware; use Edge Config or KV instead
- Return early with `NextResponse.next()` for passthrough

### Cron Jobs
- Always verify the `CRON_SECRET` authorization header
- Keep cron handlers idempotent
- Log outcomes for debugging
- Use the Vercel dashboard to monitor cron execution history

## Common Pitfalls

| Pitfall | Fix |
|---------|-----|
| Middleware running on all paths | Use `config.matcher` to exclude static assets |
| Slow middleware with DB calls | Use Edge Config or Vercel KV instead |
| Missing CRON_SECRET verification | Always check auth header in cron endpoints |
| Environment variable mismatch | Set vars per environment in Vercel dashboard |
| Large serverless function bundles | Use dynamic imports, check with `@vercel/nft` |
| Region mismatch with database | Set `regions` in vercel.json near your DB |

## Examples

### OG Image Generation (Edge)

```typescript
// app/api/og/route.tsx
import { ImageResponse } from "next/og";

export const runtime = "edge";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const title = searchParams.get("title") || "Default Title";

  return new ImageResponse(
    (
      <div style={{ display: "flex", fontSize: 48, background: "#000", color: "#fff", width: "100%", height: "100%", alignItems: "center", justifyContent: "center" }}>
        {title}
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
```

### Vercel CLI Deployment Script

```bash
#!/bin/bash
# Deploy to preview
vercel

# Deploy to production
vercel --prod

# Pull environment variables locally
vercel env pull .env.local

# Link to existing project
vercel link
```
