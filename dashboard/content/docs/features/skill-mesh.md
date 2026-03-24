# Skill Mesh

The skill mesh is UltraThink's core intelligence layer -- 125+ skills organized into 4 layers that auto-activate based on intent detection and cooperate through explicit graph edges.

## The 4 Layers

| Layer | Count | Purpose | Example |
|-------|-------|---------|---------|
| **Orchestrator** | 8 | Multi-step workflows | `gsd`, `plan`, `cook` |
| **Hub** | 18 | Domain coordinators | `react`, `debug`, `test` |
| **Utility** | 35 | Focused tools | `refactor`, `fix`, `audit` |
| **Domain** | 64+ | Specific tech | `nextjs`, `stripe`, `drizzle` |

### Layer interaction

- **Orchestrators compose hubs.** `cook` invokes `plan` -> `scout` -> `test` -> `code-review` -> `commit-crafter`.
- **Hubs compose utilities and specialists.** `debug` calls `scout` for exploration, then `sequential-thinking` for root cause analysis.
- **Utilities are stateless and reusable.** `research` is called by `cook`, `debug`, `brainstorm`, or any other skill.
- **Domain specialists provide deep knowledge.** `react` activates when building components; `postgresql` when writing queries.

## Auto-Trigger System

Every prompt is scored against the full skill registry in under 30ms. The process:

1. **Intent detection** -- The prompt analyzer classifies each prompt into an intent: `build`, `debug`, `refactor`, `explore`, `deploy`, `test`, `design`, `plan`
2. **Skill scoring** -- Each skill's triggers are compared against the prompt text and detected intent
3. **Category boosting** -- Intent-to-category mapping boosts relevant skills (e.g., `debug` intent boosts `workflow` category)
4. **Graph traversal** -- Top skills' `linksTo` edges are followed to discover related skills (1-hop)
5. **Context injection** -- Top 5 skills are injected as `additionalContext` directives

You type naturally. Skills fire behind the scenes.

## Skill Linking

Skills form a directed graph through four link fields declared in each skill's metadata:

### `linksTo` -- Outgoing invocations

Skills this skill **actively calls** during its workflow. These are outgoing edges.

```json
{
  "debug": {
    "linksTo": ["fix", "scout", "test", "code-review"]
  }
}
```

### `linkedFrom` -- Incoming invocations

Skills that **can invoke this skill**. These are incoming edges. Must be bidirectional with the caller's `linksTo`.

```json
{
  "fix": {
    "linkedFrom": ["cook", "debug", "team", "ship"]
  }
}
```

### `preferredNextSkills` -- Workflow progression

After this skill completes, these are recommended follow-ups:

```json
{
  "plan": {
    "preferredNextSkills": ["plan-validate", "scout", "kanban"]
  }
}
```

### `fallbackSkills` -- Recovery options

If this skill gets stuck, these skills can help recover:

```json
{
  "debug": {
    "fallbackSkills": ["scout", "research"]
  }
}
```

## Layer Hierarchy Rules

1. **Downward delegation is the default.** Orchestrators call hubs, hubs call utilities, utilities call domain specialists.
2. **Peer-to-peer within a layer is allowed.** `debug` (hub) can call `fix` (hub).
3. **Upward delegation is rare.** A hub might recommend an orchestrator as a `preferredNextSkill`, but not invoke it directly.
4. **Skip-layer calls should be avoided.** An orchestrator should not call a domain specialist directly.
5. **Cycle safety by convention.** If A calls B and B calls A, re-entry is guarded with depth limits.

## Example Subgraph: Feature Building

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

## Example Subgraph: Debugging

```
              debug (hub)
             /  |   \
            v   v    v
         scout  fix  test  (hubs/utilities)
          |      |
          v      v
   code-explainer  debug (re-entry, guarded)
```

## Skill Definition Format

Each skill lives in `.claude/skills/[name]/SKILL.md` and is registered in `_registry.json`:

```json
{
  "react": {
    "layer": "hub",
    "category": "frontend",
    "description": "React patterns, hooks, server components",
    "triggers": ["react", "component", "useState", "useEffect", "jsx"],
    "linksTo": ["nextjs", "tailwindcss", "testing-library"],
    "websearch": true
  }
}
```

## Common Link Patterns

**The Funnel Pattern** -- Orchestrator fans out to hubs handling sequential phases:
```
cook --> plan --> scout --> test --> code-review --> commit-crafter
```

**The Fallback Pattern** -- Primary skill fails, fallback provides broader context:
```
debug --[stuck]--> scout --[found context]--> debug (re-entry)
```

**The Validation Pattern** -- Skill produces output, another validates:
```
plan --> plan-validate --> plan (if revision needed)
```

**The Enrichment Pattern** -- Multiple utilities enrich a hub's output:
```
debug --> scout (files) + sequential-thinking (reasoning) + test (verification)
```
