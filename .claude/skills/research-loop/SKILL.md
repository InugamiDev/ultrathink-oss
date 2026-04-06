---
name: research-loop
description: Iterative experiment loop — read spec, implement, run, evaluate, commit on success or reset and retry with learnings. Git-safe autonomous experimentation.
layer: orchestrator
category: workflow
triggers:
  - "/research-loop"
  - "/experiment"
  - "/iterate"
  - "try different approaches"
  - "experiment with"
  - "iterate until it works"
  - "keep trying until"
  - "run experiments on"
  - "optimize through trial"
  - "find the best approach for"
  - "test multiple approaches"
  - "brute force a solution"
inputs:
  - program: Path to the spec/brief file (default: program.md in working dir)
  - target: Path to the file(s) to modify during experiments
  - command: The command to run the experiment (test, benchmark, script, etc.)
  - success_criteria: How to determine if the experiment succeeded
  - max_iterations: Maximum loop iterations before stopping (default: 10)
  - scratchpad: Path to scratchpad file (default: scratchpad.md in working dir)
outputs:
  - result: Final successful implementation or best attempt
  - scratchpad: Full log of all iterations with results and learnings
  - commit: Git commit hash of the successful result (if any)
  - iterations: Number of attempts made
  - metrics: Collected metrics across all iterations
linksTo:
  - debug
  - test
  - optimize
  - fix
  - plan
  - sequential-thinking
  - learn-from-mistakes
linkedFrom:
  - gsd
  - cook
  - optimize
  - debug
  - plan
preferredNextSkills:
  - test
  - optimize
  - commit-crafter
fallbackSkills:
  - debug
  - sequential-thinking
riskLevel: medium
memoryReadPolicy: selective
memoryWritePolicy: selective
sideEffects:
  - Creates and modifies files (target, scratchpad)
  - Runs shell commands (experiment execution)
  - Git operations (commit on success, reset on failure)
  - May dispatch parallel subagents for multi-approach experiments
---

# Research Loop

## Purpose

Autonomous iterative experimentation engine. Reads a spec, implements an approach,
runs it, evaluates results, and either commits on success or resets and tries again
with accumulated learnings. Git is the safety net — every failed attempt is rolled
back cleanly, every success is preserved.

This is NOT information-gathering research (use `/research` for that).
This is **experimental research** — modify, run, evaluate, learn, repeat.

## The Loop

```
                    +------------------+
                    |  Read program.md |<-----------+
                    +--------+---------+            |
                             |                      |
                    +--------v---------+            |
                    | Implement change |            |
                    +--------+---------+            |
                             |                      |
                    +--------v---------+            |
                    | Run experiment   |            |
                    +--------+---------+    +-------+--------+
                             |              | Update         |
                    +--------v---------+    | scratchpad.md  |
                    | Record results   |    | (learnings)    |
                    +--------+---------+    +-------^--------+
                             |                      |
                      +------v------+               |
                      |  Worked?    +--No---> git reset
                      +------+------+
                             |
                            Yes
                             |
                    +--------v---------+
                    | git commit       |
                    +------------------+
```

## Files

### program.md (the spec)

The research brief. Defines WHAT to achieve and HOW to measure success.
Created by the user or by the `/plan` skill before starting the loop.

```markdown
# Experiment: [Title]

## Objective
[What are we trying to achieve?]

## Target Files
- `path/to/file.ts` — [what to modify and why]

## Run Command
`npm test` | `python train.py` | `./benchmark.sh` | etc.

## Success Criteria
- [ ] Tests pass with 0 failures
- [ ] Latency < 200ms at p95
- [ ] Accuracy > 0.95
- [ ] No regressions in existing tests

## Constraints
- Do not modify the public API
- Keep backward compatibility
- Max 500 lines changed

## Approaches to Try
1. [First approach description]
2. [Second approach if first fails]
3. [Third approach — different strategy]

## Context
[Background information, links, relevant code paths]
```

### scratchpad.md (the lab notebook)

Running log of every iteration. This is the loop's memory — it prevents
repeating failed approaches and builds cumulative understanding.

