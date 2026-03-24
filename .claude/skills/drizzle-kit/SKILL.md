# Skill: drizzle-kit
> Layer: domain | Category: database

## Triggers
- drizzle-kit, drizzle generate, drizzle migrate, drizzle push, drizzle studio, drizzle introspect, drizzle.config

## Links
- linksTo: drizzle-orm, database-migrations, neon-postgres
- linkedFrom: drizzle-orm

## Overview

Drizzle Kit is the CLI companion to Drizzle ORM. It handles schema migrations, database
introspection, and provides a local studio UI. All commands read from `drizzle.config.ts`.

## drizzle.config.ts

```ts
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  verbose: true,
  strict: true,
});
```

| Field          | Purpose                                          |
|----------------|--------------------------------------------------|
| `dialect`      | `postgresql`, `mysql`, `sqlite`, `turso`, `singlestore` |
| `schema`       | Path(s) to schema files — string or array        |
| `out`          | Directory for generated migration SQL files       |
| `dbCredentials`| Connection URL or host/port/user/password/database |
| `strict`       | Prompt confirmation before destructive changes    |

## Commands

### `drizzle-kit generate`

Compares your schema files against the previous snapshot and generates a SQL migration file.

```bash
npx drizzle-kit generate
# Output: drizzle/0001_initial.sql, drizzle/meta/_journal.json
```

Generated SQL is human-readable and editable before applying.

### `drizzle-kit migrate`

Applies pending migrations from the `out` directory to the database.

```bash
npx drizzle-kit migrate
```

Tracks applied migrations in a `__drizzle_migrations` table. Runs migrations in order
based on the journal. This is the production-safe workflow: generate then migrate.

### `drizzle-kit push`

Pushes schema changes directly to the database without generating migration files.
Ideal for rapid prototyping and local development.

```bash
npx drizzle-kit push
```

**Warning**: skips migration history. Do not use in production pipelines.

### `drizzle-kit pull` (Introspect)

Reads an existing database and generates Drizzle schema files from it.

```bash
npx drizzle-kit pull
# Output: drizzle/schema.ts (generated from live DB)
```

Useful for adopting Drizzle on an existing database or verifying drift.

### `drizzle-kit studio`

Launches a local web UI to browse and edit data.

```bash
npx drizzle-kit studio
# Opens https://local.drizzle.studio
```

### `drizzle-kit check`

Validates that migration snapshots are consistent and not corrupted.

```bash
npx drizzle-kit check
```

## Migration Workflow

```bash
# 1. Edit schema
# 2. Generate migration SQL
npx drizzle-kit generate

# 3. Review the generated SQL in drizzle/XXXX_name.sql
# 4. Apply to database
npx drizzle-kit migrate
```

## Custom Migration Name

```bash
npx drizzle-kit generate --name add_users_table
# Output: drizzle/0002_add_users_table.sql
```

## Programmatic Migration (CI/CD)

```ts
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool);

await migrate(db, { migrationsFolder: "./drizzle" });
await pool.end();
```

## Key Rules

1. **generate + migrate** is the production-safe path. Use `push` only for local dev.
2. Always review generated SQL before applying — Drizzle Kit can produce destructive ALTER statements.
3. Keep `strict: true` in config to get prompted before column drops or table renames.
4. `pull` is one-shot introspection, not a sync tool — use it once when adopting Drizzle.
5. The `drizzle/meta/_journal.json` tracks migration order; do not manually edit it.
6. Commit migration files and snapshots to version control.
