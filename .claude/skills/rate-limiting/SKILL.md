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

## Algorithm Comparison

| Algorithm | Best For | Pros | Cons |
|-----------|----------|------|------|
| Fixed Window | Simple APIs | Easy, low memory | Burst at boundaries |
| Sliding Window Counter | Most APIs | Low memory, smooth | Slight approximation |
| Token Bucket | Bursty traffic | Allows controlled bursts | More complex |
| Leaky Bucket | Steady output rate | Smooth, predictable | No burst allowance |

## Tier-Based Quota Management

```typescript
const TIERS: Record<string, { requestsPerMinute: number; requestsPerDay: number; burstSize: number }> = {
  free:       { requestsPerMinute: 20,    requestsPerDay: 1_000,     burstSize: 5 },
  pro:        { requestsPerMinute: 100,   requestsPerDay: 50_000,    burstSize: 20 },
  enterprise: { requestsPerMinute: 1_000, requestsPerDay: 1_000_000, burstSize: 100 },
};
```

Check per-minute rate limit first, then daily quota. Return the most restrictive result.

## Per-Endpoint Rate Limits

```typescript
const ENDPOINT_LIMITS: Record<string, { limit: number; windowMs: number }> = {
  'POST /api/auth/login':    { limit: 5,   windowMs: 60_000 },
  'POST /api/auth/register': { limit: 3,   windowMs: 3600_000 },
  'POST /api/upload':        { limit: 10,  windowMs: 60_000 },
  'GET /api/search':         { limit: 30,  windowMs: 60_000 },
  'GET /api/*':              { limit: 100, windowMs: 60_000 },
  'POST /api/*':             { limit: 50,  windowMs: 60_000 },
};
```

## Best Practices

1. **Choose algorithm by use case** -- Token bucket for burst-tolerant APIs, sliding window for steady enforcement
2. **Always return rate limit headers** -- `RateLimit-Limit`, `RateLimit-Remaining`, `RateLimit-Reset`
3. **Use `Retry-After` on 429s** -- Clients need to know when to retry
4. **Rate limit by multiple dimensions** -- Per-user, per-IP, per-endpoint, per-tier
5. **Protect auth endpoints aggressively** -- 5-10/min for login, register, password reset
6. **Use atomic Redis operations** -- Lua scripts to prevent race conditions
7. **Fail open** -- If Redis is down, allow requests through rather than blocking all users
8. **Monitor 429 rates** -- High rates indicate abuse or limits set too low
