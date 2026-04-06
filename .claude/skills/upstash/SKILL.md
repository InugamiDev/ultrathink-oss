---
name: upstash
description: Upstash serverless Redis, rate limiting, QStash job scheduling, and Upstash Vector for semantic search — all edge-compatible
layer: domain
category: database
triggers:
  - "upstash"
  - "upstash redis"
  - "upstash ratelimit"
  - "qstash"
  - "upstash vector"
  - "serverless redis"
  - "edge redis"
  - "serverless rate limit"
inputs:
  - Use case (caching, rate limiting, job scheduling, vector search)
  - Runtime environment (Edge, Node.js, serverless)
  - Throughput and latency requirements
outputs:
  - Upstash client configuration
  - Rate limiting middleware
  - QStash job scheduling setup
  - Vector index and query implementation
linksTo:
  - redis
  - caching
  - nextjs
  - vercel
linkedFrom:
  - redis
  - caching
  - authentication
preferredNextSkills:
  - caching
  - nextjs
fallbackSkills:
  - redis
riskLevel: low
memoryReadPolicy: selective
memoryWritePolicy: none
sideEffects:
  - Creates Upstash resources via REST API
---

# Upstash Skill

## Purpose

Implement serverless-native Redis, rate limiting, background job scheduling, and vector search using Upstash. All Upstash clients communicate over HTTP/REST, making them compatible with edge runtimes, Vercel serverless functions, and Cloudflare Workers where persistent TCP connections are not available.

## @upstash/redis — Serverless Redis

```typescript
// lib/upstash.ts
import { Redis } from "@upstash/redis";

export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

// Basic operations — same API as ioredis but over HTTP
await redis.set("user:123", { name: "Jane", plan: "pro" }, { ex: 3600 });
const user = await redis.get<{ name: string; plan: string }>("user:123");

// Pipeline — batches multiple commands into a single HTTP request
const pipe = redis.pipeline();
pipe.incr("page:views");
pipe.expire("page:views", 86400);
pipe.get("page:views");
const results = await pipe.exec();
```

## @upstash/ratelimit — Rate Limiting

```typescript
// lib/ratelimit.ts
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// Sliding window: 10 requests per 10 seconds
export const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, "10 s"),
  analytics: true,
  prefix: "app:ratelimit",
});

// Fixed window variant
export const apiRatelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.fixedWindow(100, "1 m"),
});

// Usage in API route
export async function POST(request: Request) {
  const ip = request.headers.get("x-forwarded-for") ?? "anonymous";
  const { success, limit, remaining, reset } = await ratelimit.limit(ip);

  if (!success) {
    return Response.json({ error: "Rate limited" }, {
      status: 429,
      headers: {
        "X-RateLimit-Limit": String(limit),
        "X-RateLimit-Remaining": String(remaining),
        "X-RateLimit-Reset": String(reset),
      },
    });
  }

  // Process request...
}
```

## QStash — Background Jobs and Scheduling

```typescript
// lib/qstash.ts
import { Client } from "@upstash/qstash";

const qstash = new Client({ token: process.env.QSTASH_TOKEN! });

// Publish a one-time background job
await qstash.publishJSON({
  url: "https://myapp.com/api/jobs/send-email",
  body: { userId: "user_123", template: "welcome" },
  retries: 3,
  delay: "10s",
});

// Schedule a recurring job (cron syntax)
await qstash.schedules.create({
  destination: "https://myapp.com/api/jobs/cleanup",
  cron: "0 3 * * *", // Daily at 3 AM
  body: JSON.stringify({ type: "expired-sessions" }),
});

// Job handler with signature verification
// app/api/jobs/send-email/route.ts
import { verifySignatureAppRouter } from "@upstash/qstash/nextjs";

async function handler(request: Request) {
  const body = await request.json();
  await sendEmail(body.userId, body.template);
  return Response.json({ ok: true });
}

export const POST = verifySignatureAppRouter(handler);
```

## Upstash Vector — Semantic Search

```typescript
// lib/vector.ts
import { Index } from "@upstash/vector";

const index = new Index({
  url: process.env.UPSTASH_VECTOR_REST_URL!,
  token: process.env.UPSTASH_VECTOR_REST_TOKEN!,
});

// Upsert vectors (with metadata for filtering)
await index.upsert([
  { id: "doc_1", vector: embedding, metadata: { title: "Guide", category: "docs" } },
  { id: "doc_2", vector: embedding2, metadata: { title: "FAQ", category: "support" } },
]);

// Query by vector similarity
const results = await index.query({
  vector: queryEmbedding,
  topK: 5,
  includeMetadata: true,
  filter: "category = 'docs'",
});

// Upsert with raw text (uses built-in embedding model)
await index.upsert([
  { id: "doc_3", data: "How to reset your password", metadata: { category: "support" } },
]);

// Query with raw text
const textResults = await index.query({
  data: "password recovery",
  topK: 5,
  includeMetadata: true,
});
```

## Environment Variables

```bash
# Redis
UPSTASH_REDIS_REST_URL="https://us1-xxx.upstash.io"
UPSTASH_REDIS_REST_TOKEN="AXxxxxxxxxxxxx"

# QStash
QSTASH_TOKEN="eyJxxxxxxxxxxxx"
QSTASH_CURRENT_SIGNING_KEY="sig_xxxxx"
QSTASH_NEXT_SIGNING_KEY="sig_xxxxx"

# Vector
UPSTASH_VECTOR_REST_URL="https://xxx-vector.upstash.io"
UPSTASH_VECTOR_REST_TOKEN="AXxxxxxxxxxxxx"
```

## Best Practices

1. **Use `Redis.fromEnv()`** -- reads `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` automatically
2. **Enable ratelimit analytics** -- track limit hits in the Upstash console
3. **Always verify QStash signatures** -- prevents unauthorized job execution
4. **Use pipelines for batch operations** -- reduces HTTP round trips
5. **Set TTLs on all cache keys** -- serverless Redis bills per command; stale keys waste money
6. **Use built-in embedding on Vector** -- avoids a separate OpenAI call for simple use cases

## Common Pitfalls

| Pitfall | Fix |
|---------|-----|
| Missing QStash signature verification | Wrap handlers with `verifySignatureAppRouter` |
| Rate limiter prefix collisions | Use unique `prefix` per limiter instance |
| Large payloads in QStash | Keep body under 500KB; store large data in Redis, pass the key |
| Vector dimension mismatch | Ensure query vector matches index dimension (set at creation) |
| No error handling on Redis calls | Wrap in try/catch; degrade gracefully when Upstash is unreachable |
