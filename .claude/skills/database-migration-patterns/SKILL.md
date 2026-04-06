---
name: database-migration-patterns
description: Database migration strategies — zero-downtime migrations, expand-contract, backfill, and rollback patterns.
layer: utility
category: database
triggers:
  - "migration pattern"
  - "zero downtime migration"
  - "expand contract"
  - "schema migration"
  - "backfill"
inputs:
  - "Schema change requirements"
  - "Zero-downtime deployment constraints"
  - "Data backfill specifications"
  - "Rollback planning questions"
outputs:
  - "Step-by-step migration plans"
  - "Expand-contract migration sequences"
  - "Backfill scripts with batching"
  - "Rollback procedures and verification queries"
linksTo:
  - postgresql
  - migration-planner
  - database-optimization
linkedFrom: []
riskLevel: high
memoryReadPolicy: selective
memoryWritePolicy: none
sideEffects: []
---

# Database Migration Patterns

## Purpose

Guide safe, zero-downtime database schema migrations for production systems. Covers the expand-contract pattern, safe column operations, backfill strategies, index management, and rollback procedures. Focused on PostgreSQL but principles apply broadly.

## Key Patterns

### Expand-Contract Pattern

The gold standard for zero-downtime migrations. Every migration goes through three phases:

```
Phase 1 — EXPAND:   Add new structure alongside old (backward compatible)
Phase 2 — MIGRATE:  Backfill data, update application code to use new structure
Phase 3 — CONTRACT: Remove old structure once fully migrated
```

**Example: Renaming a column** (`email` -> `email_address`):

```sql
-- Phase 1: EXPAND — Add new column
ALTER TABLE users ADD COLUMN email_address TEXT;

-- Phase 2: MIGRATE — Backfill + dual-write
-- a) Backfill existing rows
UPDATE users SET email_address = email WHERE email_address IS NULL;
-- b) Deploy app code that writes to BOTH columns
-- c) Add trigger to keep columns in sync during transition
CREATE OR REPLACE FUNCTION sync_email_columns()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.email_address IS NULL THEN
    NEW.email_address := NEW.email;
  END IF;
  IF NEW.email IS NULL THEN
    NEW.email := NEW.email_address;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_sync_email
  BEFORE INSERT OR UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION sync_email_columns();

-- Phase 3: CONTRACT — Remove old column (after all code uses email_address)
DROP TRIGGER trg_sync_email ON users;
DROP FUNCTION sync_email_columns();
ALTER TABLE users DROP COLUMN email;
```

### Safe Column Operations

**Adding a column** (safe):
```sql
-- Safe: adds column with no default (instant in PG 11+)
ALTER TABLE orders ADD COLUMN tracking_number TEXT;

-- Safe in PG 11+: default value does not rewrite table
ALTER TABLE orders ADD COLUMN status TEXT NOT NULL DEFAULT 'pending';
```

**Adding NOT NULL constraint** (careful):
```sql
-- UNSAFE: Scans entire table, holds ACCESS EXCLUSIVE lock
ALTER TABLE orders ALTER COLUMN status SET NOT NULL;

-- SAFE: Use a CHECK constraint with NOT VALID, then validate separately
ALTER TABLE orders ADD CONSTRAINT orders_status_not_null
  CHECK (status IS NOT NULL) NOT VALID;

-- Later (takes ShareUpdateExclusiveLock, allows reads + writes):
ALTER TABLE orders VALIDATE CONSTRAINT orders_status_not_null;
```

**Changing column type** (dangerous — use expand-contract):
```sql
-- NEVER do this on a large table:
-- ALTER TABLE users ALTER COLUMN age TYPE bigint;
-- This rewrites the entire table with ACCESS EXCLUSIVE lock

-- Instead, use expand-contract:
-- 1) Add new column
ALTER TABLE users ADD COLUMN age_v2 BIGINT;
-- 2) Backfill
UPDATE users SET age_v2 = age WHERE age_v2 IS NULL;
-- 3) Swap in application code
-- 4) Drop old column
ALTER TABLE users DROP COLUMN age;
ALTER TABLE users RENAME COLUMN age_v2 TO age;
```

### Safe Index Creation

```sql
-- NEVER: blocks writes for the entire build duration
-- CREATE INDEX idx_orders_status ON orders(status);

-- ALWAYS: concurrent index creation (allows reads + writes)
CREATE INDEX CONCURRENTLY idx_orders_status ON orders(status);

-- Check for invalid indexes after concurrent creation
SELECT indexrelid::regclass, indisvalid
FROM pg_index
WHERE NOT indisvalid;

-- If invalid, drop and recreate
DROP INDEX CONCURRENTLY idx_orders_status;
CREATE INDEX CONCURRENTLY idx_orders_status ON orders(status);
```

### Backfill Strategies

**Batched backfill** — Avoid long-running transactions:

```sql
-- Batch update with ctid-based pagination (PostgreSQL)
DO $$
DECLARE
  batch_size INT := 10000;
  affected INT;
BEGIN
  LOOP
    UPDATE users
    SET email_address = email
    WHERE email_address IS NULL
      AND ctid IN (
        SELECT ctid FROM users
        WHERE email_address IS NULL
        LIMIT batch_size
        FOR UPDATE SKIP LOCKED
      );

    GET DIAGNOSTICS affected = ROW_COUNT;
    RAISE NOTICE 'Updated % rows', affected;

    IF affected = 0 THEN
      EXIT;
    END IF;

    -- Brief pause to reduce lock contention
    PERFORM pg_sleep(0.1);
    COMMIT;
  END LOOP;
END $$;
```

