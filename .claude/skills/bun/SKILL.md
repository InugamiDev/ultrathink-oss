# Bun

> All-in-one JavaScript runtime — bundler, transpiler, package manager, test runner.

## When to Use
- Fast package installs (replaces npm/yarn/pnpm)
- Running TypeScript directly without build step
- Bundling for production
- Fast test runner (replaces Jest/Vitest for simple cases)
- SQLite built-in, HTTP server, file I/O

## Core Patterns

### Package Management
```bash
bun install              # Install deps (faster than npm)
bun add zod hono         # Add packages
bun add -d vitest        # Add dev dependency
bun remove lodash        # Remove package
bun update               # Update all deps
bunx create-next-app     # npx equivalent
```

### Runtime
```typescript
// Run any .ts/.tsx/.js file directly
// $ bun run server.ts

// Built-in HTTP server (faster than Node http)
Bun.serve({
  port: 3000,
  fetch(req) {
    const url = new URL(req.url);
    if (url.pathname === "/api/health") {
      return Response.json({ status: "ok" });
    }
    return new Response("Not found", { status: 404 });
  },
});

// Built-in SQLite
import { Database } from "bun:sqlite";
const db = new Database("app.db");
db.run("CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY, name TEXT)");
const users = db.query("SELECT * FROM users").all();

// File I/O (faster than fs)
const file = Bun.file("data.json");
const data = await file.json();
await Bun.write("output.txt", "hello");

// Shell (bun sh)
import { $ } from "bun";
const result = await $`ls -la`.text();
```

### Testing
```typescript
// Uses Jest-compatible API
import { test, expect, describe } from "bun:test";

describe("math", () => {
  test("adds", () => {
    expect(1 + 1).toBe(2);
  });
});
// Run: bun test
```

### Key Conventions
- **bun.lockb**: Binary lockfile (faster parsing than JSON)
- **Workspaces**: Same as npm workspaces in package.json
- **Environment**: `Bun.env.DATABASE_URL` (auto-loads .env)
- **Macros**: `import { thing } from "./data" with { type: "macro" }` — runs at bundle time
- **Node compat**: 99%+ Node.js API compatibility, drop-in replacement
