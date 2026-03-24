---
name: cloudflare
description: Cloudflare Workers, Pages, D1, R2, KV, Durable Objects, DNS, and edge computing patterns
layer: domain
category: devops
triggers:
  - "cloudflare"
  - "workers"
  - "cloudflare pages"
  - "d1"
  - "r2"
  - "kv"
  - "durable objects"
  - "edge function"
  - "wrangler"
inputs: [application requirements, edge computing needs, storage requirements]
outputs: [Worker scripts, wrangler configs, D1 schemas, R2 policies, DNS configs]
linksTo: [nginx, terraform, monitoring, authentication]
linkedFrom: [ship, optimize, caching]
preferredNextSkills: [monitoring, authentication, terraform]
fallbackSkills: [vercel, aws]
riskLevel: low
memoryReadPolicy: selective
memoryWritePolicy: none
sideEffects: [edge deployments, DNS changes, storage writes]
---

# Cloudflare Specialist

## Purpose

Design and implement edge-first applications using the Cloudflare platform. This skill covers Workers, Pages, D1 (SQLite at the edge), R2 (object storage), KV (key-value), Durable Objects, DNS management, and performance optimization patterns.

## Key Patterns

### Worker with Multiple Bindings

```typescript
// src/index.ts
export interface Env {
  DB: D1Database;
  KV: KVNamespace;
  R2: R2Bucket;
  RATE_LIMITER: DurableObjectNamespace;
  API_KEY: string;
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    try {
      if (url.pathname.startsWith("/api/")) {
        return handleAPI(request, env, ctx);
      }
      return new Response("Not Found", { status: 404 });
    } catch (error) {
      console.error("Worker error:", error);
      return new Response("Internal Server Error", { status: 500 });
    }
  },
} satisfies ExportedHandler<Env>;

async function handleAPI(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
  // Check KV cache first
  const cacheKey = new URL(request.url).pathname;
  const cached = await env.KV.get(cacheKey);
  if (cached) {
    return new Response(cached, {
      headers: { "Content-Type": "application/json", "X-Cache": "HIT" },
    });
  }

  // Query D1
  const result = await env.DB.prepare("SELECT * FROM posts WHERE published = 1 LIMIT 20").all();

  const json = JSON.stringify(result.results);

  // Cache in KV with TTL
  ctx.waitUntil(env.KV.put(cacheKey, json, { expirationTtl: 300 }));

  return new Response(json, {
    headers: { "Content-Type": "application/json", "X-Cache": "MISS" },
  });
}
```

### wrangler.toml Configuration

```toml
name = "my-app"
main = "src/index.ts"
compatibility_date = "2024-12-01"

[vars]
ENVIRONMENT = "production"

[[d1_databases]]
binding = "DB"
database_name = "my-app-db"
database_id = "xxx-xxx-xxx"

[[kv_namespaces]]
binding = "KV"
id = "xxx-xxx-xxx"

[[r2_buckets]]
binding = "R2"
bucket_name = "my-app-uploads"

[[durable_objects.bindings]]
name = "RATE_LIMITER"
class_name = "RateLimiter"

[[migrations]]
tag = "v1"
new_classes = ["RateLimiter"]

[triggers]
crons = ["*/5 * * * *"]
```

### D1 Database Patterns

```typescript
// Parameterized queries (always use bind parameters)
const user = await env.DB.prepare("SELECT * FROM users WHERE id = ?").bind(userId).first();

// Batch operations (single round trip)
const results = await env.DB.batch([
  env.DB.prepare("INSERT INTO orders (user_id, total) VALUES (?, ?)").bind(userId, total),
  env.DB.prepare("UPDATE inventory SET stock = stock - ? WHERE product_id = ?").bind(qty, productId),
]);

// Migrations
// wrangler d1 migrations create my-app-db create_users
// migrations/0001_create_users.sql
/*
CREATE TABLE users (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX idx_users_email ON users(email);
*/
```