**Application-level backfill** (for complex transformations):

```typescript
async function backfillInBatches(
  db: Pool,
  batchSize = 5000,
  delayMs = 100
) {
  let totalUpdated = 0;

  while (true) {
    const result = await db.query(
      `UPDATE users
       SET email_address = email
       WHERE id IN (
         SELECT id FROM users
         WHERE email_address IS NULL
         ORDER BY id
         LIMIT $1
       )
       RETURNING id`,
      [batchSize]
    );

    totalUpdated += result.rowCount ?? 0;
    console.log(`Backfilled ${totalUpdated} rows so far`);

    if ((result.rowCount ?? 0) < batchSize) break;
    await new Promise((r) => setTimeout(r, delayMs));
  }

  return totalUpdated;
}
```

### Drizzle ORM Migration Example

```typescript
// drizzle/migrations/0015_add_email_address.ts
import { sql } from 'drizzle-orm';
import type { MigrationMeta } from 'drizzle-orm/migrator';

export async function up(db: any) {
  // Phase 1: Expand
  await db.execute(sql`
    ALTER TABLE users ADD COLUMN email_address TEXT;
  `);

  // Phase 2: Backfill
  await db.execute(sql`
    UPDATE users SET email_address = email WHERE email_address IS NULL;
  `);
}

export async function down(db: any) {
  await db.execute(sql`
    ALTER TABLE users DROP COLUMN IF EXISTS email_address;
  `);
}
```

### Rollback Procedures

**Pre-migration checklist:**

```sql
-- 1. Snapshot current state
SELECT count(*) FROM users; -- Record row count
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'users';

-- 2. Create a savepoint or take a logical backup
pg_dump --table=users --data-only -f users_backup.sql mydb

-- 3. Test migration on a staging copy first
-- 4. Plan the rollback SQL before executing the migration
```

**Rollback-safe migration template:**

```typescript
interface Migration {
  name: string;
  up: string[];    // Forward migration SQL statements
  down: string[];  // Rollback SQL statements
  verify: string;  // Query to verify migration succeeded
}

const migration: Migration = {
  name: '0015_add_tracking_number',
  up: [
    'ALTER TABLE orders ADD COLUMN tracking_number TEXT;',
    'CREATE INDEX CONCURRENTLY idx_orders_tracking ON orders(tracking_number);',
  ],
  down: [
    'DROP INDEX CONCURRENTLY IF EXISTS idx_orders_tracking;',
    'ALTER TABLE orders DROP COLUMN IF EXISTS tracking_number;',
  ],
  verify: `
    SELECT column_name FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'tracking_number';
  `,
};
```

### Advisory Locks for Migration Safety

```sql
-- Prevent concurrent migration execution
SELECT pg_advisory_lock(12345); -- Acquire lock (blocks if held)

-- Run migration...

SELECT pg_advisory_unlock(12345); -- Release lock
```

```typescript
async function withMigrationLock(db: Pool, fn: () => Promise<void>) {
  const LOCK_ID = 839274; // Arbitrary but consistent
  try {
    await db.query('SELECT pg_advisory_lock($1)', [LOCK_ID]);
    await fn();
  } finally {
    await db.query('SELECT pg_advisory_unlock($1)', [LOCK_ID]);
  }
}
```

## Best Practices

1. **Never run migrations directly on production first** — Always test on a staging environment with production-sized data.
2. **Use expand-contract for destructive changes** — Column renames, type changes, and removes should always go through three phases.
3. **Create indexes concurrently** — `CREATE INDEX CONCURRENTLY` avoids blocking writes.
4. **Batch all backfills** — Never run a single `UPDATE ... SET` on millions of rows; use batches of 5k-10k with brief pauses.
5. **Write rollback SQL before the migration** — Every `up` must have a corresponding `down` written and tested.
6. **Monitor lock contention** — Use `pg_stat_activity` and `pg_locks` during migrations to catch blocking.
7. **Use advisory locks** — Prevent two migration processes from running simultaneously.
8. **Separate schema changes from data changes** — Deploy schema additions first, then backfill in a separate step.
9. **Validate constraints separately** — Use `NOT VALID` + `VALIDATE CONSTRAINT` to avoid long exclusive locks.
10. **Keep migrations small and focused** — One logical change per migration file; never combine unrelated changes.

## Common Pitfalls

| Pitfall | Problem | Fix |
|---------|---------|-----|
| Adding NOT NULL without default | Entire table rewrite + exclusive lock | Use NOT VALID CHECK constraint + validate later |
| Non-concurrent index creation | Blocks all writes during build | Always use `CREATE INDEX CONCURRENTLY` |
| Backfill in single transaction | Long-running transaction blocks vacuum, bloats table | Batch with COMMIT between batches |
| No rollback plan | Stuck with a broken migration in production | Write and test `down` migration before running `up` |
| Dropping column before code deploy | Application errors on missing column | Deploy code changes first, then drop column |
| Running migration during peak traffic | Lock contention causes timeouts | Schedule migrations during low-traffic windows |
| Forgetting to validate NOT VALID constraints | Constraint exists but not enforced on old rows | Run `ALTER TABLE ... VALIDATE CONSTRAINT` after backfill |
