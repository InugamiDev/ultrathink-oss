# GSD — Get Shit Done Reference

> Spec-driven development with fresh-context agents and goal-backward verification.
> Integrated with OpenSpec lifecycle, Tekiō adaptations, and UltraThink hooks.

## Quick Start (MANDATORY for every GSD session)

```bash
# 1. Initialize .planning/ if it doesn't exist
mkdir -p .planning

# 2. Create SPEC.md — the contract (OpenSpec)
# Write: Problem Statement, Acceptance Criteria, Constraints, Non-Goals

# 3. Create STATE.md — living memory (100 lines max)
# Write: Current phase/status, decisions, blockers, next steps

# 4. Create PLAN.md files — plans ARE prompts
# Each plan: must-haves traced to SPEC.md, 2-3 tasks max, wave assignment

# 5. Execute → Verify → Archive
```

**If `.planning/` already exists**: Read STATE.md first. Resume from where you left off.

## Deviation Rules (Sacred)

| # | Condition | Action |
|---|-----------|--------|
| 1 | Bug blocks task | Auto-fix, document, continue |
| 2 | Missing dependency | Install, document, continue |
| 3 | Minor adjustment (<5 min) | Fix, document, continue |
| 4 | **Architecture change** | **STOP. Report to user.** |
| 5 | **Scope creep** | **STOP. Document for future phase.** |

## OpenSpec Lifecycle

### SPEC.md — Source of Truth

Every GSD project MUST have a SPEC.md in `.planning/`:

```markdown
# Spec: {title}

## Problem Statement
{WHY, not WHAT}

## Acceptance Criteria
- [ ] {Testable, user-visible behavior}
- [ ] {Measurable outcome}

## Constraints
- {Technical or business constraints}

## Non-Goals (scope fence)
- {Explicitly deferred work}
```

**Rules:**
- Acceptance criteria MUST be testable
- PLAN.md must-haves MUST trace to SPEC.md criteria
- If spec changes mid-execution → STOP, update SPEC.md, append SPEC.changelog.md

### SPEC.changelog.md — Version History

```markdown
## [{date}] {change description}
**Reason**: {why the spec changed}
**Added/Removed/Modified**: {what changed}
**Impact**: {which plans are affected}
```

### Archive Lifecycle

After verification passes:
1. Move spec + plans + verification to `.planning/archive/{date}-{title}/`
2. Extract docs to `.planning/docs/`
3. Write JOURNAL.md retrospective
4. Feed lessons to Tekiō via learn-pattern

## Context Management

### Context Budget
- Orchestrator: **never exceed 15%** of context window
- Each subagent: fresh 200K tokens

### When to Spawn Agents
- Task requires >5 file reads or >3 file edits
- Would add >10% to current context
- Research tasks (always parallel)

### When NOT to Spawn
- Quick lookups (1-2 files), single edits, git ops

## Plan Template

```markdown
# Plan: {phase}-{number} — {title}

<plan_metadata>
wave: {number}
depends_on: [{plan-ids}]
estimated_tasks: {2-3}
risk: {low|medium|high}
</plan_metadata>

## Context
{Everything the agent needs — patterns, snippets, conventions}

## Must-Haves
- [ ] {Traced to SPEC.md acceptance criterion #N}
- [ ] Build passes with no new errors
- [ ] Existing tests still pass

## Tasks
### Task {n}: {title}
**Files:** {list}
**Approach:** {step-by-step}
**Verification:** {how to confirm}

## Deviation Rules
{Include rules 1-5}

## References
{Paste code snippets — agent only sees this plan}
```

## Progress Tracking

Write progress to `/tmp/ultrathink-progress-{session_id}` so statusline + Discord show live updates:

```json
{
  "mode": "gsd",
  "phase": 1, "wave": 1, "total_waves": 2,
  "agents": [
    {"plan": "1-1", "status": "running", "tasks_total": 3, "tasks_done": 1, "current_task": "Task 2"}
  ],
  "tasks": {"total": 5, "completed": 1}
}
```

## .planning/ Directory

```
.planning/
  SPEC.md               — Acceptance criteria (source of truth)
  SPEC.changelog.md     — Timestamped spec revisions
  STATE.md              — Living memory (100 lines max)
  RESEARCH.md           — Codebase analysis
  {phase}-{n}-PLAN.md   — Execution plans
  {phase}-{n}-SUMMARY.md — Execution summaries
  VERIFICATION.md       — Verification results
  archive/              — Completed projects by date
  docs/                 — Extracted documentation
```

## STATE.md Template (100 lines max)

```markdown
# State

## Current
Phase: {n}, Plan: {n}, Status: {planning|executing|verifying}

## Completed
- Phase 1: {summary} ({n} plans, all verified)

## Decisions
- {Decision with rationale}

## Blocked
- None

## Next
- {What comes next}
```

## Skill Chain

```
User prompt → auto-trigger detects build/implement intent
  → gsd (unified orchestrator, stays thin at ~10-15% context)
    → gsd plan   — research + SPEC.md + PLAN.md files
    → gsd execute — wave-based agent spawning
      → Agent per plan (fresh 200K context each)
    → gsd verify — goal-backward verification
    → plan-archive (archive + journal + docs)
    → learn-pattern → Tekiō (adapt from results)

  → gsd quick (lightweight mode for small/trivial tasks)
    → Inline spec + execute + verify, no subagents
```

## Integration Points

| System | Integration |
|--------|------------|
| **Tekiō** | Rule 4 violations → wheel-turn. Stubs → wheel-turn. Successes → learn-pattern. |
| **Memory** | Decisions → save. Conventions → save. Archive journals → save. |
| **Hooks** | context-monitor warns at 65/75%. post-edit-typecheck catches errors. tool-observe logs usage. |
| **Discord** | Session start/end + Tekiō turns + progress updates + compaction events. |
| **Statusline** | L2 shows GSD wave progress when active. L3 shows hook activity. |
