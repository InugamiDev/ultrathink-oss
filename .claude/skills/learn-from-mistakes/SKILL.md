---
name: learn-from-mistakes
description: Memory-powered error learning system — 5-phase chain-of-thought that recognizes errors, recalls past solutions, reasons about applicability, resolves issues, and persists learnings for future sessions
layer: hub
category: workflow
triggers:
  - "same bug again"
  - "I've seen this before"
  - "why does this keep happening"
  - "recurring error"
  - "learn from this"
  - "remember this fix"
  - "this broke again"
  - "we fixed this before"
  - "error pattern"
  - "persistent bug"
inputs:
  - error: Error message, stack trace, or symptom description
  - context: Technology stack, file paths, recent changes (optional)
  - history: Previous fix attempts or related memories (auto-populated from memory)
outputs:
  - diagnosis: Root cause with confidence level and evidence chain
  - solution: Fix with provenance (recalled vs. novel)
  - memory_entry: Persisted learning for future sessions
  - failed_approaches: Dead-end paths recorded to prevent repetition
linksTo:
  - debug
  - fix
  - error-handling
  - sequential-thinking
linkedFrom:
  - cook
  - debug
  - team
  - ship
preferredNextSkills:
  - fix
  - test
fallbackSkills:
  - debug
  - sequential-thinking
riskLevel: low
memoryReadPolicy: full
memoryWritePolicy: always
sideEffects:
  - Writes error solution memories to /tmp/ultrathink-memories/
  - Reads all memories matching error patterns
  - May delegate to debug or fix skills
---

# Learn From Mistakes

## Purpose

A memory-powered error learning system that breaks the cycle of re-investigating the same bugs. Instead of treating every error as novel, this skill first searches persistent memory for prior encounters, applies recalled solutions when context matches, and always persists new learnings for future sessions.

The core principle: **every debugging session should make the next one faster.**

## 5-Phase Chain-of-Thought Workflow

```
RECOGNIZE  -->  RECALL  -->  REASON  -->  RESOLVE  -->  REMEMBER
(fingerprint)  (search)    (analyze)    (apply)      (persist)
```

---

## Phase 1: RECOGNIZE — Error Fingerprinting

Extract a structured fingerprint from the error to enable effective memory search.

### Fingerprint Schema

```
error_type:       The class of error (e.g., TypeError, NEXT_NOT_FOUND, E_MODULE_NOT_FOUND)
normalized_msg:   Error message with variable parts stripped (IDs, paths, timestamps, hashes)
error_code:       Numeric or string error code if present (e.g., E0308, TS2345, ECONNREFUSED)
stack_context:    Top 3 meaningful frames (skip node_modules, framework internals)
technology:       Primary technology involved (react, nextjs, prisma, postgres, etc.)
domain:           Problem domain (rendering, data-fetching, auth, build, deploy, state, routing)
severity:         crash | error | warning | degradation
```

### Normalization Rules

Strip variable parts to create stable fingerprints that match across occurrences:

| Pattern | Replace With |
|---------|-------------|
| UUIDs (`550e8400-e29b-...`) | `<UUID>` |
| File paths (`/Users/name/...`) | `<PATH>` |
| Timestamps (`2026-03-02T...`) | `<TIMESTAMP>` |
| Port numbers (`:3000`, `:5432`) | `:<PORT>` |
| Line/column numbers (`line 42, col 8`) | `line <N>, col <N>` |
| Hash strings (`a3f8b2c1...`) | `<HASH>` |
| Numeric IDs (`id: 12345`) | `id: <ID>` |

### Error Categories

```
syntax        Code structure errors (missing brackets, invalid tokens, parse failures)
type          Type mismatches, null/undefined access, incorrect argument types
runtime       Unhandled exceptions, assertion failures, out-of-bounds access
network       Connection refused, timeout, DNS resolution, CORS, HTTP errors
data          Schema mismatch, missing fields, invalid state, constraint violations
config        Environment variables, build config, missing dependencies, version conflicts
logic         Wrong output, incorrect branching, off-by-one, race conditions
integration   API contract mismatch, version incompatibility, service interaction failures
```

### Fingerprint Example

```
Input:  "TypeError: Cannot read properties of undefined (reading 'map')"
        at UserList.tsx:45
        using React + Next.js

Output:
  error_type:     TypeError
  normalized_msg: "Cannot read properties of undefined (reading '<PROP>')"
  error_code:     null
  stack_context:  ["UserList.tsx:<N>"]
  technology:     react
  domain:         rendering
  severity:       crash
  category:       type
```

