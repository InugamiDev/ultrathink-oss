# Turso

> SQLite for the edge — libSQL database with embedded replicas and global distribution.

## When to Use
- Edge-first databases (Cloudflare Workers, Vercel Edge, Fly.io)
- Embedded replicas for zero-latency reads
- SQLite compatibility with server-side sync
- Multi-tenant databases (database-per-tenant pattern)

## Core Patterns

### Client Setup
```typescript
import { createClient } from "@libsql/client";

const turso = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
});

// With embedded replica (reads from local SQLite file, writes to remote)
const turso = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
  syncUrl: process.env.TURSO_DATABASE_URL!,  // remote for sync
  syncInterval: 60,  // sync every 60 seconds
});
```

### Queries
```typescript
// Read
const result = await turso.execute("SELECT * FROM users WHERE id = ?", [userId]);
const user = result.rows[0];

// Write
await turso.execute("INSERT INTO users (name, email) VALUES (?, ?)", [name, email]);

// Batch (atomic transaction)
await turso.batch([
  { sql: "INSERT INTO orders (user_id, total) VALUES (?, ?)", args: [userId, total] },
  { sql: "UPDATE users SET order_count = order_count + 1 WHERE id = ?", args: [userId] },
], "write");

// Interactive transaction
const tx = await turso.transaction("write");
try {
  await tx.execute("UPDATE accounts SET balance = balance - ? WHERE id = ?", [amount, from]);
  await tx.execute("UPDATE accounts SET balance = balance + ? WHERE id = ?", [amount, to]);
  await tx.commit();
} catch { await tx.rollback(); }
```

### Key Features
- **Embedded replicas**: Local SQLite file synced from remote — sub-ms reads
- **Database branching**: `turso db create --from-db production` for staging
- **Multi-database**: `turso db create tenant-123` for per-tenant isolation
- **Drizzle integration**: `drizzle(turso)` with full ORM support
- **Extensions**: JSON, FTS5 (full-text search), vector search via `libsql-vector`

### CLI
```bash
turso db create mydb          # Create database
turso db shell mydb           # Interactive SQL shell
turso db tokens create mydb   # Generate auth token
turso db replicate mydb lhr   # Add replica in London
```