```markdown
# Scratchpad: [Experiment Title]

## Iteration 1 — [timestamp]
**Approach**: [What was tried]
**Changes**: [Files modified, lines changed]
**Result**: FAIL | PASS
**Output**: [Key output/error — truncated to relevant lines]
**Metrics**: [Any measurable values: time, accuracy, score]
**Learning**: [What did we learn? Why did it fail/succeed?]
**Next**: [What to try differently based on this result]

---

## Iteration 2 — [timestamp]
...
```

## Execution Protocol

### Step 0: Setup

1. Check for `program.md` (or user-specified spec file) — if missing, create it interactively
2. Check for `scratchpad.md` — create if missing, resume from existing if present
3. Read both files to understand current state
4. Verify the run command works (dry run if possible)
5. Ensure git working tree is clean (stash or commit pending changes)

### Step 1: Read the Spec (program.md)

- Parse the objective, success criteria, target files, and run command
- If scratchpad has previous iterations, read the latest learnings
- Determine which approach to try next:
  - If specific approaches are listed and untried, pick the next one
  - If all listed approaches failed, synthesize a novel approach from learnings
  - Never repeat a failed approach without a meaningful variation

### Step 2: Implement the Change

- Modify the target file(s) according to the chosen approach
- Keep changes minimal and focused — one variable per experiment
- If the change is large, break it into sub-experiments

### Step 3: Run the Experiment

- Execute the run command
- Capture stdout, stderr, and exit code
- Extract metrics if applicable (timing, scores, counts)
- Set a timeout (default: 5 minutes per run)

### Step 4: Record Results

Update `scratchpad.md` with:
- Iteration number and timestamp
- The approach taken (brief description)
- Files changed (paths and summary)
- Result: PASS or FAIL
- Raw output (truncated to relevant sections)
- Metrics (if any)
- Learning: What does this result tell us?
- Next: What should the next iteration try?

### Step 5: Evaluate — Did It Work?

**Success** = ALL success criteria from program.md are met.

#### On SUCCESS:
1. Stage the changed files: `git add <target files>`
2. Commit with a descriptive message:
   ```
   feat: [objective achieved]

   Approach: [brief description of what worked]
   Iterations: [N] attempts
   Key learning: [most important insight]
   ```
3. Update scratchpad with final "RESOLVED" status
4. Save key learnings to memory (if memory system available)
5. **STOP the loop** — we're done

#### On FAILURE:
1. `git checkout -- <target files>` (reset changes, keep scratchpad)
2. Stage and commit the scratchpad update:
   ```
   docs: research-loop iteration [N] — [approach] — FAIL
   ```
3. Analyze what went wrong — update the "Next" field in scratchpad
4. Check iteration count against `max_iterations`
   - If under limit: **go to Step 1** (loop back)
   - If at limit: **STOP** — report best attempt and all learnings

## Advanced: Parallel Experiments

For problems with independent approaches, dispatch parallel subagents:

```
Main Agent:
  1. Read program.md
  2. Identify N independent approaches
  3. For each approach, spawn a subagent in a git worktree:
     - Agent gets: program.md + scratchpad.md + assigned approach
     - Agent runs: implement → test → record
     - Agent returns: result + metrics + learnings
  4. Collect all results
  5. Pick the best successful approach (or synthesize from failures)
  6. Apply winner to main branch
  7. Commit
```

Use parallel mode when:
- Approaches are truly independent (no shared state)
- The run command is fast (< 2 min each)
- There are 3+ approaches to try

## Advanced: Metric Tracking

When experiments produce measurable values, track them across iterations:

```markdown
## Metrics Summary
| Iteration | Approach | Latency (p95) | Accuracy | Memory |
|-----------|----------|---------------|----------|--------|
| 1         | Baseline | 450ms         | 0.87     | 120MB  |
| 2         | Cache    | 180ms         | 0.87     | 180MB  |
| 3         | Batch    | 220ms         | 0.91     | 130MB  |
| 4         | Cache+Batch | 160ms      | 0.91     | 175MB  |
```

This reveals trade-offs and guides the next iteration.

## Advanced: Smart Backtracking

When iteration N fails, don't just try something random. Use accumulated learnings:

1. **Pattern match**: Group failures by type (compilation error, test failure, performance regression)
2. **Eliminate**: Cross off approaches that share root cause with known failures
3. **Combine**: If approach A improved metric X and approach B improved metric Y, try A+B
4. **Pivot**: After 3 same-type failures, change strategy entirely (e.g., from optimization to refactoring)
5. **Consult**: If stuck after 5 iterations, invoke `/research` to gather new information before retrying

## Safety Rules

1. **Never force-push or rewrite history** — only create new commits
2. **Always reset on failure** — don't let broken code accumulate
3. **Preserve the scratchpad** — it's the permanent record, never reset it
4. **Respect max_iterations** — infinite loops waste resources
5. **Don't modify files outside the target** — scope is defined in program.md
6. **Stash before starting** — protect any uncommitted user work
7. **Stop on catastrophic failure** — if the run command crashes the system, stop immediately

## Memory Integration

### With memory system (Core):
- Before loop: Recall memories tagged with the experiment domain
- After each iteration: Auto-save failed approaches to prevent future repetition
- After success: Save the winning approach as a reusable pattern
- Cross-session: Next time a similar experiment starts, pre-load relevant scratchpad entries

### Without memory system (OSS):
- scratchpad.md IS the memory — keep it in the repo
- Previous scratchpads in `scratchpads/` directory serve as historical reference
- `git log --grep="research-loop"` finds past experiment commits

## Usage

### Basic — fix a failing test
```
/research-loop
program: program.md
target: src/parser.ts
command: npm test -- --grep "parser"
success_criteria: All parser tests pass
```

### Performance optimization
```
/research-loop
target: src/query-engine.ts
command: npm run bench
success_criteria: p95 latency < 200ms
max_iterations: 15
```

### Algorithm experimentation
```
/research-loop
program: experiments/sort-optimization.md
target: src/sort.py
command: python benchmark.py
success_criteria: Faster than baseline on all input sizes
```

### Prompt engineering
```
/research-loop
target: prompts/extract.txt
command: python eval_prompt.py
success_criteria: F1 score > 0.92 on test set
max_iterations: 20
```

### Multi-file experiment
```
/research-loop
program: program.md
target: src/cache.ts,src/query.ts,src/index.ts
command: npm test && npm run bench
success_criteria: Tests pass AND latency improved by 20%
```

## Examples

### Example: Optimizing a database query

**program.md**:
```markdown
# Experiment: Optimize user search query

## Objective
Reduce the user search endpoint latency from 450ms to under 200ms at p95.

## Target Files
- `src/api/users/search.ts`

## Run Command
`npm run bench -- --grep "user search"`

## Success Criteria
- [ ] p95 latency < 200ms
- [ ] No change in result accuracy
- [ ] Existing tests still pass

## Approaches to Try
1. Add a GIN trigram index on the name column
2. Replace LIKE with full-text search (tsvector)
3. Add a Redis cache layer for frequent queries
4. Combine: tsvector + Redis cache
```

**Iteration flow**:
- Iteration 1: GIN index → 320ms (better, not enough) → FAIL
- Iteration 2: tsvector → 180ms (meets criteria!) → **PASS** → commit

### Example: Fixing a flaky test

**program.md**:
```markdown
# Experiment: Fix flaky WebSocket test

## Objective
Make the WebSocket reconnection test pass reliably (10/10 runs).

## Target Files
- `tests/ws-reconnect.test.ts`

## Run Command
`for i in $(seq 1 10); do npm test -- --grep "reconnect" || exit 1; done`

## Success Criteria
- [ ] Test passes 10 consecutive times
- [ ] Test execution time < 5s per run
```

## Anti-Patterns

- **Shotgun debugging**: Changing multiple things per iteration. Change ONE thing.
- **Ignoring the scratchpad**: Not reading previous learnings before the next attempt.
- **No success criteria**: Running the loop without knowing when to stop.
- **Too broad a target**: Experimenting on the entire codebase instead of isolated files.
- **Skipping the reset**: Letting failed changes accumulate — this corrupts future iterations.
- **Infinite loops**: Not setting max_iterations. Always have an exit condition.