---

## Phase 2: RECALL — Memory Search

Search persistent memory for prior encounters with this error. Use a 3-pass strategy with decreasing specificity.

### Pass 1: Exact Match

Search for memories where:
- `category` = `solution` AND `tags` include `#bugfix`
- Content contains the `error_code` OR `normalized_msg`
- `scope` matches current project or is global

```
Query: category:solution tags:#bugfix content:"Cannot read properties of undefined"
```

If exact match found with confidence >= 0.8: proceed directly to Phase 3 with HIGH recall.

### Pass 2: Fuzzy Match

If Pass 1 returns no results, broaden the search:
- Extract key terms from the error message (strip common words)
- Match against `technology` + key terms
- Include `category` in (`solution`, `pattern`, `insight`)

```
Query: tags:#bugfix technology:react content:("undefined" AND "map" AND "properties")
```

If fuzzy match found: proceed to Phase 3 with MEDIUM recall.

### Pass 3: Pattern Match

If Pass 2 returns no results, search by error category and technology:
- Match `error_category` + `technology` + `domain`
- Look for structural patterns, not specific messages
- Include `category` in (`solution`, `pattern`, `insight`, `convention`)

```
Query: tags:#bugfix technology:react domain:rendering category_match:type
```

If pattern match found: proceed to Phase 3 with LOW recall.
If no match at all: proceed to Phase 3 with NO recall (delegate to debug).

### Ranking Formula

When multiple memories match, rank by:

```
score = message_similarity * 0.35
      + tech_match       * 0.25
      + recency          * 0.15
      + confidence       * 0.15
      + access_count     * 0.10
```

| Factor | Calculation |
|--------|-------------|
| `message_similarity` | Normalized Levenshtein distance of error messages (0-1) |
| `tech_match` | 1.0 if same tech stack, 0.5 if same category, 0.0 if different |
| `recency` | `1 / (1 + days_since_last_access / 30)` — decays over ~90 days |
| `confidence` | Memory's stored confidence score (0-1) |
| `access_count` | `min(access_count / 10, 1.0)` — caps at 10 accesses |

---

## Phase 3: REASON — Chain-of-Thought Analysis

Apply structured reasoning to determine if a recalled solution applies to the current context.

### If Recall Hit (HIGH or MEDIUM)

Follow this reasoning chain:

```
1. "I've seen this error before."
2. "Last time, the root cause was: [recalled_cause]"
3. "The fix was: [recalled_fix]"
4. "Comparing contexts:"
   SAME:      [list matching factors — same tech, same error, same domain]
   DIFFERENT: [list differing factors — different file, different data, different version]
5. "Transferability assessment: HIGH | MEDIUM | LOW"
6. "Decision: APPLY DIRECTLY | ADAPT | INVESTIGATE FURTHER"
```

### Transferability Matrix

| Same Tech | Same Error | Same Domain | Transferability | Action |
|-----------|-----------|-------------|-----------------|--------|
| Yes | Yes | Yes | HIGH | Apply directly |
| Yes | Yes | No | MEDIUM | Adapt solution |
| Yes | No | Yes | MEDIUM | Adapt solution |
| Yes | No | No | LOW | Investigate, use as hypothesis |
| No | Yes | - | LOW | Investigate, use as hypothesis |
| No | No | - | NONE | Delegate to debug |

### If Recall Hit (LOW / Pattern Match)

```
1. "No exact match, but I found a similar pattern."
2. "Pattern: [error_category] errors in [technology] are often caused by: [common_causes]"
3. "This gives me a starting hypothesis, but I need to investigate."
4. "Delegating to debug skill with hypothesis H1: [pattern-informed guess]"
```

### If No Recall

```
1. "This is a new error — no prior encounters in memory."
2. "Delegating to debug skill for full investigation."
3. "Flagging for Phase 5 persistence after resolution."
```

### Failed Approach Check

Before applying any solution, check memory for recorded failed approaches:

```
Query: category:solution tags:#failed-approach content:[error_fingerprint]
```

If found: explicitly skip those approaches and note them:

```
"Previously tried and failed: [approach]. Skipping this path."
```

This prevents repeating dead-end investigations.

---

## Phase 4: RESOLVE — Apply or Delegate

Based on the reasoning outcome, take the appropriate action.

### High Confidence (>= 0.8, same context)

Apply the recalled solution directly:

