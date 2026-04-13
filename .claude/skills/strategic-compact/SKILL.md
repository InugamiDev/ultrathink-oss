---
name: strategic-compact
description: Decision guide for when and how to compact context strategically, preserving critical state while reclaiming token budget.
layer: utility
category: optimization
triggers:
  - compact
  - strategic compact
  - context management
  - free up context
  - running out of context
  - compaction
linksTo:
  - context-budget
riskLevel: low
---

# Strategic Compact — Context Management

Know when to compact and what to preserve. Bad compaction loses critical state. Good compaction extends your effective session length.

## When to Compact

### Trigger Points

1. **Phase transition**: Finished planning → starting implementation
2. **After big reads**: Explored many files, now know what to change
3. **Before new task**: Switching focus within same session
4. **Context pressure**: Responses slowing, hitting limits
5. **After debugging**: Root cause found, fix applied, debug trace no longer needed
6. **Post-review**: Code review complete, feedback incorporated

### When NOT to Compact

- Mid-debug with active hypothesis
- Holding multiple file contents needed for cross-file refactor
- Waiting for user decision on alternatives presented
- Active error context not yet resolved

## Survival Rules

### What Survives Compaction

| Category | Examples | Why |
|----------|----------|-----|
| Current task | Goal, acceptance criteria | Core mission |
| Files modified | Paths + what changed | Resume point |
| Decisions made | Architecture choices, trade-offs | Avoid re-debating |
| Pending work | Next steps, blockers | Continuity |
| Debug context | Root cause if still fixing | Don't re-diagnose |
| Breadcrumbs | `// intent:` comments in code | Persistent context |

### What Gets Dropped

| Category | Examples | Why |
|----------|----------|-----|
| Exploratory reads | Files read but not modified | Can re-read via VFS |
| Verbose tool output | Full `git log`, large diffs | Reference by summary |
| Rejected drafts | Discarded approaches | Decision recorded, draft irrelevant |
| CLAUDE.md contents | Project instructions | Auto-reloaded on compact |
| Full file contents | Entire source files | Reference by path + line range |
| Resolved errors | Stack traces from fixed bugs | Fix applied, trace stale |

## Pre-Compact Checklist

Before compacting, ensure:

- [ ] **Breadcrumbs planted**: Modified files have `// intent:` / `// status:` comments
- [ ] **Plan updated**: If using a plan, current progress is recorded
- [ ] **Key paths noted**: List all files actively being modified
- [ ] **Decisions documented**: Important choices are in breadcrumbs or plan, not just conversation
- [ ] **No pending output**: All critical tool results have been acted on
- [ ] **Memory saved**: Important learnings flushed to memory system if applicable

## Compact Strategy by Scenario

### After Exploration
```
Preserve: target files identified, architecture understanding, chosen approach
Drop: all file contents read during exploration, rejected paths
```

### After Implementation Phase
```
Preserve: what was built, remaining tasks, test results
Drop: intermediate drafts, build output, resolved lint errors
```

### After Debugging
```
Preserve: root cause, fix applied, files changed, any remaining issues
Drop: failed hypotheses, stack traces, exploratory reads
```

### Task Switch
```
Preserve: summary of completed task, files touched
Drop: all implementation details of completed task
```

## UltraThink Integration

- **Memory system**: Save important context to memory before compacting
  ```bash
  npx tsx memory/scripts/memory-runner.ts save --scope project --content "..."
  ```
- **VFS recovery**: After compaction, use `mcp__vfs__extract` to cheaply re-examine files (~200 tokens vs ~3000)
- **Breadcrumbs**: Code comments survive compaction — they're in the files, not the conversation
- **Auto-memory**: Check `/tmp/ultrathink-memories/` for auto-saved context before compacting
