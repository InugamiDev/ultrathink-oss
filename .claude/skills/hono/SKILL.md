# Hono

> Ultrafast web framework for the edge — Cloudflare Workers, Deno, Bun, Node.js, AWS Lambda.

## When to Use
- Building APIs on edge runtimes (Cloudflare Workers, Vercel Edge)
- Lightweight REST/RPC servers with minimal overhead
- Multi-runtime backends (same code on Node, Bun, Deno, Lambda)
- Type-safe API routes with RPC client

## Core Patterns

### Basic App
```typescript
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { zValidator } from "@hono/zod-validator";

const app = new Hono()
  .use("*", logger())
  .use("/api/*", cors());

app.get("/", (c) => c.json({ status: "ok" }));

app.post("/users", zValidator("json", CreateUserSchema), async (c) => {
  const data = c.req.valid("json");
  const user = await createUser(data);
  return c.json(user, 201);
});

export default app; // Works on any runtime
```

### RPC Client (End-to-End Type Safety)
```typescript
import { hc } from "hono/client";
import type { AppType } from "../server";

const client = hc<AppType>("http://localhost:3000");
const res = await client.users.$post({ json: { name: "Inu" } });
// Fully typed request and response
```

### Key Features
- **Middleware**: `cors()`, `logger()`, `bearerAuth()`, `compress()`, `secureHeaders()`
- **Validation**: `@hono/zod-validator` for body/query/param validation
- **Grouping**: `app.route("/api/v1", v1Routes)` for modular routing
- **Context**: `c.req`, `c.json()`, `c.text()`, `c.html()`, `c.redirect()`
- **Variables**: `c.set("user", user)` / `c.get("user")` for request-scoped state
- **Streaming**: `c.stream()` and `c.streamText()` for SSE/streaming responses
- **Testing**: `app.request("/path")` returns Response — no HTTP server needed

### Deployment Targets
- Cloudflare Workers: `wrangler deploy`
- Vercel Edge: export as edge function
- Bun/Node: `Bun.serve({ fetch: app.fetch })` or `@hono/node-server`
- AWS Lambda: `@hono/aws-lambda`
