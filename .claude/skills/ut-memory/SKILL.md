---
name: ut-memory
description: Browse and search UltraThink memory entries in the Neon database
disable-model-invocation: true
allowed-tools: Bash, Read
argument-hint: "[search-query]"
---

# UltraThink Memory Browser

Browse and search memories stored in the Neon Postgres database.

## Prerequisites

Requires `DATABASE_URL` to be set. Check:

```bash
if [ -f "$HOME/Documents/GitHub/InuVerse/ai-agents/ultrathink/.env" ]; then
  source "$HOME/Documents/GitHub/InuVerse/ai-agents/ultrathink/.env"
fi
if [ -z "$DATABASE_URL" ]; then
  echo "DATABASE_URL not set. Configure it in ~/Documents/GitHub/InuVerse/ai-agents/ultrathink/.env"
  exit 1
fi
```

## If $ARGUMENTS is provided — Search

```bash
cd ~/Documents/GitHub/InuVerse/ai-agents/ultrathink/memory && npx tsx -e "
import { neon } from '@neondatabase/serverless';
const sql = neon(process.env.DATABASE_URL!);
const rows = await sql\`
  SELECT id, category, importance, content, created_at
  FROM memories
  WHERE content ILIKE \${'%$ARGUMENTS%'}
    AND is_archived = false
  ORDER BY importance DESC, created_at DESC
  LIMIT 20
\`;
if(rows.length===0){console.log('No memories found matching: $ARGUMENTS')}
else{rows.forEach(r=>console.log(\`[\${r.importance}] [\${r.category}] \${r.content.slice(0,100)}...\`))}
"
```

## If no arguments — Show stats and recent

```bash
cd ~/Documents/GitHub/InuVerse/ai-agents/ultrathink/memory && npx tsx -e "
import { neon } from '@neondatabase/serverless';
const sql = neon(process.env.DATABASE_URL!);
const total = await sql\`SELECT COUNT(*) as count FROM memories WHERE is_archived = false\`;
const archived = await sql\`SELECT COUNT(*) as count FROM memories WHERE is_archived = true\`;
const cats = await sql\`SELECT category, COUNT(*) as count FROM memories WHERE is_archived = false GROUP BY category ORDER BY count DESC\`;
const recent = await sql\`SELECT category, importance, content, created_at FROM memories WHERE is_archived = false ORDER BY created_at DESC LIMIT 10\`;

console.log('Memory Stats');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('Active:  ', total[0].count);
console.log('Archived:', archived[0].count);
console.log('');
console.log('Categories:');
cats.forEach(c=>console.log('  '+c.category.padEnd(20)+c.count));
console.log('');
console.log('Recent Memories:');
recent.forEach(r=>console.log(\`  [\${r.importance}] [\${r.category}] \${r.content.slice(0,80)}...\`));
"
```

Present the results in a clean formatted table.