### Durable Objects (Rate Limiter)

```typescript
export class RateLimiter implements DurableObject {
  private state: DurableObjectState;
  private requests: Map<string, number[]> = new Map();

  constructor(state: DurableObjectState, env: Env) {
    this.state = state;
  }

  async fetch(request: Request): Promise<Response> {
    const ip = request.headers.get("CF-Connecting-IP") || "unknown";
    const now = Date.now();
    const windowMs = 60_000; // 1 minute
    const maxRequests = 100;

    const timestamps = this.requests.get(ip) || [];
    const recent = timestamps.filter((t) => now - t < windowMs);

    if (recent.length >= maxRequests) {
      return new Response("Rate limit exceeded", {
        status: 429,
        headers: { "Retry-After": "60" },
      });
    }

    recent.push(now);
    this.requests.set(ip, recent);

    return new Response("OK", { status: 200 });
  }
}
```

### R2 Upload Pattern

```typescript
async function handleUpload(request: Request, env: Env): Promise<Response> {
  const formData = await request.formData();
  const file = formData.get("file") as File;

  if (!file) return new Response("No file", { status: 400 });

  const key = `uploads/${Date.now()}-${file.name}`;
  await env.R2.put(key, file.stream(), {
    httpMetadata: { contentType: file.type },
    customMetadata: { originalName: file.name },
  });

  return Response.json({ key, url: `/files/${key}` });
}
```

## Best Practices

### Performance
- Use KV for read-heavy data with eventual consistency tolerance
- Use D1 for relational data that needs consistency
- Use R2 for large objects (images, files, backups)
- Use Durable Objects for coordination and stateful logic
- Leverage `ctx.waitUntil()` for non-blocking async work (analytics, caching)
- Use `Cache API` for computed responses

### Security
- Always bind parameters in D1 queries (prevent SQL injection)
- Validate request origins with `request.headers.get("Origin")`
- Use `wrangler secret` for API keys, never `.env` files
- Implement rate limiting with Durable Objects or the Rate Limiting API
- Set CORS headers explicitly

### D1 Optimization
- Keep queries simple; D1 runs SQLite at the edge
- Use batch operations to minimize round trips
- Create indexes for frequently queried columns
- Use `RETURNING` clause to avoid extra reads after writes

### Deployment
- Use `wrangler deploy` with `--env` for staging vs production
- Test locally with `wrangler dev`
- Use `wrangler tail` for real-time log streaming
- Set up preview environments for PRs

## Common Pitfalls

| Pitfall | Fix |
|---------|-----|
| String interpolation in D1 queries | Always use `.bind()` parameters |
| Ignoring `ctx.waitUntil()` | Use it for fire-and-forget async work |
| KV reads in hot loops | Batch reads or use Cache API |
| Large Worker bundle | Use dynamic imports, tree shake |
| No error handling | Wrap handler in try/catch, log errors |
| Missing CORS headers | Add explicit `Access-Control-*` headers |

## Examples

### Cron Trigger (Scheduled Worker)

```typescript
export default {
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
    // Runs every 5 minutes per wrangler.toml crons config
    const staleItems = await env.DB.prepare(
      "SELECT id FROM cache_entries WHERE expires_at < datetime('now')"
    ).all();

    if (staleItems.results.length > 0) {
      const ids = staleItems.results.map((r) => r.id);
      await env.DB.prepare(
        `DELETE FROM cache_entries WHERE id IN (${ids.map(() => "?").join(",")})`
      ).bind(...ids).run();
    }
  },
} satisfies ExportedHandler<Env>;
```

### Pages Functions (API Routes)

```typescript
// functions/api/posts.ts (Cloudflare Pages Functions)
export const onRequestGet: PagesFunction<Env> = async (context) => {
  const posts = await context.env.DB.prepare("SELECT * FROM posts LIMIT 20").all();
  return Response.json(posts.results);
};
```
