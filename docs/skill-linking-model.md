# Skill Linking Model

## Overview

The skill linking model is the connective tissue of UltraThink. It defines how skills discover, invoke, and hand off work to each other. Without linking, skills would be isolated tools. With linking, they form a resilient mesh network that can handle complex, multi-step engineering tasks.

Every skill declares its connections in YAML frontmatter using four key fields: `linksTo`, `linkedFrom`, `preferredNextSkills`, and `fallbackSkills`.

## Link Fields

### `linksTo`

An array of skill names that this skill **can invoke** during its workflow. These are outgoing edges in the skill graph.

```yaml
linksTo:
  - plan
  - research
  - scout
  - code-review
  - test
```

**Semantics**: "I may call these skills as part of my workflow."

### `linkedFrom`

An array of skill names that **can invoke this skill**. These are incoming edges -- they document which higher-level skills may delegate work here.

```yaml
linkedFrom:
  - cook
  - team
  - ship
```

**Semantics**: "These skills may call me."

### `preferredNextSkills`

After this skill completes, these are the recommended skills to invoke next. This creates a natural workflow progression.

```yaml
preferredNextSkills:
  - plan-validate
  - scout
  - kanban
```

**Semantics**: "When I finish, consider invoking one of these next."

### `fallbackSkills`

If this skill cannot complete its task (missing context, blocked by an error, scope exceeded), these skills can help recover.

```yaml
fallbackSkills:
  - brainstorm
  - research
```

**Semantics**: "If I get stuck, try one of these instead."

## Layer Hierarchy

The 4-layer hierarchy defines the natural direction of delegation:

```
Orchestrators (Layer 1)
    |
    |  invoke
    v
Workflow Hubs (Layer 2)
    |
    |  invoke
    v
Utility Providers (Layer 3)
    |
    |  invoke
    v
Domain Specialists (Layer 4)
```

### Rules

1. **Downward delegation is the default.** Orchestrators call hubs. Hubs call utilities. Utilities call domain specialists.

2. **Peer-to-peer linking within a layer is allowed.** For example, `debug` (hub) can call `fix` (hub). `scout` can call `code-review`.

3. **Upward delegation is rare but possible.** A hub might recommend an orchestrator as a `preferredNextSkill` (e.g., `plan` might suggest `cook` as the next step).

4. **Skip-layer calls should be avoided.** An orchestrator should not directly call a domain specialist without going through a hub or utility first. This keeps the skill mesh navigable and debuggable.

5. **Cycle safety is enforced by convention.** If `debug` calls `fix` and `fix` might call `debug`, the re-entry should be guarded. Skills should detect re-entry and limit recursion depth.

## How Orchestrators Compose Hubs

An orchestrator like `cook` defines a multi-phase workflow that invokes hubs in sequence:

```
cook workflow:
  Phase 1: plan         (create implementation plan)
  Phase 2: research     (look up unfamiliar APIs/libraries)
  Phase 3: scout        (explore codebase for patterns)
  Phase 4: [implement]  (direct coding, not a separate skill)
  Phase 5: test         (generate and run tests)
  Phase 6: code-review  (multi-pass review)
  Phase 7: commit-crafter (create clean commits)
```

The orchestrator decides **which hubs to invoke and in what order** based on the task. Trivial tasks skip `research` and `plan`. Complex tasks might add `sequential-thinking` and `refactor` phases.

### Decision Points

Orchestrators contain conditional logic:

```yaml
# From cook/SKILL.md
# Decision table in the workflow section:
# | Feature touches unknown library | Invoke `research` before coding |
# | Feature requires architectural change | Invoke `sequential-thinking` then confirm |
# | Existing code needs restructuring | Invoke `refactor` during implementation |
# | Tests fail after implementation | Invoke `fix` or `debug`, then re-test |
```

## How Hubs Compose Utilities

Hubs like `debug` invoke utilities for specific capabilities:

```
debug workflow:
  1. scout           (explore relevant files)
  2. sequential-thinking  (form and test hypotheses)
  3. fix             (apply the fix, if root cause found)
  4. test            (verify the fix)
```

Hubs are more focused than orchestrators -- they handle a single domain (debugging, testing, reviewing) but still compose multiple capabilities.

## Link Metadata in YAML Frontmatter

Every `SKILL.md` file begins with a YAML frontmatter block that declares link metadata:

```yaml
---
name: debug
description: Systematic debugging using hypothesis-driven investigation
layer: hub
category: workflow
triggers:
  - "/debug"
  - "debug this"
  - "why is this broken"
inputs:
  - symptom: Description of the incorrect behavior
  - expected: What the correct behavior should be
outputs:
  - rootCause: Identified root cause with evidence
  - hypothesis log: Record of hypotheses tested
linksTo:
  - fix
  - scout
  - test
  - code-review
linkedFrom:
  - cook
  - team
  - ship
preferredNextSkills:
  - fix
  - test
fallbackSkills:
  - scout
  - research
riskLevel: low
memoryReadPolicy: selective
memoryWritePolicy: selective
sideEffects:
  - May run test commands to reproduce issues
  - May read many files during investigation
---
```

## The Skill Graph

All link declarations create a directed graph that can be visualized in the dashboard's Skills page. Nodes are skills, edges are `linksTo` relationships, and node color indicates the layer.

### Example Subgraph: Feature Building

```
                    cook (orchestrator)
                   /    |    \     \
                  v     v     v     v
              plan   scout  test  code-review  (hubs)
              / \     |       |       |
             v   v    v       v       v
       research  brainstorm  testing-patterns  security-scanner  (utilities)
                  |
                  v
           sequential-thinking  (utility)
```

### Example Subgraph: Debugging

```
              debug (hub)
             /  |   \
            v   v    v
         scout  fix  test  (hubs/utilities)
          |      |
          v      v
   code-explainer  debug (re-entry, guarded)
```

## Cross-Hub References

Hubs can reference other hubs. These cross-references are critical for complex workflows:

- `fix` can call `debug` (if the fix introduces new issues)
- `debug` can call `test` (to verify hypotheses)
- `test` can call `debug` (when tests fail unexpectedly)
- `brainstorm` can call `plan` (to formalize brainstorm output)
- `code-review` can call `scout` (to understand broader context)

Cross-hub references should be used judiciously. The skill's `SKILL.md` should document when and why it calls another hub.

## Validating Links

Use the dashboard's Skills page to:

1. View the complete skill graph
2. Inspect individual skill connections
3. Detect orphaned skills (no incoming or outgoing links)
4. Detect broken links (referencing non-existent skills)
5. Verify layer hierarchy compliance

## Related Documentation

- [Skills Catalog](./skills-catalog.md) -- Complete list of all 104 skills
- [How to Link Skills](./how-to-link-skills.md) -- Step-by-step guide for linking
- [How to Create a New Skill](./how-to-create-a-new-skill.md) -- Creating skills with proper links
- [Claude Workflow Overview](./claude-workflow-overview.md) -- System architecture
