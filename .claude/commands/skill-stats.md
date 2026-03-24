# /skill-stats — Skill Usage Analytics

Show which skills fire most, which are ignored, and trigger effectiveness.

## Steps

### 1. Fetch skill usage data
```bash
cd /Users/inugami/Documents/GitHub/InuVerse/ai-agents/ultrathink && npx tsx -e "
import { config } from 'dotenv';
import { resolve, join } from 'path';
config({ path: join(resolve(import.meta.dirname, '../..'), '.env') });
import { getClient } from './memory/src/client.js';
const sql = getClient();

// Skill activations
let skillUsage = [];
try {
  skillUsage = await sql\`
    SELECT skill_name, COUNT(*) as count,
           MAX(used_at) as last_used
    FROM skill_usage
    GROUP BY skill_name
    ORDER BY count DESC
  \`;
} catch { /* table may not exist */ }
console.log('SKILL_USAGE:', JSON.stringify(skillUsage));

// Tool usage
let toolUsage = [];
try {
  toolUsage = await sql\`
    SELECT tool_name, COUNT(*) as count
    FROM command_usage
    GROUP BY tool_name
    ORDER BY count DESC
    LIMIT 15
  \`;
} catch { /* table may not exist */ }
console.log('TOOL_USAGE:', JSON.stringify(toolUsage));

// Daily stats (last 7 days)
let dailyStats = [];
try {
  dailyStats = await sql\`
    SELECT date, total_prompts, total_tool_calls, skills_activated, memories_created
    FROM daily_stats
    ORDER BY date DESC
    LIMIT 7
  \`;
} catch { /* table may not exist */ }
console.log('DAILY_STATS:', JSON.stringify(dailyStats));

// Session count
const [sessions] = await sql\`SELECT COUNT(*) as c FROM sessions\`;
const [recentSessions] = await sql\`SELECT COUNT(*) as c FROM sessions WHERE started_at > NOW() - INTERVAL '7 days'\`;
console.log('SESSIONS:', JSON.stringify({ total: sessions.c, last7d: recentSessions.c }));

process.exit(0);
"
```

### 2. Read registry for total skill count
```bash
cat /Users/inugami/Documents/GitHub/InuVerse/ai-agents/ultrathink/.claude/skills/_registry.json | jq '{
  total: (.skills | length),
  byLayer: [.skills[] | .layer] | group_by(.) | map({layer: .[0], count: length}),
  byCategory: [.skills[] | .category] | group_by(.) | map({category: .[0], count: length}) | sort_by(-.count) | .[0:8]
}'
```

### 3. Present analytics report

```
## Skill Analytics

### Usage Ranking (Top 15)
| # | Skill | Uses | Last Used |
|---|-------|------|-----------|

### Never Used Skills
[Skills in registry with 0 activations — candidates for trigger tuning or removal]

### Tool Usage
| Tool | Calls |
|------|-------|

### Daily Activity (Last 7 Days)
| Date | Prompts | Tool Calls | Skills | Memories |
|------|---------|------------|--------|----------|

### Sessions
- Total: X
- Last 7 days: X

### Registry
- Total skills: X
- By layer: orchestrator (X), hub (X), utility (X), domain (X)

### Recommendations
- [Skills with high trigger rates but low user retention → tune triggers]
- [Skills never triggered → consider adding more trigger keywords]
- [Most productive days/patterns]
```
