# Troubleshooting

## Overview

This guide covers common issues with UltraThink and how to resolve them. Issues are organized by subsystem: database, skills, hooks, dashboard, and memory.

---

## Database Connection Issues

### Error: "DATABASE_URL environment variable is required"

**Cause**: The `DATABASE_URL` environment variable is not set.

**Fix**:
1. Create a `.env` file at the project root:
   ```bash
   DATABASE_URL=postgres://user:password@host.neon.tech/neondb?sslmode=require
   ```
2. If using Neon, get the connection string from the Neon dashboard.
3. Verify the variable is loaded:
   ```bash
   source .env && echo $DATABASE_URL
   ```

### Error: "Connection refused" or "ECONNREFUSED"

**Cause**: The database server is unreachable.

**Fix**:
1. Check that your Neon project is active (not suspended due to inactivity)
2. Verify the connection string includes `?sslmode=require` for Neon
3. Check your network connection -- Neon requires internet access
4. If behind a firewall/VPN, ensure port 5432 outbound is allowed

### Error: "relation 'memories' does not exist"

**Cause**: Migrations have not been run.

**Fix**:
```bash
npm run migrate
```

If the migrate script fails, run migrations manually:
```bash
cd memory && npx tsx scripts/migrate.ts
```

### Error: "extension 'vector' is not available"

**Cause**: The pgvector extension is not installed on the database.

