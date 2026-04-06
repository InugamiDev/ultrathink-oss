---
name: api-rate-design
description: API rate limiting design — token bucket, sliding window, distributed rate limiting, quota management
layer: domain
category: backend
triggers:
  - "rate limit design"
  - "token bucket"
  - "sliding window"
  - "api quota"
  - "throttling design"
  - "rate limiting architecture"
inputs:
  - "API rate limiting requirements"
  - "Distributed rate limiting architecture needs"
  - "Quota and tier-based limiting design"
  - "Algorithm selection guidance"
outputs:
  - "Rate limiting algorithm implementations"
  - "Distributed rate limiter configurations"
  - "Quota management with tier support"
  - "Rate limit header and response patterns"
linksTo:
  - rate-limiting
  - redis
  - upstash
  - api-designer
linkedFrom:
  - rate-limiting
preferredNextSkills:
  - rate-limiting
  - redis
fallbackSkills:
  - upstash
riskLevel: low
memoryReadPolicy: selective
memoryWritePolicy: none
sideEffects: []
---

# API Rate Limiting Design

## Purpose

Design and implement rate limiting strategies for APIs — token bucket, sliding window, fixed window, and leaky bucket algorithms. Covers distributed rate limiting with Redis, tier-based quota management, and proper rate limit response headers.

## Key Patterns

### Algorithm Comparison

| Algorithm | Best For | Pros | Cons |
|-----------|----------|------|------|
| Fixed Window | Simple APIs | Easy to implement, low memory | Burst at window boundaries |
| Sliding Window Log | Precise limiting | No boundary burst | High memory (stores timestamps) |
| Sliding Window Counter | Most APIs | Low memory, smooth | Slight approximation |
| Token Bucket | Bursty traffic | Allows controlled bursts | Slightly more complex |
| Leaky Bucket | Steady output rate | Smooth, predictable | No burst allowance |

### Token Bucket with Redis

```typescript
// lib/rate-limiter.ts
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  limit: number;
  resetAt: number;     // Unix timestamp (seconds)
  retryAfter?: number; // Seconds until next allowed request
}

// Token bucket: allows burst up to bucket size, refills at steady rate
async function tokenBucket(
  key: string,
  opts: { bucketSize: number; refillRate: number; refillInterval: number }
): Promise<RateLimitResult> {
  const now = Date.now();
  const bucketKey = `rl:tb:${key}`;

  // Lua script for atomic token bucket
  const script = `
    local key = KEYS[1]
    local bucket_size = tonumber(ARGV[1])
    local refill_rate = tonumber(ARGV[2])
    local refill_interval = tonumber(ARGV[3])
    local now = tonumber(ARGV[4])

    local bucket = redis.call('HMGET', key, 'tokens', 'last_refill')
    local tokens = tonumber(bucket[1]) or bucket_size
    local last_refill = tonumber(bucket[2]) or now

    -- Refill tokens based on elapsed time
    local elapsed = now - last_refill
    local refill = math.floor(elapsed / refill_interval) * refill_rate
    tokens = math.min(bucket_size, tokens + refill)
    last_refill = last_refill + math.floor(elapsed / refill_interval) * refill_interval

    local allowed = 0
    if tokens >= 1 then
      tokens = tokens - 1
      allowed = 1
    end

    redis.call('HMSET', key, 'tokens', tokens, 'last_refill', last_refill)
    redis.call('EXPIRE', key, math.ceil(bucket_size / refill_rate * refill_interval / 1000) + 1)

    return {allowed, tokens, last_refill}
  `;

  const [allowed, remaining, lastRefill] = await redis.eval(
    script,
    [bucketKey],
    [opts.bucketSize, opts.refillRate, opts.refillInterval, now]
  ) as [number, number, number];

  const resetAt = Math.ceil((lastRefill + opts.refillInterval) / 1000);

  return {
    allowed: allowed === 1,
    remaining,
    limit: opts.bucketSize,
    resetAt,
    retryAfter: allowed === 1 ? undefined : Math.ceil(opts.refillInterval / 1000),
  };
}
```

### Sliding Window Counter

