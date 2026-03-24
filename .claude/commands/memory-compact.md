# /memory-compact — Clean Up & Compact Memory

Archive low-value memories, merge duplicates, and reclaim memory quality.

## Steps

### 1. Identify compaction candidates
```bash
cd /Users/inugami/Documents/GitHub/InuVerse/ai-agents/ultrathink && npx tsx -e "
import { config } from 'dotenv';
import { resolve, join } from 'path';
config({ path: join(resolve(import.meta.dirname, '../..'), '.env') });
import { getClient } from './memory/src/client.js';
const sql = getClient();

// Low-value: low importance, never accessed, old
const lowValue = await sql\`
  SELECT id, LEFT(content, 80) as preview, category, importance, access_count, created_at
  FROM memories
  WHERE is_archived = false
    AND importance <= 3
    AND access_count = 0
    AND created_at < NOW() - INTERVAL '14 days'
  ORDER BY importance ASC, created_at ASC
  LIMIT 50
\`;
console.log('LOW_VALUE:', JSON.stringify(lowValue));

// Junk: very short content, auto-memory noise
const junk = await sql\`
  SELECT id, content, source, category
  FROM memories
  WHERE is_archived = false
    AND (
      length(content) < 20
      OR content LIKE 'Modified %'
      OR content LIKE 'Ran command: ls%'
      OR content LIKE 'Ran command: cat%'
      OR content LIKE 'Ran command: echo%'
      OR (source = 'identity-extract' AND length(content) < 30)
    )
  LIMIT 100
\`;
console.log('JUNK:', JSON.stringify(junk));

// Duplicates: similar content
const dupes = await sql\`
  SELECT m1.id as id1, m2.id as id2,
         LEFT(m1.content, 60) as content1,
         LEFT(m2.content, 60) as content2,
         similarity(m1.content, m2.content) as sim
  FROM memories m1
  JOIN memories m2 ON m1.id < m2.id
    AND similarity(m1.content, m2.content) > 0.7
  WHERE m1.is_archived = false AND m2.is_archived = false
  ORDER BY sim DESC
  LIMIT 30
\`;
console.log('DUPES:', JSON.stringify(dupes));

// Stats
const [total] = await sql\`SELECT COUNT(*) as c FROM memories WHERE is_archived = false\`;
const [archived] = await sql\`SELECT COUNT(*) as c FROM memories WHERE is_archived = true\`;
console.log('STATS:', JSON.stringify({ active: total.c, archived: archived.c }));

process.exit(0);
"
```

### 2. Review and act
Present the findings:

```
## Memory Compaction Report

### Stats
- Active: X | Archived: Y | Total: Z

### Junk memories (auto-archive)
[List of junk entries — these get archived automatically]

### Low-value memories (suggest archive)
[List with preview — ask for confirmation before archiving]

### Duplicates (merge)
[Pairs with similarity scores — keep the one with higher importance/access_count]
```

### 3. Execute compaction
Archive junk memories immediately:
```bash
cd /Users/inugami/Documents/GitHub/InuVerse/ai-agents/ultrathink && npx tsx -e "
import { config } from 'dotenv';
import { resolve, join } from 'path';
config({ path: join(resolve(import.meta.dirname, '../..'), '.env') });
import { getClient } from './memory/src/client.js';
const sql = getClient();
const junkIds = [/* IDs from step 1 */];
if (junkIds.length > 0) {
  const result = await sql\`UPDATE memories SET is_archived = true WHERE id = ANY(\${junkIds})\`;
  console.log('Archived:', result.count, 'junk memories');
}
process.exit(0);
"
```

For duplicates, archive the lower-quality one (lower importance or fewer accesses).

For low-value memories, archive after review.

### 4. Summary
```
## Compaction Complete
- Junk archived: X
- Duplicates merged: X
- Low-value archived: X
- Active memories: X (was Y)
- Space reclaimed: Z entries
```
