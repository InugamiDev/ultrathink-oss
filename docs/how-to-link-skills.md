# How to Link Skills

## Overview

Linking skills is what transforms UltraThink from a collection of isolated tools into a cooperating mesh. This guide covers the mechanics of creating, validating, and maintaining skill-to-skill links.

## The Four Link Types

### 1. `linksTo` -- Outgoing Invocations

Declares which skills your skill **actively calls** during its workflow. These are the edges going OUT from your skill.

```yaml
# In debug/SKILL.md
linksTo:
  - fix           # I invoke fix when root cause is found
  - scout         # I invoke scout to explore relevant files
  - test          # I invoke test to verify hypotheses
  - code-review   # I invoke code-review for validation
```

**Rules**:
- Only list skills you actually invoke in the workflow body
- Prefer calling same-layer or lower-layer skills
- Cross-layer calls (upward) are allowed but should be rare and documented
- Keep the list focused -- 3-8 links is typical

### 2. `linkedFrom` -- Incoming Invocations

Declares which skills **can invoke your skill**. These are the edges coming IN to your skill.

```yaml
# In fix/SKILL.md
linkedFrom:
  - cook          # The cook orchestrator calls me
  - debug         # The debug hub calls me
  - team          # The team orchestrator calls me
  - ship          # The ship orchestrator calls me
```

**Rules**:
- This must be bidirectional with the caller's `linksTo`
- If `debug` lists `fix` in `linksTo`, then `fix` must list `debug` in `linkedFrom`
- Update both files whenever you add a link

### 3. `preferredNextSkills` -- Workflow Progression

Suggests what skills should run AFTER your skill completes. These are recommendations, not automatic invocations.

```yaml
# In plan/SKILL.md
preferredNextSkills:
  - plan-validate  # Validate the plan with the user
  - scout          # Explore the codebase for context
  - kanban         # Add plan tasks to the board
```

**Rules**:
- These are suggestions, not requirements
- The user or orchestrator decides whether to follow the suggestion
- Limit to 2-4 suggestions

### 4. `fallbackSkills` -- Recovery Options

Declares what skills to try if your skill cannot complete its task.

```yaml
# In debug/SKILL.md
fallbackSkills:
  - scout          # If I can't find the bug, explore more broadly
  - research       # If the issue is unfamiliar, research it
```

**Rules**:
- Fallbacks should be broader or more exploratory than the failing skill
- Limit to 1-3 fallback options

## Step-by-Step: Adding a Link

### Scenario: You want `brainstorm` to call `plan`

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
  - ship
  - brainstorm      # <-- Add this
```

**Step 3**: Document the invocation in the caller's workflow body:

```markdown
## Workflow

### Phase 3: Formalize

If the brainstorm produces a clear direction with actionable next steps:
1. **Invoke `plan`** -- Convert the chosen direction into a structured implementation plan
2. Present the plan to the user for validation
```

**Step 4**: Verify the link is visible in the dashboard's Skills graph.

## Layer Hierarchy Guidelines

The 4-layer hierarchy suggests natural link directions:

```
Layer 1 (Orchestrators) --> Layer 2 (Hubs)
Layer 2 (Hubs)          --> Layer 3 (Utilities)
Layer 3 (Utilities)     --> Layer 4 (Domain Specialists)
```

### Downward Links (Recommended)

An orchestrator calling a hub, or a hub calling a utility. This is the default and preferred direction.

```yaml
# cook (orchestrator) -> plan (hub): OK, normal downward link
linksTo:
  - plan
```

### Peer Links (Allowed)

A hub calling another hub, or a utility calling another utility. Common and useful.

```yaml
# debug (hub) -> fix (hub): OK, peer-to-peer within the same layer
linksTo:
  - fix
```

### Upward Links (Use Sparingly)

A hub recommending an orchestrator, or a utility suggesting a hub. These should go in `preferredNextSkills`, not `linksTo`.

```yaml
# plan (hub) -> cook (orchestrator): As a next-step suggestion, not a direct invocation
preferredNextSkills:
  - cook     # After planning, the user might want to execute via cook
```

### Skip-Layer Links (Avoid)

An orchestrator directly calling a domain specialist, bypassing hubs and utilities. This makes the skill graph harder to understand and maintain.

```yaml
# cook (orchestrator) -> react (domain): AVOID. Go through a hub or utility instead.
# Instead: cook -> scout -> code-explainer -> (uses react domain knowledge)
```

## Cycle Safety

Cycles are possible (A calls B, B calls A) and sometimes necessary (debug calls fix, fix might call debug if the fix introduces a new bug). Handle cycles safely:

### Rule 1: Guard Re-entry

In the workflow body, check if you have been called by the skill you are about to invoke:

```markdown
### Phase 4: Fix

If root cause is identified:
1. **Invoke `fix`** to apply the fix
2. **Invoke `test`** to verify
3. If tests fail, re-enter debug **at most once** (guard against infinite recursion)
```

### Rule 2: Limit Depth

Orchestrators should set a maximum delegation depth. If a workflow chain exceeds 5 skill invocations, surface the situation to the user.

### Rule 3: Document Cycle Points

If a skill pair can cycle, document it clearly in both skills' SKILL.md files.

## Validating Links

### Manual Validation

For each skill in your `linksTo`:
1. Open that skill's `SKILL.md`
2. Check that your skill appears in its `linkedFrom`
3. If not, add it

For each skill in your `linkedFrom`:
1. Open that skill's `SKILL.md`
2. Check that your skill appears in its `linksTo`
3. If not, add it

### Dashboard Validation

The Skills page at `localhost:3333/skills` provides:

- **Broken link detection**: Links that reference non-existent skills
- **Asymmetric link detection**: `linksTo` without matching `linkedFrom` (or vice versa)
- **Orphan detection**: Skills with no incoming or outgoing links
- **Layer violation detection**: Upward links that skip layers

## Common Link Patterns

### The Funnel Pattern

Orchestrator fans out to multiple hubs, which each handle a phase:

```
cook --> plan --> scout --> test --> code-review --> commit-crafter
```

### The Fallback Pattern

Primary skill fails, fallback provides broader context:

```
debug --[stuck]--> scout --[found context]--> debug (re-entry)
```

### The Validation Pattern

Skill produces output, another skill validates it:

```
plan --> plan-validate --> plan (if revision needed)
```

### The Enrichment Pattern

Multiple utilities enrich a hub's output:

```
debug --> scout (files) + sequential-thinking (reasoning) + test (verification)
```

## Removing Links

When removing a link:

1. Remove the skill from `linksTo` in the caller's `SKILL.md`
2. Remove the skill from `linkedFrom` in the callee's `SKILL.md`
3. Remove any references to the invocation in the workflow body
4. Verify the dashboard graph reflects the change

## Related Documentation

- [Skill Linking Model](./skill-linking-model.md) -- Link architecture and theory
- [How to Create a New Skill](./how-to-create-a-new-skill.md) -- Creating skills with links
- [Skills Catalog](./skills-catalog.md) -- All skills and their key links