```typescript
// Sliding window counter — smooth, low memory
async function slidingWindowCounter(
  key: string,
  opts: { limit: number; windowMs: number }
): Promise<RateLimitResult> {
  const now = Date.now();
  const windowKey = `rl:sw:${key}`;
  const currentWindow = Math.floor(now / opts.windowMs);
  const previousWindow = currentWindow - 1;
  const windowProgress = (now % opts.windowMs) / opts.windowMs;

  const currentKey = `${windowKey}:${currentWindow}`;
  const previousKey = `${windowKey}:${previousWindow}`;

  // Get counts for current and previous windows
  const [currentCount, previousCount] = await Promise.all([
    redis.get<number>(currentKey) ?? 0,
    redis.get<number>(previousKey) ?? 0,
  ]);

  // Weighted count: previous window's remaining portion + current window
  const weightedCount =
    (previousCount ?? 0) * (1 - windowProgress) + (currentCount ?? 0);

  if (weightedCount >= opts.limit) {
    return {
      allowed: false,
      remaining: 0,
      limit: opts.limit,
      resetAt: Math.ceil(((currentWindow + 1) * opts.windowMs) / 1000),
      retryAfter: Math.ceil((opts.windowMs * (1 - windowProgress)) / 1000),
    };
  }

  // Increment current window
  await redis
    .pipeline()
    .incr(currentKey)
    .expire(currentKey, Math.ceil((opts.windowMs * 2) / 1000))
    .exec();

  return {
    allowed: true,
    remaining: Math.floor(opts.limit - weightedCount - 1),
    limit: opts.limit,
    resetAt: Math.ceil(((currentWindow + 1) * opts.windowMs) / 1000),
  };
}
```

### Tier-Based Quota Management

```typescript
// lib/quotas.ts
interface TierConfig {
  requestsPerMinute: number;
  requestsPerDay: number;
  burstSize: number;
}

const TIERS: Record<string, TierConfig> = {
  free: {
    requestsPerMinute: 20,
    requestsPerDay: 1_000,
    burstSize: 5,
  },
  pro: {
    requestsPerMinute: 100,
    requestsPerDay: 50_000,
    burstSize: 20,
  },
  enterprise: {
    requestsPerMinute: 1_000,
    requestsPerDay: 1_000_000,
    burstSize: 100,
  },
};

async function checkQuota(
  userId: string,
  tier: keyof typeof TIERS
): Promise<RateLimitResult> {
  const config = TIERS[tier];

  // Check per-minute rate limit (sliding window)
  const minuteResult = await slidingWindowCounter(
    `user:${userId}:minute`,
    { limit: config.requestsPerMinute, windowMs: 60_000 }
  );
  if (!minuteResult.allowed) return minuteResult;

  // Check daily quota (fixed window)
  const dayResult = await slidingWindowCounter(
    `user:${userId}:day`,
    { limit: config.requestsPerDay, windowMs: 86_400_000 }
  );
  if (!dayResult.allowed) return dayResult;

  return minuteResult; // Return the most restrictive remaining
}
```

### Rate Limit Headers

```typescript
// middleware/rate-limit.ts
import { NextRequest, NextResponse } from 'next/server';

export async function rateLimitMiddleware(
  request: NextRequest,
  identifier: string,
  tier: string
): Promise<NextResponse | null> {
  const result = await checkQuota(identifier, tier);

  // Standard rate limit headers (draft-ietf-httpapi-ratelimit-headers)
  const headers = {
    'RateLimit-Limit': String(result.limit),
    'RateLimit-Remaining': String(result.remaining),
    'RateLimit-Reset': String(result.resetAt),
    'RateLimit-Policy': `${result.limit};w=60`, // limit per 60s window
  };

  if (!result.allowed) {
    return NextResponse.json(
      {
        type: 'https://api.example.com/errors/rate-limit-exceeded',
        title: 'Rate Limit Exceeded',
        status: 429,
        detail: `Rate limit of ${result.limit} requests exceeded. Retry after ${result.retryAfter} seconds.`,
        retryAfter: result.retryAfter,
      },
      {
        status: 429,
        headers: {
          ...headers,
          'Retry-After': String(result.retryAfter),
          'Content-Type': 'application/problem+json',
        },
      }
    );
  }

  // Return null to indicate request is allowed; caller adds headers to response
  return null;
}

// Usage in API route
export const GET = withErrorHandling(async (request) => {
  const user = await getAuthenticatedUser(request);

  const blocked = await rateLimitMiddleware(request, user.id, user.tier);
  if (blocked) return blocked;

  const data = await fetchData();
  return NextResponse.json(data);
});
```

