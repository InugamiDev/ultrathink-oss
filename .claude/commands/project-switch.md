# /project-switch — Switch Project Context

Switch the memory scope to a different project, loading only that project's memories and context.

Usage: `/project-switch [project-name-or-path]`

## Steps

### 1. List available project scopes
```bash
cd /Users/inugami/Documents/GitHub/InuVerse/ai-agents/ultrathink && npx tsx -e "
import { config } from 'dotenv';
import { resolve, join } from 'path';
config({ path: join(resolve(import.meta.dirname, '../..'), '.env') });
import { getClient } from './memory/src/client.js';
const sql = getClient();
const scopes = await sql\`
  SELECT scope, COUNT(*) as memory_count,
         MAX(created_at) as last_activity,
         SUM(CASE WHEN category = 'decision' THEN 1 ELSE 0 END) as decisions,
         SUM(CASE WHEN category = 'prediction' THEN 1 ELSE 0 END) as predictions
  FROM memories
  WHERE is_archived = false AND scope IS NOT NULL
  GROUP BY scope
  ORDER BY last_activity DESC
\`;
console.log(JSON.stringify(scopes, null, 2));
process.exit(0);
"
```

### 2. If user specified a project, load its context
If the user provided a project name/path argument:
- Match it against known scopes (fuzzy — "ultrathink" matches "ai-agents/ultrathink")
- Load memories for that scope
- Show project summary

```bash
cd /Users/inugami/Documents/GitHub/InuVerse/ai-agents/ultrathink && npx tsx -e "
import { config } from 'dotenv';
import { resolve, join } from 'path';
config({ path: join(resolve(import.meta.dirname, '../..'), '.env') });
import { searchMemories } from './memory/src/memory.js';
const scope = '[MATCHED_SCOPE]';
const decisions = await searchMemories({ category: 'decision', scope, limit: 5 });
const solutions = await searchMemories({ category: 'solution', scope, limit: 5 });
const architecture = await searchMemories({ category: 'architecture', scope, limit: 5 });
const predictions = await searchMemories({ category: 'prediction', scope, limit: 3 });
console.log(JSON.stringify({ decisions, solutions, architecture, predictions }, null, 2));
process.exit(0);
"
```

### 3. Present project context

If no argument, show the project list:
```
## Available Projects

| Project | Memories | Decisions | Last Active |
|---------|----------|-----------|-------------|
| [scope] | X | Y | [date] |

Use /project-switch [name] to load a project's context.
```

If argument provided, show the loaded context:
```
## Switched to: [project-name]

### Decisions (X)
- [decision summaries]

### Architecture (X)
- [architecture notes]

### Recent Solutions (X)
- [solutions found]

### Open Predictions (X)
- [pending predictions]

Scope set to: [scope]. Memory queries will prioritize this project.
```

### 4. Set scope for current session
After switching, inform that all subsequent `/ut-recall`, `/ask`, and memory operations will default to this project's scope. The scope is already used by the session start hook via `ULTRATHINK_CWD`.
