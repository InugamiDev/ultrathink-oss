# Neon

> Serverless Postgres — autoscaling, branching, and HTTP-accessible with zero cold starts.

## When to Use
- Serverless/edge Postgres (Vercel, Cloudflare Workers, Lambda)
- Branch-based dev workflows (preview branches per PR)
- Postgres with pgvector (AI embeddings) or pg_trgm (fuzzy search)
- Connection pooling without external infrastructure

## Core Patterns

### Client Setup
```typescript
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL!);

// Single query — tagged template (returns rows directly)
const users = await sql`SELECT * FROM users WHERE id = ${userId}`;

// Parameterized
const results = await sql`
  SELECT * FROM posts WHERE title ILIKE ${"%" + query + "%"} LIMIT ${limit}
`;
```

### Transactions
```typescript
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL!);
const tx = sql.transaction([
  sql`UPDATE accounts SET balance = balance - ${amount} WHERE id = ${from}`,
  sql`UPDATE accounts SET balance = balance + ${amount} WHERE id = ${to}`,
]);
await tx; // atomic — all or nothing
```

### WebSocket (Long-lived / Node.js)
```typescript
import { Pool } from "@neondatabase/serverless";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const { rows } = await pool.query("SELECT * FROM users WHERE id = $1", [userId]);
await pool.end();
```

### Drizzle Integration
```typescript
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql);
const users = await db.select().from(usersTable).where(eq(usersTable.id, id));
```

### Prisma Integration
```prisma
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")    // pooled connection
  directUrl = env("DIRECT_URL")      // direct for migrations
}
```

## Key Features
- **Branching**: `neonctl branches create --name preview/pr-42` — instant DB copies for dev/preview
- **Autoscaling**: Scales compute 0.25–8 CU; scales to zero on inactivity
- **Connection pooling**: Built-in PgBouncer — use pooled URL for serverless
- **pg_trgm**: `CREATE EXTENSION pg_trgm;` — fuzzy text search with GIN indexes
- **pgvector**: `CREATE EXTENSION vector;` — embeddings with HNSW/IVFFlat indexes
- **HTTP driver**: Stateless SQL over HTTPS — ideal for edge/serverless (one round-trip per query)

### CLI
```bash
neonctl projects create --name myapp     # Create project
neonctl branches create --name staging   # Branch from main
neonctl branches reset staging           # Reset branch to parent
neonctl connection-string --branch main  # Get connection URL
```
