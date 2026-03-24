---
name: redis
description: Redis data structures, caching patterns, pub/sub, rate limiting, and session management
layer: domain
category: database
triggers:
  - "redis"
  - "caching"
  - "rate limiting"
  - "pub/sub"
  - "session store"
  - "redis cache"
  - "distributed lock"
inputs:
  - use_case: Caching, rate limiting, pub/sub, session management, queues
  - requirements: TTL policies, data structures, clustering needs
  - client: ioredis | redis (node-redis) | upstash (optional)
outputs:
  - redis_client: Client configuration and connection setup
  - cache_patterns: Caching strategies with invalidation
  - data_structures: Appropriate Redis data structure recommendations
  - rate_limiter: Rate limiting implementation
linksTo:
  - caching
  - nodejs
  - microservices
  - message-queues
linkedFrom:
  - caching
  - authentication
  - ecommerce
preferredNextSkills:
  - caching
  - nodejs
fallbackSkills:
  - caching
riskLevel: low
memoryReadPolicy: selective
memoryWritePolicy: none
sideEffects: []
---

# Redis Skill

## Purpose

Implement Redis-backed caching, rate limiting, pub/sub messaging, session management, and distributed locks. This skill covers Redis data structures, caching patterns with proper invalidation, and serverless-compatible clients like Upstash. Redis is not just a cache -- it is a versatile data structure server.

## Key Concepts

### Data Structure Selection

```
STRING:   Simple key-value. Counters, cache entries, session data.
          SET key "value" EX 3600

HASH:     Object-like fields. User profiles, settings, product details.
          HSET user:123 name "Jane" email "jane@example.com"

LIST:     Ordered collection. Activity feeds, queues, recent items.
          LPUSH feed:user:123 "posted a comment"

SET:      Unique collection. Tags, followers, online users.
          SADD tags:post:456 "react" "nextjs" "typescript"

SORTED SET: Ranked collection. Leaderboards, rate limiting, priority queues.
            ZADD leaderboard 1500 "user:123"

STREAM:   Append-only log. Event sourcing, message queues.
          XADD events * type "order.created" orderId "789"
```

### When to Use Redis vs. Database

```
USE REDIS:
  - Data that changes frequently and is read often (cache)
  - Temporary data with TTL (sessions, OTP codes, rate limits)
  - Real-time features (pub/sub, presence, typing indicators)
  - Counters and aggregations (view counts, rate limits)
  - Distributed locks (prevent concurrent operations)

USE DATABASE:
  - Source of truth (orders, users, products)
  - Complex queries (joins, aggregations, full-text search)
  - Data that must survive restarts without rebuild
  - Relational data with integrity constraints
```

## Patterns

### Client Setup

```typescript
// lib/redis.ts (ioredis)
import Redis from 'ioredis';

export const redis = new Redis(process.env.REDIS_URL!, {
  maxRetriesPerRequest: 3,
  retryStrategy(times) {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
  lazyConnect: true,
});

// Upstash (serverless-compatible)
import { Redis } from '@upstash/redis';
export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});
```

### Cache-Aside Pattern

```typescript
async function getCachedProduct(id: string): Promise<Product> {
  const cacheKey = `product:${id}`;

  // Try cache first
  const cached = await redis.get(cacheKey);
  if (cached) return JSON.parse(cached);

  // Cache miss: fetch from database
  const product = await db.product.findUnique({ where: { id } });
  if (!product) throw new NotFoundError('Product', id);

  // Store in cache with TTL
  await redis.set(cacheKey, JSON.stringify(product), 'EX', 3600); // 1 hour

  return product;
}

// Invalidate on update
async function updateProduct(id: string, data: Partial<Product>) {
  const product = await db.product.update({ where: { id }, data });
  await redis.del(`product:${id}`);
  return product;
}
```

### Rate Limiter (Sliding Window)