### Per-Endpoint Rate Limiting

```typescript
// Different limits for different endpoints
const ENDPOINT_LIMITS: Record<string, { limit: number; windowMs: number }> = {
  'POST /api/auth/login':    { limit: 5,   windowMs: 60_000 },   // Strict: prevent brute force
  'POST /api/auth/register': { limit: 3,   windowMs: 3600_000 }, // Very strict
  'POST /api/upload':        { limit: 10,  windowMs: 60_000 },   // Moderate
  'GET /api/search':         { limit: 30,  windowMs: 60_000 },   // Standard
  'GET /api/*':              { limit: 100, windowMs: 60_000 },    // Default GET
  'POST /api/*':             { limit: 50,  windowMs: 60_000 },    // Default POST
};

function getEndpointLimit(method: string, path: string) {
  const key = `${method} ${path}`;

  // Exact match first
  if (ENDPOINT_LIMITS[key]) return ENDPOINT_LIMITS[key];

  // Wildcard match
  const wildcardKey = `${method} /api/*`;
  return ENDPOINT_LIMITS[wildcardKey] ?? { limit: 60, windowMs: 60_000 };
}
```

### Distributed Rate Limiting with Upstash

```typescript
// Best for serverless environments (Vercel, Cloudflare Workers)
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(100, '1 m'), // 100 requests per minute
  analytics: true,
  prefix: 'api-ratelimit',
});

// Usage
const { success, limit, remaining, reset } = await ratelimit.limit(userId);
```

## Best Practices

1. **Choose algorithm by use case** — Token bucket for APIs that allow bursts, sliding window for steady rate enforcement, fixed window only for simplicity.
2. **Always return rate limit headers** — `RateLimit-Limit`, `RateLimit-Remaining`, `RateLimit-Reset` let clients self-throttle.
3. **Use `Retry-After` on 429 responses** — Clients need to know when to retry, not guess.
4. **Rate limit by multiple dimensions** — Per-user, per-IP, per-endpoint, and per-tier. Apply the most restrictive.
5. **Protect authentication endpoints aggressively** — Login, register, and password reset need strict limits (5-10/min).
6. **Use atomic Redis operations** — Lua scripts or MULTI/EXEC to prevent race conditions between check and increment.
7. **Fail open, not closed** — If Redis is down, allow requests through rather than blocking all users. Log the failure.
8. **Monitor and alert on rate limit hits** — High 429 rates indicate either abuse or limits set too low.

## Common Pitfalls

| Pitfall | Problem | Fix |
|---------|---------|-----|
| Fixed window boundary burst | 2x burst at window boundary (end of one + start of next) | Use sliding window counter instead |
| Rate limiting by IP only | Shared IPs (corporate NAT, VPN) affect all users | Rate limit by authenticated user ID primarily, IP as fallback |
| No rate limit headers | Clients cannot self-throttle, leading to more 429s | Always include `RateLimit-*` headers on every response |
| Non-atomic check-then-increment | Race condition allows burst past limit | Use Redis Lua scripts for atomic check-and-decrement |
| Same limits for all endpoints | Login brute force possible if limits match search API | Use per-endpoint limits, strictest on auth endpoints |
| Hard fail when Redis is down | All API requests blocked | Implement graceful degradation: allow through, log alert |
| No burst tolerance | Legitimate traffic spikes rejected | Use token bucket to allow controlled burst above steady rate |
| Missing rate limit on webhooks | External services can overwhelm your webhook endpoints | Apply rate limits to inbound webhook endpoints too |
