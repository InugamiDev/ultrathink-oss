---
name: learn-pattern
description: Extract reusable patterns from the current session and store as Tekio adaptations or memories
layer: utility
category: learning
triggers:
  - "learn from this"
  - "extract pattern"
  - "remember this pattern"
  - "save what we learned"
  - "learn"
  - "what did we learn"
inputs:
  - context: "Current session context or specific interaction to learn from"
  - scope: "Project scope for pattern storage"
outputs:
  - patterns: "Extracted patterns with confidence scores"
  - storage: "Where patterns were saved (Tekio adaptation or memory)"
linksTo:
  - debug
  - fix
  - refactor
  - sequential-thinking
linkedFrom:
  - cook
  - audit
  - team
preferredNextSkills:
  - verify
  - quality-gate
fallbackSkills:
  - sequential-thinking
riskLevel: low
memoryReadPolicy: full
memoryWritePolicy: full
sideEffects:
  - "Creates Tekio adaptations in database"
  - "Creates memory entries in database"
---

# Learn Pattern

## Purpose

Extract reusable engineering patterns from the current session and persist them
for future sessions. Unlike Tekio wheel-turns (which learn from failures), this
skill proactively captures **successes, techniques, and insights** mid-session.

Use this when:
- You just solved a non-trivial problem worth remembering
- A debugging technique worked well and should be reusable
- You discovered a project-specific pattern or convention
- A workaround was found for a known limitation
- A new architectural decision was made

## Key Concepts

### Pattern Types

| Type | Description | Storage | Example |
|------|-------------|---------|---------|
| **Error Resolution** | How a specific error was fixed | Tekio (defensive) | "TS2322 in Neon queries → cast with `as Record<string, unknown>[]`" |
| **Debugging Technique** | Systematic approach that worked | Memory (solution) | "Galaxy canvas memory leak → useMemo for filtered data + useRef for animation" |
| **Project Convention** | Discovered project patterns | Memory (pattern) | "All API routes use `getDb()` singleton, never inline neon import" |
| **Architectural Decision** | Design choices with rationale | Memory (decision) | "Chose pgvector + pg_trgm hybrid over pure vector search for memory recall" |
| **Workaround** | Known limitation with mitigation | Tekio (auxiliary) | "Bash `set -u` + empty arrays → use `${arr[@]+\"${arr[@]}\"}` safe expansion" |
| **Performance Insight** | Optimization that worked | Memory (insight) | "Promise.all for independent DB queries cut response time 60%" |

### Confidence Scoring

Each extracted pattern gets a confidence score:

| Score | Meaning | Criteria |
|-------|---------|----------|
| 0.9-1.0 | **Proven** | Verified by tests, applied 3+ times |
| 0.7-0.8 | **High** | Worked in this session, consistent with docs |
| 0.5-0.6 | **Medium** | Worked once, untested edge cases |
| 0.3-0.4 | **Low** | Hypothesis, not fully validated |

### Storage Decision

```
Is it about preventing a failure?     → Tekio adaptation (defensive)
Is it about detecting issues early?   → Tekio adaptation (auxiliary)
Is it about a better approach?        → Tekio adaptation (offensive)
Is it a project-specific convention?  → Memory (pattern/architecture)
Is it a reusable debugging technique? → Memory (solution)
Is it a design decision?              → Memory (decision)
```

## Workflow

### Phase 1: Review Session Context

Examine recent work in the session:
- What problems were solved?
- What techniques were used?
- What decisions were made and why?
- What errors were encountered and how were they fixed?
- What optimizations were applied?

### Phase 2: Extract Patterns

For each pattern found, capture:

```typescript
{
  content: "Clear, actionable description of the pattern",
  category: "solution" | "pattern" | "decision" | "architecture" | "insight",
  importance: 1-10,    // How broadly applicable
  confidence: 0-1,     // How well validated
  scope: "project/name", // Where it applies
  tags: ["#auto", "#learned", "#category"]
}
```

### Phase 3: Dedup and Validate

Before saving, check against existing knowledge:
1. Search memory DB for similar content (similarity > 0.6 = skip)
2. Check Tekio adaptations for overlapping triggers
3. If duplicate found, update confidence/importance instead of creating new

### Phase 4: Store

```bash
# For memory entries
npx tsx memory/scripts/memory-runner.ts save '<json>'

# For Tekio adaptations (from corrections/failures)
npx tsx memory/scripts/memory-runner.ts wheel-correct '<wrong>' '<right>' [scope]
```

### Phase 5: Report

```
PATTERNS EXTRACTED: 3

  1. [solution] Promise.all for parallel DB queries (confidence: 0.9, importance: 7)
     → Saved to memory: abc123
  2. [defensive] Neon getDb() singleton prevents connection leaks (confidence: 0.8, importance: 8)
     → Saved as Tekio adaptation
  3. [pattern] Dashboard API routes follow getDb() + try/catch + NextResponse pattern
     → Already exists (updated confidence 0.7 → 0.85)
```

## Best Practices

1. **Extract at logical boundaries** — after completing a feature, fixing a bug, or finishing a refactor
2. **Focus on reusable patterns** — skip one-time fixes that won't recur
3. **Include the WHY** — "Use getDb() because inline neon imports create connection leaks" not just "Use getDb()"
4. **Set confidence honestly** — a pattern used once is 0.5-0.6, not 0.9
5. **Scope appropriately** — project-specific patterns get project scope, universal ones get no scope
6. **One pattern per entry** — don't combine unrelated insights into one memory
7. **Check for contradictions** — if new pattern conflicts with existing memory, flag for resolution

## Common Pitfalls

| Pitfall | Impact | Fix |
|---------|--------|-----|
| Saving trivial patterns | Memory pollution, low signal-to-noise | Filter: importance >= 5 for patterns |
| Missing the WHY | Pattern is remembered but not understood | Always include rationale and context |
| Over-confident scoring | False patterns get applied broadly | Start at 0.5, let repeated use increase confidence |
| Not deduplicating | Same pattern saved 5 times | Always search before saving |
| Too broad scope | Project-specific pattern applied globally | Scope patterns to project unless truly universal |
| Saving during exploration | Half-baked insights pollute memory | Only save after validation/verification |

## Examples

### After Debugging a Memory Leak

```
Extracted pattern:
  Content: "React canvas animations with filter state: use useMemo for filtered
  data and useRef for values needed in animation loop. Never depend on state
  directly in requestAnimationFrame — use refs to avoid teardown/rebuild."
  Category: solution
  Importance: 7
  Confidence: 0.85
  Tags: #react #animation #performance #memory-leak
```

### After Discovering a Convention

```
Extracted pattern:
  Content: "UltraThink dashboard API routes pattern: import getDb from @/lib/db,
  wrap handler in try/catch, return NextResponse.json with proper status codes.
  Never use inline neon() imports — they create connection pool issues."
  Category: pattern
  Importance: 8
  Confidence: 0.9
  Scope: ai-agents/ultrathink
  Tags: #convention #api #database
```

### After a Security Fix

```
Extracted Tekio adaptation:
  Trigger: "SQL query with user input"
  Rule: "Always use websearch_to_tsquery() instead of to_tsquery() for user-provided
  search terms. to_tsquery() throws on special characters — websearch_to_tsquery()
  handles them gracefully."
  Category: defensive
  Confidence: 0.95
```

## Integration with Session Lifecycle

Learn-pattern can be invoked:
- **Manually** — user says "learn from this" or "/learn"
- **At session end** — evaluate-session hook extracts patterns automatically
- **After cook/ship** — preferredNextSkill chain suggests learning
- **After debug/fix** — error resolution patterns are prime learning material
