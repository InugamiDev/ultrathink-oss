# Create a Skill

A step-by-step guide to creating a new skill for UltraThink.

## Step 1: Decide the Layer

| Layer | When to Use | Examples |
|-------|-------------|---------|
| **Orchestrator** (Layer 1) | End-to-end workflow that composes multiple hubs | cook, ship, team |
| **Workflow Hub** (Layer 2) | Multi-step process for a specific domain | plan, debug, test |
| **Utility Provider** (Layer 3) | Reusable, stateless capability | research, mermaid, regex-builder |
| **Domain Specialist** (Layer 4) | Deep expertise in a specific technology | react, postgresql, docker |

The layer determines what you can link to, what can call you, and how much orchestration logic to include.

## Step 2: Create the Directory

```bash
mkdir -p .claude/skills/my-skill-name
```

Use kebab-case. The directory name becomes the skill identifier.

## Step 3: Write the SKILL.md

Create `.claude/skills/my-skill-name/SKILL.md` with YAML frontmatter (metadata) and Markdown body (instructions).

### Frontmatter Template

```yaml
---
name: my-skill-name
description: One-sentence description of what the skill does
layer: utility          # orchestrator | hub | utility | domain
category: tooling       # orchestration | workflow | utility | frontend | backend | database | devops | security | ai | docs
triggers:
  - "/my-skill"
  - "natural language trigger phrase"
  - "another way to invoke this"
inputs:
  - inputName: Description of the input
outputs:
  - outputName: Description of what the skill produces
linksTo:
  - skill-name-1       # Skills this skill may invoke
  - skill-name-2
linkedFrom:
  - parent-skill-1     # Skills that may invoke this skill
preferredNextSkills:
  - suggested-next      # Skills to suggest after completion
fallbackSkills:
  - fallback-skill      # Skills to try if stuck
riskLevel: low          # low | medium | high
memoryReadPolicy: selective    # always | selective | none
memoryWritePolicy: selective   # always | selective | none
sideEffects:
  - Description of side effects
---
```

### Frontmatter Field Reference

| Field | Required | Description |
|-------|----------|-------------|
| `name` | Yes | Must match directory name |
| `description` | Yes | One-sentence description |
| `layer` | Yes | `orchestrator`, `hub`, `utility`, or `domain` |
| `category` | Yes | Classification category |
| `triggers` | Yes | Command and natural language triggers |
| `inputs` | Yes | Expected inputs with descriptions |
| `outputs` | Yes | Expected outputs with descriptions |
| `linksTo` | Yes | Skills this skill can invoke |
| `linkedFrom` | Yes | Skills that can invoke this skill |
| `preferredNextSkills` | No | Suggested follow-up skills |
| `fallbackSkills` | No | Recovery skills |
| `riskLevel` | No | `low` (default), `medium`, `high` |
| `memoryReadPolicy` | No | `selective` (default), `always`, `none` |
| `memoryWritePolicy` | No | `selective` (default), `always`, `none` |
| `sideEffects` | No | Side effects the skill may cause |

### Body Template

```markdown
# My Skill Name

## Purpose

Clear explanation of what this skill does and when to use it.

## Workflow

### Phase 1: [Name]

1. **Step description** -- What to do and why
2. **Step description** -- Details on execution

### Phase 2: [Name]

1. **Step description** -- ...

## Decision Points

| Condition | Action |
|-----------|--------|
| Input is simple | Skip Phase 2 |
| Error occurs | Invoke fallback skill |

## Usage

**Best for**: Scenario 1, Scenario 2
**Not ideal for**: Scenario where another skill is better

## Examples

### Example 1: Simple case
User: /my-skill Do the simple thing
Workflow: Phase 1 only

## Guardrails

- Constraint 1: Always do X before Y
- Constraint 2: Limit scope to avoid bloat
```

## Step 4: Define Links

### `linksTo` -- What you call

Only list skills you actually invoke in the workflow body.

```yaml
linksTo:
  - scout       # I search the codebase during Phase 1
  - test        # I run tests during Phase 3
```

### `linkedFrom` -- What calls you

Check the callers' `linksTo` to verify -- this should be bidirectional.

### `preferredNextSkills` -- What comes next

Limit to 2-4 suggestions.

### `fallbackSkills` -- Recovery options

Fallbacks should be broader or more exploratory than the failing skill.

## Step 5: Register in `_registry.json`

```json
{
  "my-skill-name": {
    "layer": "domain",
    "category": "your-category",
    "description": "What this skill does",
    "triggers": ["keyword1", "keyword2", "keyword3"],
    "linksTo": ["related-skill-1", "related-skill-2"],
    "path": ".claude/skills/my-skill-name"
  }
}
```

## Step 6: Verify Consistency

1. If you list `scout` in `linksTo`, verify your skill is in `scout`'s `linkedFrom`
2. If you list `cook` in `linkedFrom`, verify your skill is in `cook`'s `linksTo`
3. Update both files if not bidirectional

## Step 7: Test

```
/my-skill <test input>
```

Verify: trigger recognized, phases execute in order, linked skills invoked correctly, memory policies respected, output matches declared format.

## Step 8: Check the Dashboard

Reload the dashboard and verify your skill appears in the Skills page catalog and graph.

## Trigger Tips

- Use lowercase keywords
- Include common variations (`auth`, `authentication`, `login`)
- Include framework names (`nextjs`, `next.js`, `next`)
- Avoid overly generic triggers that match everything