1. Present the recalled solution with provenance: "Recalled from [date] session"
2. Hand off to `fix` skill with the specific solution
3. Verify the fix resolves the error
4. If verification fails: downgrade confidence, fall through to Medium path

### Medium Confidence (0.5 - 0.8)

Present as a hypothesis and investigate:

1. Frame as: "Based on a similar past error, hypothesis H1 is: [recalled_cause]"
2. Hand off to `debug` skill with H1 pre-loaded
3. Debug will test H1 first before exploring alternatives
4. If H1 confirmed: apply fix, boost recalled memory confidence
5. If H1 rejected: continue debug workflow, record H1 as failed approach

### Low / No Confidence (< 0.5)

Full delegation to debug:

1. Hand off to `debug` skill with all available context
2. If pattern-match memories exist, pass them as "background context" (not hypotheses)
3. After resolution, proceed to Phase 5 to persist the new solution

### Resolution Verification

After any fix is applied:

```
1. Re-run the failing operation
2. Confirm the error no longer occurs
3. Check for regression (did the fix break anything else?)
4. If verified: proceed to Phase 5
5. If not verified: record as failed approach, try next strategy
```

---

## Phase 5: REMEMBER — Persist for Future

Every resolved error produces a memory entry for future sessions. This is the most critical phase.

### Memory Entry Schema

Write to: `/tmp/ultrathink-memories/{timestamp}-error-{slug}.json`

```json
{
  "content": "ERROR: [normalized_msg]\nCONTEXT: [technology, domain, file]\nSYMPTOM: [what was observed]\nROOT CAUSE: [identified cause with evidence]\nFAILED ATTEMPTS: [approaches that didn't work]\nSOLUTION: [what fixed it]\nPREVENTION: [how to avoid in the future]",
  "category": "solution",
  "importance": 5,
  "confidence": 0.7,
  "scope": "project/current-project",
  "tags": ["#bugfix", "#error-type", "#technology", "#domain"]
}
```

### Importance Scoring

```
Base importance: 5
+1 for each recurrence (max 10)
+1 if resolution took > 30 minutes of investigation
+1 if the error affected multiple files
+1 if the fix was non-obvious (required domain knowledge)
+1 if it's a common framework/library gotcha
Cap at 10
```

### Confidence Scoring

```
Initial confidence: 0.7 (first resolution)
+0.1 per confirmed reuse (solution worked again in a different context)
+0.05 per re-encounter (same error seen again, same fix applied)
-0.1 if solution failed in a different context
-0.2 if a better solution was found later
Cap at 1.0, floor at 0.3
```

### On Re-encounter

When a previously-persisted error is encountered again:

1. Increment `access_count` on the memory entry
2. Bump `confidence` by +0.05
3. If context differs from original: append new context to the memory
4. If a different/better fix is found: update solution, note the evolution

### Failed Approach Persistence

**Critical**: Always record what DIDN'T work. This prevents future sessions from wasting time on dead ends.

```json
{
  "content": "FAILED APPROACH for [error_fingerprint]:\nAttempted: [what was tried]\nResult: [why it failed]\nLesson: [what this tells us about the problem]",
  "category": "solution",
  "importance": 4,
  "confidence": 0.9,
  "scope": "project/current-project",
  "tags": ["#failed-approach", "#bugfix", "#technology"]
}
```

### Prevention Annotations

For errors with clear prevention strategies, annotate the memory:

```
PREVENTION:
- Lint rule: [specific ESLint rule that would catch this]
- Type guard: [TypeScript pattern that prevents this]
- Convention: [coding convention that avoids this]
- Test: [test case that would catch this regression]
```

---

## Decision Tree Summary

```
ERROR OCCURS
  |
  v
[RECOGNIZE] --> Fingerprint the error
  |
  v
[RECALL] --> Search memory (3 passes)
  |
  +---> Exact match (HIGH confidence)
  |       |
  |       v
  |     [REASON] --> Context same? --> YES --> [RESOLVE] Apply directly
  |                                    |
  |                                    NO --> Adapt solution
  |
  +---> Fuzzy match (MEDIUM confidence)
  |       |
  |       v
  |     [REASON] --> Present as hypothesis H1 --> [RESOLVE] Debug with H1
  |
  +---> Pattern match (LOW confidence)
  |       |
  |       v
  |     [REASON] --> Background context only --> [RESOLVE] Full debug
  |
  +---> No match
          |
          v
        [RESOLVE] --> Full debug delegation
  |
  v
[REMEMBER] --> Persist solution + failed approaches + prevention
```

---