```typescript
async function rateLimit(
  key: string,
  limit: number,
  windowSeconds: number,
): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
  const now = Date.now();
  const windowStart = now - windowSeconds * 1000;
  const redisKey = `rate:${key}`;

  // Use sorted set: score = timestamp, member = unique request ID
  const pipe = redis.pipeline();
  pipe.zremrangebyscore(redisKey, 0, windowStart);  // Remove expired
  pipe.zadd(redisKey, now, `${now}:${Math.random()}`);  // Add current
  pipe.zcard(redisKey);  // Count in window
  pipe.expire(redisKey, windowSeconds);  // Set TTL

  const results = await pipe.exec();
  const count = results![2][1] as number;

  return {
    allowed: count <= limit,
    remaining: Math.max(0, limit - count),
    resetAt: now + windowSeconds * 1000,
  };
}

// Usage in middleware
const { allowed, remaining, resetAt } = await rateLimit(
  `api:${userId}`,
  100,  // 100 requests
  60,   // per 60 seconds
);

if (!allowed) {
  return new Response('Rate limit exceeded', {
    status: 429,
    headers: {
      'X-RateLimit-Limit': '100',
      'X-RateLimit-Remaining': String(remaining),
      'X-RateLimit-Reset': String(Math.ceil(resetAt / 1000)),
      'Retry-After': String(Math.ceil((resetAt - Date.now()) / 1000)),
    },
  });
}
```

### Distributed Lock

```typescript
async function acquireLock(
  key: string,
  ttlMs: number = 10_000,
): Promise<string | null> {
  const lockId = crypto.randomUUID();
  const acquired = await redis.set(
    `lock:${key}`,
    lockId,
    'PX', ttlMs,
    'NX',  // Only set if not exists
  );
  return acquired ? lockId : null;
}

async function releaseLock(key: string, lockId: string): Promise<boolean> {
  // Lua script ensures atomicity: only delete if we own the lock
  const script = `
    if redis.call("get", KEYS[1]) == ARGV[1] then
      return redis.call("del", KEYS[1])
    else
      return 0
    end
  `;
  const result = await redis.eval(script, 1, `lock:${key}`, lockId);
  return result === 1;
}

// Usage
const lockId = await acquireLock(`order:${orderId}`);
if (!lockId) throw new Error('Could not acquire lock');
try {
  await processOrder(orderId);
} finally {
  await releaseLock(`order:${orderId}`, lockId);
}
```

### Pub/Sub

```typescript
// Publisher
await redis.publish('notifications', JSON.stringify({
  type: 'order.shipped',
  userId: 'user_123',
  orderId: 'order_456',
}));

// Subscriber (separate connection required)
const subscriber = new Redis(process.env.REDIS_URL!);
subscriber.subscribe('notifications', (err) => {
  if (err) console.error('Subscribe error:', err);
});

subscriber.on('message', (channel, message) => {
  const event = JSON.parse(message);
  console.log(`[${channel}]`, event);
});
```

## Best Practices

1. **Always set TTL on cache keys** -- keys without expiry grow forever and fill memory
2. **Use pipelines for multiple commands** -- reduces round trips from N to 1
3. **Separate connections for pub/sub** -- subscriber connections are blocked; use a dedicated client
4. **Use Lua scripts for atomic operations** -- multi-step operations must be atomic
5. **Namespace your keys** -- `product:123`, `rate:user:456`, `session:abc` not just `123`
6. **Handle connection failures** -- Redis may be temporarily unavailable; degrade gracefully
7. **Monitor memory usage** -- set `maxmemory` and `maxmemory-policy` (e.g., `allkeys-lru`)
8. **Use JSON.stringify/parse consistently** -- Redis stores strings; serialize and deserialize carefully
9. **Do not store large objects** -- Redis is fast for small values; large blobs belong in object storage
10. **Use Upstash for serverless** -- traditional Redis connections do not work well with serverless functions

## Common Pitfalls

| Pitfall | Impact | Fix |
|---------|--------|-----|
| No TTL on cache keys | Memory grows unbounded | Always set `EX` or `PX` on SET |
| Cache stampede | All requests hit DB at once on expiry | Use lock or stale-while-revalidate |
| Hot key problem | Single key overwhelmed | Shard across multiple keys |
| Forgetting to invalidate | Stale data served to users | Delete cache on write, use pub/sub |
| Serverless + persistent connections | Connection exhaustion | Use Upstash REST or connection pooling |
| Storing PII without encryption | Compliance violation | Encrypt sensitive cache values |
