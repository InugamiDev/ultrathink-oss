# Rate Limiting

> Protect APIs from abuse with token bucket, sliding window, and edge-compatible rate limiting.

## When to Use
- Protecting API routes from abuse or DDoS
- Enforcing per-user or per-IP request quotas
- Adding rate limit headers to HTTP responses
- Edge-compatible limiting (Vercel Edge, Cloudflare Workers)

## Core Patterns

### Upstash Ratelimit (Recommended — Edge-Compatible)
```typescript
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// Sliding window: 10 requests per 10 seconds
const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, "10 s"),
  analytics: true,
  prefix: "api",
});

// Token bucket: refills 5 tokens/sec, max burst 10
const tokenBucket = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.tokenBucket(5, "1 s", 10),
});
```

### Next.js Middleware Rate Limiting
```typescript
// middleware.ts
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { NextResponse, type NextRequest } from "next/server";

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(20, "60 s"),
});

export async function middleware(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") ?? req.ip ?? "anonymous";
  const { success, limit, remaining, reset } = await ratelimit.limit(ip);

  if (!success) {
    return NextResponse.json({ error: "Too many requests" }, {
      status: 429,
      headers: {
        "X-RateLimit-Limit": limit.toString(),
        "X-RateLimit-Remaining": "0",
        "X-RateLimit-Reset": reset.toString(),
        "Retry-After": Math.ceil((reset - Date.now()) / 1000).toString(),
      },
    });
  }

  const res = NextResponse.next();
  res.headers.set("X-RateLimit-Limit", limit.toString());
  res.headers.set("X-RateLimit-Remaining", remaining.toString());
  res.headers.set("X-RateLimit-Reset", reset.toString());
  return res;
}

export const config = { matcher: "/api/:path*" };
```

### API Route Protection (User-Based)
```typescript
// app/api/chat/route.ts
import { auth } from "@/lib/auth";

export async function POST(req: Request) {
  const session = await auth();
  const key = session?.user?.id ?? getIP(req);
  const { success, reset } = await ratelimit.limit(key);

  if (!success) {
    return Response.json(
      { error: "Rate limit exceeded", retryAfter: Math.ceil((reset - Date.now()) / 1000) },
      { status: 429 }
    );
  }
  // ... handle request
}
```

## Key Features
- **Algorithms**: `slidingWindow(tokens, window)` — smooth, no burst spikes; `tokenBucket(refillRate, interval, maxTokens)` — allows controlled bursts; `fixedWindow(tokens, window)` — simplest, boundary spikes possible
- **Identifiers**: IP-based for anonymous, user ID for authenticated, composite `${userId}:${endpoint}` for per-route limits
- **Headers**: Always return `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset` (Unix ms) and `Retry-After` (seconds) on 429
- **Graceful degradation**: Wrap `ratelimit.limit()` in try/catch — allow requests through if Redis is unreachable
- **Edge runtimes**: `@upstash/ratelimit` + `@upstash/redis` work on Vercel Edge, Cloudflare Workers, Deno Deploy (no Node APIs needed)
- **Multi-tier**: Combine global (middleware) + per-route (API handler) limits for layered protection
