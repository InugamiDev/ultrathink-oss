# /context-tree — Navigate UltraThink Knowledge

Build and display the hierarchical context tree showing all available knowledge and how to access it.

## Steps

1. **Query memory categories + counts**:
```bash
cd /Users/inugami/Documents/GitHub/InuVerse/ai-agents/ultrathink && npx tsx -e "
import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(import.meta.dirname || '.', '.env') });
import { getClient } from './memory/src/client.js';
const sql = getClient();
const cats = await sql\`SELECT category, COUNT(*) as count FROM memories WHERE is_archived = false GROUP BY category ORDER BY count DESC\`;
const [total] = await sql\`SELECT COUNT(*) as count FROM memories WHERE is_archived = false\`;
console.log(JSON.stringify({ total: total.count, categories: cats }));
process.exit(0);
"
```

2. **Read skill registry for layer breakdown**:
```bash
cat /Users/inugami/Documents/GitHub/InuVerse/ai-agents/ultrathink/.claude/skills/_registry.json | jq '{
  total: (.skills | length),
  byLayer: [.skills[] | .layer] | group_by(.) | map({layer: .[0], count: length}) | sort_by(-.count),
  byCategory: [.skills[] | .category] | group_by(.) | map({category: .[0], count: length}) | sort_by(-.count) | .[0:10]
}'
```

3. **Detect project stack** (check for package.json, etc.):
```bash
cd /Users/inugami/Documents/GitHub/InuVerse/ai-agents/ultrathink && ls package.json tsconfig.json .env 2>/dev/null; cat package.json 2>/dev/null | jq -r '.dependencies // {} | keys[]' 2>/dev/null | head -10
```

4. **Check active plans/tasks**:
```bash
cd /Users/inugami/Documents/GitHub/InuVerse/ai-agents/ultrathink && npx tsx -e "
import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(import.meta.dirname || '.', '.env') });
import { getClient } from './memory/src/client.js';
const sql = getClient();
try {
  const plans = await sql\`SELECT id, title, status FROM plans WHERE status != 'completed' ORDER BY created_at DESC LIMIT 5\`;
  console.log(JSON.stringify({ activePlans: plans }));
} catch { console.log(JSON.stringify({ activePlans: [] })); }
process.exit(0);
"
```

5. **List reference files**:
```bash
ls /Users/inugami/Documents/GitHub/InuVerse/ai-agents/ultrathink/.claude/references/*.md 2>/dev/null
```

## Output Format

Present as a navigable tree:

```
## Context Tree — UltraThink

ultrathink/
├── identity/          → /ut-recall identity | /usage
│   └── preferences    → Stored in memory (category: preference)
│
├── memory/            → X total items
│   ├── solutions/     → X items — /ut-recall [topic]
│   ├── architecture/  → X items — /ut-recall [topic]
│   ├── patterns/      → X items — /ut-recall [topic]
│   ├── decisions/     → X items — /ut-recall [topic]
│   ├── preferences/   → X items (no decay)
│   ├── insights/      → X items
│   └── errors/        → X items
│
├── skills/            → X total
│   ├── orchestrators/ → X (audit, cook, ship, ui, ...)
│   ├── hubs/          → X (brainstorm, plan, onboard, ...)
│   ├── utilities/     → X (api-designer, caching, ...)
│   └── domain/        → X (react, nextjs, aws, ...)
│
├── project/
│   ├── stack/         → [detected technologies]
│   ├── active-plans/  → X plans
│   └── structure/     → Read with Glob/LS
│
└── references/        → [list .md files]
    ├── core.md        → Response patterns, skill selection
    ├── memory.md      → Memory read/write discipline
    ├── privacy.md     → File access control
    ├── quality.md     → Code standards
    └── teaching.md    → Coding level adaptation

Navigation: Use /ut-recall [topic] to search memory, Skill() to load skills.
```
