---
name: plan-archive
description: Archive completed plans, extract lessons learned, and write journey journals to long-term memory
layer: hub
category: workflow
triggers:
  - "/plan-archive"
  - "archive this plan"
  - "plan is done"
  - "wrap up the plan"
  - "write a retrospective"
inputs:
  - plan: The completed (or abandoned) implementation plan
  - outcome: What actually happened -- successes, deviations, failures (optional, will be inferred from context)
  - journalNotes: User-provided reflections or notes (optional)
outputs:
  - archive: Structured archive entry with plan summary, outcome, and metadata
  - journeyJournal: Narrative lessons-learned document for long-term memory
  - patterns: Extracted reusable patterns or anti-patterns
linksTo:
  - kanban
  - research
linkedFrom:
  - plan
  - cook
  - team
  - ship
preferredNextSkills:
  - kanban
  - brainstorm
fallbackSkills:
  - plan
riskLevel: low
memoryReadPolicy: selective
memoryWritePolicy: selective
sideEffects:
  - Writes archive entry to memory
  - Writes journey journal to memory
  - Updates kanban board status if applicable
---

# Plan-Archive Skill

## Purpose

Close the loop on completed or abandoned plans by extracting what happened, why it happened, and what future plans should learn from it. This skill transforms lived experience into institutional memory.

Without archiving, every plan starts from zero. With archiving, each plan benefits from all prior plans.

## Workflow

### Phase 1: Outcome Capture

1. **Locate the plan** -- Find the plan being archived from context, memory, or user reference.
2. **Determine plan status**:
   - **Completed**: All phases delivered as planned
   - **Completed with deviations**: Delivered, but the path diverged from the plan
   - **Partially completed**: Some phases delivered, others not
   - **Abandoned**: Plan was discarded before completion
3. **For each phase, document**:
   - Was it completed? (Yes / Partial / No / Skipped)
   - Did it match the plan? (Yes / Deviated / Completely Changed)
   - What was the actual complexity vs. estimated?
   - Any surprises or blockers encountered?

### Phase 2: Deviation Analysis

4. **Map plan vs. reality** -- For every deviation between planned and actual:
   - What changed?
   - Why did it change? (bad assumption, new info, scope change, technical constraint)
   - Was the change an improvement or a compromise?
5. **Assess assumption accuracy** -- Go through the original assumptions list:
   - Which were correct?
   - Which were wrong? What was the actual truth?
   - Which were never tested?
6. **Assess risk accuracy** -- Go through the original risks list:
   - Which risks materialized?
   - Which did not?
   - Were there risks that actually happened but were not on the list?

### Phase 3: Lesson Extraction

7. **Identify patterns** -- Reusable insights that apply beyond this specific plan:
   - **Positive patterns**: "When we did X, it worked well because Y"
   - **Anti-patterns**: "When we assumed X, it caused Y; instead do Z"
   - **Process patterns**: "Breaking phase N into smaller chunks would have helped"
8. **Identify decision points** -- Key moments where choices were made:
   - What was decided?
   - What alternatives were considered?
   - In hindsight, was it the right call?
9. **Extract reusable artifacts** -- Code patterns, configurations, or approaches worth remembering.

### Phase 4: Journey Journal

10. **Write the journey journal** -- A narrative document that tells the story of this plan's execution. This is not a dry report; it is a story future-you can read to quickly absorb the context and lessons.

Structure:
```markdown
# Journey Journal: [Plan Title]

## The Mission
[What we set out to do, in plain language]

## What Actually Happened
[Narrative of the execution -- the key turning points, surprises, and decisions]

## What We Learned
[Bullet-pointed lessons, each with enough context to be useful standalone]

## What We Would Do Differently
[Specific, actionable changes for next time]

## Artifacts Worth Keeping
[Code patterns, configs, approaches that should be remembered]
```

### Phase 4.5: Pre-Archive Verification Gate (MANDATORY for GSD)

If this archive is for a GSD project (`.planning/` exists with SPEC.md):

1. **Run the verification gate** before archiving:
   ```bash
   source ~/.claude/hooks/../.claude/hooks/gsd-utils.sh  # or the UltraThink hooks dir
   # Equivalent logic: check SPEC → PLAN traceability + VERIFICATION.md completeness
   ```

