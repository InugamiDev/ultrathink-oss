# /ask — Conversational Memory Query

Query the UltraThink persistent memory naturally and present results in a human-readable format.

Usage: `/ask [question]`

## Steps

### 1. Parse the question
Extract key search terms from the user's natural language question.
Examples:
- "what did we decide about auth?" → search terms: "auth", "authentication", "decision"
- "how does the billing system work?" → search terms: "billing", "payment", "subscription"
- "why did we choose Neon?" → search terms: "Neon", "database", "decision"

### 2. Search memory with multiple strategies
Run these in parallel:

**Semantic search** (primary):
```bash
cd /Users/inugami/Documents/GitHub/InuVerse/ai-agents/ultrathink && npx tsx memory/scripts/memory-runner.ts search "[extracted_terms]"
```

**Category-specific search** (if question implies a category):
- "what did we decide" → search category "decision"
- "what pattern" → search category "pattern"
- "what error/bug" → search category "error" or "solution"
- "what preference" → search category "preference"

```bash
cd /Users/inugami/Documents/GitHub/InuVerse/ai-agents/ultrathink && npx tsx -e "
import { config } from 'dotenv';
import { resolve, join } from 'path';
config({ path: join(resolve(import.meta.dirname, '../..'), '.env') });
import { searchMemories } from './memory/src/memory.js';
const results = await searchMemories({ query: '[terms]', category: '[detected_category]', limit: 10 });
console.log(JSON.stringify(results, null, 2));
process.exit(0);
"
```

**Related memories** (graph traversal):
If top results have relations, fetch connected memories for context.

### 3. Present results conversationally
Do NOT dump raw JSON. Instead:

- **Answer the question directly** using the memory contents
- **Cite which memories** informed the answer (show memory ID + date)
- **Note confidence** — if memories conflict or are old, say so
- **Suggest follow-up** — "Related memories also mention X, want to explore that?"

### Format
```
Based on your memories:

[Direct answer to the question]

**Sources:**
- [date] [category]: [content summary] (importance: X)
- [date] [category]: [content summary] (importance: X)

**Confidence**: [High/Medium/Low] — [reason]
```

### 4. Touch accessed memories
The search functions automatically update `accessed_at` and `access_count` for recalled memories, so frequently asked questions naturally bubble up in importance.