**Fix**:
- **Neon**: pgvector is available by default. Run `CREATE EXTENSION IF NOT EXISTS "vector";` directly.
- **Self-hosted Postgres**: Install pgvector following the [official instructions](https://github.com/pgvector/pgvector).
- If you cannot install pgvector, the memory system still works -- semantic search will be unavailable, but text-based search functions normally.

### Error: "too many connections"

**Cause**: Connection pool exhausted, typically from many concurrent sessions.

**Fix**:
1. The Neon client uses connection caching by default (`neonConfig.fetchConnectionCache = true` in `memory/src/client.ts`)
2. Close other database clients or sessions
3. For Neon free tier, the connection limit is 100 concurrent connections
4. Consider upgrading the Neon plan for higher limits

---

## Skill Loading Issues

### Skill Not Found

**Symptom**: Using a trigger like `/my-skill` produces no response or a generic response.

**Diagnosis**:
1. Check the skill directory exists:
   ```bash
   ls .claude/skills/my-skill/SKILL.md
   ```
2. Verify the trigger is defined in the YAML frontmatter:
   ```yaml
   triggers:
     - "/my-skill"
   ```
3. Check for typos in the skill name or trigger

**Fix**: Create the skill directory and SKILL.md if missing. See [How to Create a New Skill](./how-to-create-a-new-skill.md).

### Skill Links Broken

**Symptom**: A skill tries to invoke another skill that doesn't exist or doesn't respond.

**Diagnosis**:
1. Check the `linksTo` field in the skill's SKILL.md
2. Verify each linked skill exists:
   ```bash
   ls .claude/skills/<linked-skill>/SKILL.md
   ```
3. Check the dashboard's Skills page for broken link warnings

**Fix**: Either create the missing skill or update the `linksTo` to remove the broken reference. Update `linkedFrom` in the target skill accordingly.

### YAML Frontmatter Parse Error

**Symptom**: Skill metadata is not loaded correctly, or the skill behaves unexpectedly.

**Diagnosis**: YAML frontmatter must be between `---` delimiters at the very start of the file:
```yaml
---
name: my-skill
...
---
```

**Common mistakes**:
- Whitespace before the opening `---`
- Missing closing `---`
- Invalid YAML syntax (bad indentation, missing quotes around special characters)
- Tabs instead of spaces in YAML

**Fix**: Validate your YAML using an online validator or `yq`:
```bash
head -n $(grep -n "^---$" .claude/skills/my-skill/SKILL.md | tail -1 | cut -d: -f1) .claude/skills/my-skill/SKILL.md | tail -n +2 | yq .
```

---

## Hook Failures

### Privacy Hook Blocks Everything

**Symptom**: All file access is blocked, even for project files.

**Diagnosis**:
1. Check the sensitivity level in `ck.json`:
   ```json
   {
     "privacyHook": {
       "sensitivityLevel": "paranoid"  // This blocks everything
     }
   }
   ```
2. Check `.ckignore` for overly broad patterns like `*` or `**/*`

**Fix**:
- Lower the sensitivity level to `standard` or `strict`
- Review `.ckignore` for patterns that are too broad
- Add allow overrides with `!` for files that should be accessible

### Privacy Hook Does Not Block Expected Files

**Symptom**: Sensitive files are accessible when they should be blocked.

**Diagnosis**:
1. Check that the privacy hook is enabled:
   ```json
   {
     "privacyHook": {
       "enabled": true
     }
   }
   ```
2. Verify the hook script is executable:
   ```bash
   ls -la .claude/hooks/privacy-hook.sh
   chmod +x .claude/hooks/privacy-hook.sh
   ```
3. Test the hook manually:
   ```bash
   .claude/hooks/privacy-hook.sh /path/to/sensitive/file
   echo "Exit code: $?"
   ```
4. Check `.ckignore` for `!` patterns that might be allowing the file

**Fix**: Add the file pattern to `.ckignore` or verify built-in patterns cover it.

### Memory Save Hook Fails Silently

**Symptom**: Memories are not persisted after sessions.

**Diagnosis**:
1. Check that `DATABASE_URL` is set
2. Check for pending memory files:
   ```bash
   ls /tmp/ultrathink-session/*.memory.json 2>/dev/null
   ```
3. Check the hook event log:
   ```bash
   tail -10 reports/hook-events.jsonl | grep memory-save
   ```

**Fix**:
- Set `DATABASE_URL` in `.env`
- Ensure the session temp directory (`/tmp/ultrathink-session/`) is writable
- Check that memory JSON files have valid content

### Notification Hook Fails

**Symptom**: Notifications are not delivered to Telegram/Discord/Slack.

**Diagnosis**:
1. Check that notification channels are configured in `ck.json`:
   ```json
   {
     "notifications": {
       "telegram": { "token": "...", "chatId": "..." }
     }
   }
   ```
2. Test the hook manually:
   ```bash
   .claude/hooks/notify.sh "Test message" telegram normal
   ```
3. Check the hook event log for send errors
4. Verify webhook URLs are valid and not expired

**Fix**:
- Regenerate expired webhook URLs
- Verify bot tokens and chat IDs
- Ensure `curl` is available and network access is not blocked

---

## Dashboard Issues

### Dashboard Won't Start

**Symptom**: `npm run dashboard:dev` fails.

**Diagnosis**:
1. Check for missing dependencies:
   ```bash
   cd dashboard && npm install
   ```
2. Check for port conflict:
   ```bash
   lsof -i :3333
   ```
3. Check Node.js version (requires Node 18+):
   ```bash
   node --version
   ```

**Fix**:
- Install dependencies: `cd dashboard && npm install`
- Kill the process using port 3333, or change the port in `ck.json`
- Upgrade Node.js if below v18

### Dashboard Shows Empty Data

**Symptom**: Dashboard loads but all pages show empty states.

**Diagnosis**:
1. Check `DATABASE_URL` is set and accessible from the dashboard:
   ```bash
   cd dashboard && node -e "console.log(process.env.DATABASE_URL)"
   ```
2. Check that migrations have been run
3. Check the API routes for errors:
   ```bash
   curl http://localhost:3333/api/health
   curl http://localhost:3333/api/memory
   ```

**Fix**:
- Set `DATABASE_URL` in `.env` at the project root
- Run migrations: `npm run migrate`
- Seed sample data: `npm run seed`

### Dashboard Build Errors

**Symptom**: `npm run dashboard:build` fails with TypeScript or import errors.

**Common causes**:
1. **Missing types**: Install dev dependencies: `cd dashboard && npm install`
2. **Import resolution**: Check that `tsconfig.json` path aliases are correct
3. **Tailwind CSS v4**: Ensure `@tailwindcss/postcss` and `tailwindcss` v4 are installed

**Fix**:
```bash
cd dashboard
rm -rf node_modules .next
npm install
npm run build
```

---

## Memory Compaction Issues

### Compaction Does Not Run

**Symptom**: `npm run compact` reports "No scopes eligible for compaction."

**Cause**: Compaction requires at least 5 low-importance (1-3) uncompacted memories per scope.

**Diagnosis**:
```bash
cd memory && npx tsx -e "
  import { neon } from '@neondatabase/serverless';
  const sql = neon(process.env.DATABASE_URL!);
  const rows = await sql\`
    SELECT scope, COUNT(*) as count
    FROM memories
    WHERE importance <= 3 AND is_archived = false AND is_compacted = false
    GROUP BY scope
  \`;
  console.table(rows);
"
```

**Fix**: If the threshold is too high, lower `compactionThreshold` in `ck.json`. Or wait until enough low-importance memories accumulate.

### Important Memories Disappeared After Compaction

**Symptom**: Expected memories are no longer returned by search.

**Diagnosis**: Compaction only archives memories with `importance <= 3`. Importance 4+ memories should never be compacted.

1. Check if the memories were archived (not deleted):
   ```typescript
   const archived = await searchMemories({ includeArchived: true, query: "your search" });
   ```
2. Check the summaries table for compacted content

**Fix**: If important memories were accidentally set with low importance, update them:
```typescript
await updateMemory(memoryId, { importance: 7, is_archived: false });
```

### Compaction Takes Too Long

**Cause**: Large number of memories per scope.

**Fix**:
1. Increase the batch threshold: more memories per scope means fewer summary records
2. Run compaction during off-hours
3. Archive very old low-importance memories manually before compaction

---

## General Issues

### Everything Seems Slow

**Possible causes**:
1. **Network latency to Neon**: Check your connection to the Neon region
2. **Missing database indexes**: Verify indexes exist by checking `memory/schema/schema.sql`
3. **Too many memories**: Run compaction to reduce the active memory count
4. **Dashboard over-fetching**: Check that API routes use `LIMIT` clauses

### Configuration Changes Not Taking Effect

**Cause**: `ck.json` changes require skill re-invocation to take effect.

**Fix**:
- For dashboard settings: Restart the dashboard
- For coding level: The next skill invocation will use the new level
- For privacy settings: The next file access will check the new settings

### Reports Directory Missing

**Symptom**: Hook events fail to log because `reports/` doesn't exist.

**Fix**:
```bash
mkdir -p reports/ui-tests
```

The hooks create the directory automatically, but if permissions prevent this, create it manually.

## Getting Help

If you encounter an issue not covered here:

1. Check the relevant documentation page (links throughout this guide)
2. Run the health check: `curl http://localhost:3333/api/health`
3. Check hook event logs: `cat reports/hook-events.jsonl | tail -20`
4. Check the dashboard's Health page for system-wide diagnostics

## Related Documentation

- [Claude Workflow Overview](./claude-workflow-overview.md) -- System architecture
- [Memory System](./memory-system.md) -- Memory service details
- [Hooks and Privacy](./hooks-and-privacy.md) -- Hook system details
- [Dashboard Overview](./dashboard-overview.md) -- Dashboard architecture
- [ck.json Config](./ck-json-config.md) -- Configuration reference