2. **Check traceability**: Every SPEC.md acceptance criterion MUST have a corresponding must-have in at least one PLAN.md
3. **Check verification**: Every must-have in VERIFICATION.md must be ✅ PASS — no ❌ FAIL or STUB remaining
4. **If gates fail**: Do NOT archive. Report gaps to user. Create fix plans if needed.
5. **If gates pass**: Proceed to archive.

This prevents incomplete work from being archived as "done".

### Phase 5: Archive and Store

11. **Create the archive entry** using the template below.
12. **Write to memory** -- Store the archive and journey journal where they can be retrieved by future plan, research, or brainstorm invocations.
13. **Update kanban** -- If there is an active kanban board, mark the plan's tasks as archived/completed.
14. **Feed lessons to Tekiō** -- Extract patterns and anti-patterns via `learn-pattern` skill. Successes become offensive adaptations; failures turn the wheel.
15. **Clean up progress** -- Remove `/tmp/ultrathink-progress-*` bridge files.
16. **Notify the user** -- Summarize what was archived and any high-value lessons.

## Archive Entry Template

```markdown
# Archive: [Plan Title]

## Metadata
- **Created**: [date]
- **Archived**: [date]
- **Status**: Completed | Completed with Deviations | Partial | Abandoned
- **Phases completed**: [N] of [M]
- **Overall complexity**: [as experienced, not as planned]

## Plan Summary
[2-3 sentence summary of what the plan aimed to do]

## Outcome Summary
[2-3 sentence summary of what actually happened]

## Phase Outcomes
| Phase | Planned | Actual | Complexity (Plan→Actual) |
|-------|---------|--------|--------------------------|
| 1: [name] | [goal] | [outcome] | Low → Medium |
| 2: [name] | [goal] | [outcome] | Medium → Medium |

## Assumption Audit
| Assumption | Expected | Actual |
|-----------|----------|--------|
| [A1] | True | True |
| [A2] | True | False — [what was actually true] |

## Risk Audit
| Risk | Predicted | Materialized? | Notes |
|------|-----------|---------------|-------|
| [R1] | Medium likelihood | No | |
| [R2] | Low likelihood | Yes | [what happened] |

## Lessons Learned
1. **[lesson title]**: [explanation]
2. **[lesson title]**: [explanation]

## Patterns Extracted
- **Pattern**: [name] — [description and when to apply]
- **Anti-pattern**: [name] — [description and what to do instead]

## Tags
[searchable tags for future retrieval: technology, domain, problem-type]
```

## Usage

### After completing a plan
```
/plan-archive
```

### With notes
```
/plan-archive The WebSocket migration took twice as long as expected because we underestimated the testing surface. The fallback polling mechanism we added was not in the original plan but turned out to be essential.
```

### For abandoned plans
```
/plan-archive We abandoned the GraphQL migration because the team decided to use tRPC instead. Key learning: evaluate alternatives before committing to a migration path.
```

## Examples

### Example: Completed plan archive

**Plan**: "Add dark mode to the app"
**Status**: Completed with deviations
**Key finding**: Phase 2 (component migration) was estimated as Medium but was actually High because 12 third-party components did not respect CSS variables.
**Lesson**: "Always audit third-party component theming support before estimating a theme system migration."
**Pattern**: "Create a compatibility matrix for third-party components before starting theme work."

### Example: Abandoned plan archive

**Plan**: "Migrate from REST to GraphQL"
**Status**: Abandoned at Phase 1
**Key finding**: Schema definition revealed that the existing data model was not graph-shaped; many endpoints were simple CRUD.
**Lesson**: "Match API paradigm to data shape. GraphQL is not always better than REST."
**Anti-pattern**: "Adopting a technology because it is popular rather than because it fits the problem."

## Guidelines

- **Be honest, not diplomatic** -- Archives are for learning, not for looking good. Capture what actually went wrong.
- **Make lessons standalone** -- Each lesson should make sense without reading the full archive. Future retrieval may only return the lesson, not the context.
- **Tag generously** -- The value of an archive is proportional to how findable it is.
- **Archive abandoned plans too** -- Why something was abandoned is often more valuable than why something succeeded.
- **Keep journey journals narrative** -- They should read like a story, not a spreadsheet. Stories are how humans encode and retrieve complex lessons.
- **Do not fabricate outcomes** -- If you do not know what happened in a phase, say so. Do not invent a plausible outcome.
