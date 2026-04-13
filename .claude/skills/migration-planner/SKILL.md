---
name: migration-planner
description: Database and API migration planning with zero-downtime strategies, rollback procedures, and data transformation
layer: utility
category: development
triggers:
  - "migration plan"
  - "database migration"
  - "schema migration"
  - "API migration"
  - "zero downtime migration"
  - "data migration"
  - "breaking change"
inputs:
  - current_state: Current schema, API version, or system architecture
  - target_state: Desired end state after migration
  - constraints: Downtime tolerance, data volume, rollback requirements
  - dependencies: Systems and services affected by the migration
outputs:
  - migration_plan: Step-by-step migration plan with phases
  - rollback_plan: How to reverse each phase if something goes wrong
  - risk_assessment: Identified risks and mitigation strategies
  - testing_checklist: Verification steps for each migration phase
  - timeline: Estimated duration and resource requirements
linksTo:
  - data-modeling
  - postgresql
  - drizzle
  - prisma
  - api-designer
linkedFrom:
  - plan
  - data-modeling
  - ship
preferredNextSkills:
  - data-modeling
  - drizzle
fallbackSkills:
  - sequential-thinking
riskLevel: high
memoryReadPolicy: selective
memoryWritePolicy: selective
sideEffects:
  - Migration scripts may modify database schema
  - Data transformations may alter existing records
---

# Migration Planner Skill

## Purpose

Plan safe, reversible migrations for databases, APIs, and system architectures. This skill produces step-by-step migration plans that minimize downtime, prevent data loss, and include rollback procedures at every phase. The core principle: every migration step must be independently reversible.

## Key Concepts

### Migration Safety Levels

```
SAFE (no downtime, no risk):
  - Add a new table
  - Add a new nullable column
  - Add a new index CONCURRENTLY
  - Add a new API endpoint
  - Add a new enum value (append only)

CAUTION (requires coordination):
  - Add NOT NULL constraint (backfill NULLs first)
  - Add UNIQUE constraint (verify no duplicates first)
  - Rename a column (expand-contract pattern)
  - Change column type (expand-contract pattern)
  - Deprecate an API endpoint

DANGEROUS (requires downtime or extreme care):
  - Drop a column
  - Drop a table
  - Remove an API endpoint
  - Change primary key type
  - Merge or split tables
```

### The Expand-Contract Pattern

The safest pattern for any breaking schema change:

```
EXPAND PHASE (backward compatible):
  1. Add the new column/table alongside the old one
  2. Deploy code that writes to BOTH old and new
  3. Backfill existing data from old to new
  4. Deploy code that reads from new, writes to both

CONTRACT PHASE (remove old):
  5. Deploy code that only uses new
  6. Drop the old column/table
  7. Clean up dual-write code

Each step is independently deployable and reversible.
```

## Workflow

### Phase 1: Impact Assessment

```markdown
## Migration Impact Assessment

### What is changing?
- [ ] Database schema (columns, tables, types, constraints)
- [ ] API contract (endpoints, request/response shapes)
- [ ] Data format (serialization, encoding, structure)
- [ ] Infrastructure (services, databases, queues)

### What depends on the changing component?
- Services: [list all consuming services]
- Clients: [frontend apps, mobile apps, third-party integrations]
- Jobs: [background workers, cron jobs]
- Reports: [analytics queries, dashboards]

### Data volume
- Rows affected: [count]
- Estimated migration time: [duration]
- Can it run online (without locking)? [yes/no]

### Downtime tolerance
- Zero downtime required? [yes/no]
- Maintenance window available? [day/time/duration]
```

### Phase 2: Step-by-Step Plan

#### Example: Rename Column (Zero Downtime)

