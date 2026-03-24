# Troubleshooting

Common issues organized by subsystem with diagnosis and fixes.

## Database Connection Issues

### "DATABASE_URL environment variable is required"

Create a `.env` file at the project root:

```bash
DATABASE_URL=postgres://user:password@host.neon.tech/neondb?sslmode=require
```

### "Connection refused" or "ECONNREFUSED"

- Check that your Neon project is active (not suspended)
- Verify `?sslmode=require` in the connection string
- Check network/firewall -- Neon requires outbound port 5432

### "relation 'memories' does not exist"

Migrations have not been run:

```bash
npm run migrate
```

### "extension 'vector' is not available"

- **Neon**: pgvector is available by default. Run `CREATE EXTENSION IF NOT EXISTS "vector";`
- **Self-hosted**: Install [pgvector](https://github.com/pgvector/pgvector)
- Without pgvector, text-based search still works; only semantic search is unavailable

### "too many connections"

The Neon client uses connection caching by default. Close other database clients or upgrade the Neon plan (free tier: 100 connections).

## Skill Loading Issues

### Skill not found

1. Check the skill directory exists: `ls .claude/skills/my-skill/SKILL.md`
2. Verify triggers in YAML frontmatter
3. Check for typos in the skill name or trigger

### Skill links broken

1. Check `linksTo` in the skill's SKILL.md
2. Verify each linked skill exists: `ls .claude/skills/<linked-skill>/SKILL.md`
3. Check the dashboard's Skills page for broken link warnings

### YAML frontmatter parse error

Common mistakes:
- Whitespace before the opening `---`
- Missing closing `---`
- Invalid YAML syntax (bad indentation, tabs instead of spaces)
- Missing quotes around special characters

Validate with:

```bash
head -n $(grep -n "^---$" .claude/skills/my-skill/SKILL.md | tail -1 | cut -d: -f1) \
  .claude/skills/my-skill/SKILL.md | tail -n +2 | yq .
```

## Hook Failures

### Privacy hook blocks everything

Check `ck.json` -- the sensitivity level might be `paranoid`:

```json
{ "privacyHook": { "sensitivityLevel": "standard" } }
```

Also check `.ckignore` for overly broad patterns like `*` or `**/*`.

### Privacy hook does not block expected files

1. Verify `privacyHook.enabled` is `true` in `ck.json`
2. Check the hook is executable: `chmod +x .claude/hooks/privacy-hook.sh`
3. Test manually: `.claude/hooks/privacy-hook.sh /path/to/sensitive/file && echo "allowed" || echo "blocked"`

### Memory save hook fails silently

1. Check `DATABASE_URL` is set
2. Check for pending files: `ls /tmp/ultrathink-session/*.memory.json 2>/dev/null`
3. Check logs: `tail -10 reports/hook-events.jsonl | grep memory-save`

### Notification hook fails

1. Check channel config in `ck.json` `notifications` section
2. Test manually: `.claude/hooks/notify.sh "Test message" telegram normal`
3. Verify webhook URLs are valid and not expired

## Dashboard Issues

### Dashboard won't start

1. Install dependencies: `cd dashboard && npm install`
2. Check port conflict: `lsof -i :3333`
3. Check Node.js version (requires 18+): `node --version`

### Dashboard shows empty data

1. Verify `DATABASE_URL` is accessible from the dashboard
2. Run migrations: `npm run migrate`
3. Seed sample data: `npm run seed`
4. Check API routes: `curl http://localhost:3333/api/health`

### Dashboard build errors

```bash
cd dashboard
rm -rf node_modules .next
npm install
npm run build
```

## Memory Compaction Issues

### Compaction does not run

Compaction requires 5+ low-importance (1-3) uncompacted memories per scope. Lower `compactionThreshold` in `ck.json` or wait for more memories.

### Important memories disappeared

Compaction only archives `importance <= 3`. If important memories were set with low importance:

```typescript
await updateMemory(memoryId, { importance: 7, is_archived: false });
```

## General Issues

### Everything seems slow

- Check network latency to Neon
- Verify database indexes exist
- Run compaction to reduce active memory count
- Check API routes use `LIMIT` clauses

### Configuration changes not taking effect

- Dashboard settings: restart the dashboard
- Coding level: next skill invocation uses the new level
- Privacy settings: next file access checks the new settings

### Reports directory missing

```bash
mkdir -p reports/ui-tests
```
