---
name: autonomous-loops
description: Loop patterns for autonomous agent work including sequential pipelines, watch loops, infinite agentic loops, PR loops, de-sloppify, and RFC-driven DAGs.
layer: utility
category: agent-patterns
triggers:
  - autonomous loop
  - agent loop
  - continuous loop
  - loop pattern
  - agentic workflow
  - watch loop
  - pr loop
  - de-sloppify
linksTo:
  - ai-agents
  - cost-aware-pipeline
  - subagent-driven-development
riskLevel: medium
---

# Autonomous Loops — Agent Loop Patterns

6 patterns for autonomous agent work. Each has specific use cases, stop conditions, and safety requirements.

## Pattern 1: Sequential Pipeline

Chain agents where each output feeds the next.

```bash
# Generate → Review → Fix
claude -p "implement feature X" | claude -p "review this code for bugs" | claude -p "fix the issues found"
```

**Use when**: Linear workflow with clear stages.
**Stop condition**: Pipeline completes or any stage fails.

## Pattern 2: Watch Loop

File watcher triggers agent on changes.

```bash
# Watch for changes, run agent on each
fswatch -o src/ | while read; do
  claude -p "run tests and fix any failures in src/"
done
```

**Use when**: Continuous feedback during development.
**Stop condition**: Manual interrupt or error threshold.

## Pattern 3: Infinite Agentic Loop

Agent runs continuously with explicit stop conditions.

```bash
while true; do
  result=$(claude -p "check for issues in the codebase and fix one. Reply DONE if none found.")
  if echo "$result" | grep -q "DONE"; then break; fi
  ((count++))
  if [ $count -ge 20 ]; then echo "Max iterations reached"; break; fi
done
```

**Use when**: Iterative improvement until convergence.
**Stop conditions** (MUST have at least one):
- Task completion signal ("DONE")
- Max iteration count
- Time budget exceeded
- Cost budget exceeded

## Pattern 4: Continuous PR Loop

Monitor repository for PRs, review, and optionally merge.

```bash
while true; do
  prs=$(gh pr list --state open --json number,title)
  for pr in $(echo "$prs" | jq -r '.[].number'); do
    claude -p "review PR #$pr: $(gh pr diff $pr). Approve if good, request changes if not."
  done
  sleep 300  # Check every 5 minutes
done
```

**Use when**: Automated code review pipeline.
**Stop condition**: Manual interrupt, shift end, or error threshold.

## Pattern 5: De-Sloppify Pattern

Iterative quality improvement — each pass tightens one aspect.

```bash
# Pass 1: Type safety
claude -p "add strict TypeScript types to all functions in src/"
# Pass 2: Error handling
claude -p "add proper error handling to all async functions in src/"
# Pass 3: Tests
claude -p "add unit tests for all untested functions in src/"
# Pass 4: Docs
claude -p "add JSDoc to all exported functions in src/"
```

**Use when**: Incrementally improving existing codebase quality.
**Stop condition**: All quality passes complete, or quality threshold met.

## Pattern 6: RFC-Driven DAG

Spec first, then parallel implementation, then merge.

```
Phase 1: claude -p "write an RFC for feature X"
Phase 2: (parallel)
  claude -p "implement module A per RFC" &
  claude -p "implement module B per RFC" &
  claude -p "implement module C per RFC" &
  wait
Phase 3: claude -p "integrate modules A, B, C and run tests"
```

**Use when**: Large features that can be decomposed into independent modules.
**Stop condition**: Integration tests pass.

## Decision Matrix

| Pattern | Complexity | Cost Risk | Best For |
|---------|-----------|-----------|----------|
| Sequential Pipeline | Low | Low | Linear workflows |
| Watch Loop | Low | Medium | Dev feedback |
| Infinite Agentic | Medium | **High** | Convergence tasks |
| Continuous PR | Medium | Medium | CI/CD automation |
| De-Sloppify | Low | Medium | Quality uplift |
| RFC-Driven DAG | High | Medium | Large features |

## Anti-Patterns

1. **No stop condition**: Infinite loop without exit → cost explosion
2. **Unbounded retries**: Retrying the same failing operation → burns tokens
3. **No cost tracking**: Running overnight without budget limits
4. **No isolation**: Agent modifying production without sandbox
5. **Silent failures**: Loop swallows errors and continues
6. **No rollback**: Agent makes changes with no way to revert

## Safety Requirements

Every autonomous loop MUST have:

- **Budget limit**: Max tokens, max cost, or max iterations
- **Rollback mechanism**: Git branch, backup, or dry-run mode
- **Isolation**: Run against branch/staging, never production directly
- **Logging**: Record every action for post-run audit
- **Alert threshold**: Notify on repeated failures or unexpected behavior
- **Kill switch**: Easy way to stop the loop immediately

## UltraThink Integration

- Use `cost-aware-pipeline` skill for model routing within loops (Sonnet for coding passes, Opus for review)
- Use `subagent-driven-development` for the RFC-DAG pattern's parallel phase
- Log loop outcomes to memory system for future learning
- Use VFS for cheap file scanning within watch loops (avoid full reads per iteration)