```
Step 1: Add new column
  SQL: ALTER TABLE users ADD COLUMN full_name TEXT;
  Risk: None (additive)
  Rollback: ALTER TABLE users DROP COLUMN full_name;

Step 2: Backfill data (batched)
  SQL: UPDATE users SET full_name = name WHERE full_name IS NULL;
  Run in batches of 1000 to avoid locking
  Rollback: No-op (old column still has data)

Step 3: Deploy dual-write code
  App writes to both `name` and `full_name`
  App reads from `full_name` with fallback to `name`
  Rollback: Revert deploy

Step 4: Add NOT NULL constraint
  SQL: ALTER TABLE users ALTER COLUMN full_name SET NOT NULL;
  Only after backfill verified complete
  Rollback: ALTER TABLE users ALTER COLUMN full_name DROP NOT NULL;

Step 5: Deploy read-from-new-only code
  App reads only from `full_name`, still writes to both
  Rollback: Revert deploy

Step 6: Drop old column (1 week after Step 5)
  SQL: ALTER TABLE users DROP COLUMN name;
  Rollback: Re-add column and backfill from full_name

Step 7: Clean up dual-write code
  Remove all references to old column
```

### Phase 3: Batch Processing

For large data migrations, process in chunks to avoid table locks:

```typescript
async function batchMigrate(options: {
  batchSize: number;
  delayMs: number;
  dryRun: boolean;
}) {
  let cursor: string | null = null;
  let totalProcessed = 0;

  do {
    const batch = await db.query(
      `SELECT id, name FROM users
       WHERE full_name IS NULL
       ${cursor ? 'AND id > $2' : ''}
       ORDER BY id LIMIT $1`,
      cursor ? [options.batchSize, cursor] : [options.batchSize]
    );

    if (batch.rows.length === 0) break;

    if (!options.dryRun) {
      const ids = batch.rows.map(r => r.id);
      await db.query(
        `UPDATE users SET full_name = name WHERE id = ANY($1)`,
        [ids]
      );
    }

    cursor = batch.rows[batch.rows.length - 1].id;
    totalProcessed += batch.rows.length;
    console.log(`Processed ${totalProcessed} rows`);

    await new Promise(r => setTimeout(r, options.delayMs));
  } while (true);

  console.log(`Migration complete: ${totalProcessed} rows`);
}
```

## API Migration Patterns

### Versioned Deprecation Timeline

```
Month 0: Release v2 API alongside v1
Month 1: Add Deprecation headers to v1 responses
Month 3: Email/notify all v1 consumers
Month 6: v1 returns 410 Gone for new consumers
Month 9: v1 fully sunset

Response headers during deprecation:
  Deprecation: true
  Sunset: Sat, 01 Sep 2026 00:00:00 GMT
  Link: <https://api.example.com/v2/docs>; rel="successor-version"
```

## Best Practices

1. **Every step must be reversible** -- if you cannot roll back, the step is too risky
2. **Expand before contract** -- always add new things before removing old things
3. **Backfill in batches** -- large UPDATEs lock tables; process in chunks of 1000-5000
4. **Use CONCURRENTLY for indexes** -- `CREATE INDEX CONCURRENTLY` does not lock the table
5. **Test on production-sized data** -- 1 second on dev may mean 1 hour on prod
6. **Monitor during migration** -- watch error rates, latency, and database load
7. **Never drop columns in the same deploy** -- wait at least one deploy cycle
8. **Separate schema migration from data migration** -- schema is instant; data may take hours
9. **Make migrations idempotent** -- safe to run multiple times
10. **Document the rollback plan** -- every step needs a reversal procedure

## Common Pitfalls

| Pitfall | Impact | Fix |
|---------|--------|-----|
| DROP COLUMN same deploy as code | App crashes reading missing column | Separate deploys by at least one cycle |
| Large UPDATE without batching | Table locked for minutes/hours | Batch in chunks with delays |
| No rollback plan | Stuck with broken state | Write rollback SQL for every step |
| Testing on small dataset | Migration takes 100x longer in prod | Test with production-sized data |
| Missing index on new FK | Slow joins after migration | Always add index with FK column |
| NOT NULL without backfill | Migration fails on existing NULLs | Backfill first, then add constraint |
| No communication plan | Consumers surprised by breaking changes | Notify stakeholders before, during, after |
