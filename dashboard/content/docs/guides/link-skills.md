# Link Skills

Linking skills transforms UltraThink from isolated tools into a cooperating mesh. This guide covers creating, validating, and maintaining skill-to-skill links.

## The Four Link Types

### 1. `linksTo` -- Outgoing Invocations

Skills this skill **actively calls** during its workflow.

```yaml
# In debug/SKILL.md
linksTo:
  - fix           # I invoke fix when root cause is found
  - scout         # I invoke scout to explore relevant files
  - test          # I invoke test to verify hypotheses
```

**Rules**: Only list skills you actually invoke. Prefer same-layer or lower-layer skills. Keep to 3-8 links.

### 2. `linkedFrom` -- Incoming Invocations

Skills that **can invoke this skill**. Must be bidirectional with the caller's `linksTo`.

```yaml
# In fix/SKILL.md
linkedFrom:
  - cook
  - debug
  - team
```

### 3. `preferredNextSkills` -- Workflow Progression

Recommended follow-ups after completion. Suggestions, not automatic invocations.

```yaml
preferredNextSkills:
  - plan-validate
  - scout
  - kanban
```

### 4. `fallbackSkills` -- Recovery Options

Skills to try if this skill gets stuck.

```yaml
fallbackSkills:
  - scout
  - research
```

## Step-by-Step: Adding a Link

**Scenario**: You want `brainstorm` to call `plan`.

**Step 1**: Edit the caller's `SKILL.md`:

```yaml
# In .claude/skills/brainstorm/SKILL.md
linksTo:
  - plan            # <-- Add this
  - research
  - sequential-thinking
```

**Step 2**: Edit the callee's `SKILL.md`:

```yaml
# In .claude/skills/plan/SKILL.md
linkedFrom:
  - cook
  - team
  - brainstorm      # <-- Add this
```

**Step 3**: Document the invocation in the caller's workflow body:

```markdown
### Phase 3: Formalize

If the brainstorm produces a clear direction:
1. **Invoke `plan`** -- Convert the chosen direction into an implementation plan
2. Present the plan to the user for validation
```

**Step 4**: Verify the link in the dashboard's Skills graph.

## Layer Hierarchy Guidelines

```
Layer 1 (Orchestrators) --> Layer 2 (Hubs)
Layer 2 (Hubs)          --> Layer 3 (Utilities)
Layer 3 (Utilities)     --> Layer 4 (Domain Specialists)
```

- **Downward** (recommended): Orchestrator -> Hub -> Utility -> Domain
- **Peer** (allowed): Hub -> Hub, Utility -> Utility
- **Upward** (use sparingly): Put in `preferredNextSkills`, not `linksTo`
- **Skip-layer** (avoid): Orchestrator -> Domain specialist

## Cycle Safety

Cycles (A calls B, B calls A) are sometimes necessary. Handle them safely:

1. **Guard re-entry** -- Check if called by the skill you're about to invoke, limit to one re-entry
2. **Limit depth** -- Surface to user if chain exceeds 5 invocations
3. **Document cycle points** -- Note cycles in both skills' SKILL.md files

## Validating Links

### Manual

For each skill in `linksTo`, check that your skill appears in its `linkedFrom`. And vice versa.

### Dashboard

The Skills page at `localhost:3333/skills` detects:

- Broken links (referencing non-existent skills)
- Asymmetric links (`linksTo` without matching `linkedFrom`)
- Orphan skills (no incoming or outgoing links)
- Layer violations (upward links that skip layers)

## Removing Links

1. Remove from `linksTo` in the caller's SKILL.md
2. Remove from `linkedFrom` in the callee's SKILL.md
3. Remove invocation references in the workflow body
4. Verify the dashboard graph reflects the change