## Integration Points

### With `debug` Skill

When delegating to debug, pass:
- Error fingerprint (Phase 1 output)
- Any recalled hypotheses (Phase 2 output)
- Failed approaches from memory (Phase 3 check)
- Context comparison if available (Phase 3 output)

### With `fix` Skill

When handing off to fix, pass:
- The specific solution to apply
- Provenance (recalled vs. novel)
- Confidence level
- Verification criteria

### With `error-handling` Skill

After resolution, consult error-handling for:
- Whether the error should be caught and handled in code
- Appropriate error boundary placement
- User-facing error message improvements

### With `sequential-thinking` Skill

For complex errors with multiple potential causes, use sequential-thinking to:
- Systematically work through cause elimination
- Track which hypotheses have been tested
- Ensure no potential cause is overlooked

---

## Examples

### Example 1: Recalled Solution (HIGH confidence)

```
ERROR: "TypeError: Cannot read properties of undefined (reading 'map')"

Phase 1 (RECOGNIZE):
  Fingerprint: TypeError / "Cannot read properties of undefined (reading '<PROP>')" / react / rendering

Phase 2 (RECALL):
  Pass 1 hit! Memory from 2026-02-15:
    "TypeError undefined map in React — data was fetched async but component
     rendered before data arrived. Fix: add optional chaining (data?.items?.map)
     or guard with early return if !data."
  Confidence: 0.85

Phase 3 (REASON):
  Same: react, rendering, same error pattern
  Different: different component, different data shape
  Transferability: HIGH
  Decision: APPLY DIRECTLY

Phase 4 (RESOLVE):
  Apply optional chaining pattern → fix skill
  Verified: error resolved

Phase 5 (REMEMBER):
  Update existing memory: access_count++, confidence 0.85 → 0.90
  Append new context: "Also seen in UserList component with API data"
```

### Example 2: Novel Error (NO recall)

```
ERROR: "NEXT_REDIRECT_ERROR: NEXT_REDIRECT" in Server Component

Phase 1 (RECOGNIZE):
  Fingerprint: NEXT_REDIRECT_ERROR / nextjs / routing / crash

Phase 2 (RECALL):
  Pass 1: No match
  Pass 2: No match
  Pass 3: No match (new error type)

Phase 3 (REASON):
  "New error — no prior encounters. Delegating to debug."

Phase 4 (RESOLVE):
  Debug investigation reveals: redirect() called inside try/catch block.
  Next.js redirect() throws an error internally — catching it prevents the redirect.
  Fix: move redirect() outside try/catch, or re-throw NEXT_REDIRECT errors.

Phase 5 (REMEMBER):
  New memory created:
    content: "NEXT_REDIRECT_ERROR in Server Component — redirect() throws internally,
              must not be caught in try/catch. Move redirect() outside catch block
              or re-throw errors matching NEXT_REDIRECT."
    importance: 7 (common Next.js gotcha)
    confidence: 0.8
    tags: ["#bugfix", "#nextjs", "#routing", "#server-components"]
    prevention: "Never wrap redirect() in try/catch without re-throwing NEXT_REDIRECT"
```

### Example 3: Failed Approach Recovery

```
ERROR: "ECONNREFUSED 127.0.0.1:5432" — Postgres connection failure

Phase 2 (RECALL):
  Memory found with solution AND failed approach:
    Solution: "Check if Postgres service is running (brew services list)"
    Failed approach: "Tried changing DATABASE_URL port — wrong, service was just stopped"

Phase 3 (REASON):
  "Previously encountered. Last time, changing the port was a dead end.
   The actual fix was restarting the Postgres service.
   Skipping port change, going straight to service check."

Phase 4 (RESOLVE):
  Check service status → Postgres stopped → restart
  Verified: connection restored

Phase 5 (REMEMBER):
  access_count++, confidence 0.85 → 0.90
```

---

## Pitfalls

1. **Don't over-match** — A similar error message doesn't mean the same root cause. Always verify context similarity in Phase 3.
2. **Don't skip Phase 5** — Even if the fix was trivial, persist it. Trivial fixes are often the most recurring.
3. **Don't ignore failed approaches** — Recording what didn't work is as valuable as recording what did.
4. **Don't persist speculative solutions** — Only persist solutions that were verified in Phase 4.
5. **Don't blindly apply recalled fixes** — Always run the transferability assessment. Same error + different context = different root cause is common.
6. **Don't forget prevention** — The best bug fix is the one that prevents the bug from recurring at the code level.
