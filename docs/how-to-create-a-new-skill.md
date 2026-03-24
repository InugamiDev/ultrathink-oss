# How to Create a New Skill

## Overview

This guide walks through creating a new skill for UltraThink, from folder structure to YAML frontmatter to testing and registration. A skill is a self-contained workflow definition that lives in `.claude/skills/[name]/SKILL.md`.

## Step 1: Decide the Layer

Before writing anything, determine which layer your skill belongs to:

| Layer | When to Use | Examples |
|-------|-------------|---------|
| **Orchestrator** (Layer 1) | End-to-end workflow that composes multiple hubs | cook, ship, team |
| **Workflow Hub** (Layer 2) | Multi-step process for a specific domain | plan, debug, test |
| **Utility Provider** (Layer 3) | Reusable, stateless capability | research, mermaid, regex-builder |
| **Domain Specialist** (Layer 4) | Deep expertise in a specific technology | react, postgresql, docker |

The layer determines:
- What skills you can link to (prefer calling same-layer or lower-layer skills)
- What skills can call you (higher-layer skills delegate to lower-layer ones)
- How much state and orchestration logic to include

## Step 2: Create the Directory

```bash
mkdir -p .claude/skills/my-skill-name
```

Use kebab-case for the directory name. This name becomes the skill's identifier.

## Step 3: Write the SKILL.md

Create `.claude/skills/my-skill-name/SKILL.md` with two sections: YAML frontmatter (metadata) and Markdown body (instructions).

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
  - optionalInput: Description (optional)
outputs:
  - outputName: Description of what the skill produces
linksTo:
  - skill-name-1       # Skills this skill may invoke
  - skill-name-2
linkedFrom:
  - parent-skill-1     # Skills that may invoke this skill
  - parent-skill-2
preferredNextSkills:
  - suggested-next      # Skills to suggest after this completes
fallbackSkills:
  - fallback-skill      # Skills to try if this one gets stuck
riskLevel: low          # low | medium | high
memoryReadPolicy: selective    # always | selective | none
memoryWritePolicy: selective   # always | selective | none
sideEffects:
  - Description of side effects (file creation, network calls, etc.)
---
```

### Frontmatter Field Reference

| Field | Required | Type | Description |
|-------|----------|------|-------------|
| `name` | Yes | string | Skill identifier (must match directory name) |
| `description` | Yes | string | One-sentence description |
| `layer` | Yes | string | `orchestrator`, `hub`, `utility`, or `domain` |
| `category` | Yes | string | Classification category |
| `triggers` | Yes | string[] | Command and natural language triggers |
| `inputs` | Yes | object[] | Expected inputs with descriptions |
| `outputs` | Yes | object[] | Expected outputs with descriptions |
| `linksTo` | Yes | string[] | Skills this skill can invoke |
| `linkedFrom` | Yes | string[] | Skills that can invoke this skill |
| `preferredNextSkills` | No | string[] | Suggested follow-up skills |
| `fallbackSkills` | No | string[] | Recovery skills for stuck states |
| `riskLevel` | No | string | `low` (default), `medium`, `high` |
| `memoryReadPolicy` | No | string | `selective` (default), `always`, `none` |
| `memoryWritePolicy` | No | string | `selective` (default), `always`, `none` |
| `sideEffects` | No | string[] | Side effects the skill may cause |

### Body Template

After the frontmatter closing `---`, write the skill instructions in Markdown:

```markdown
# My Skill Name

## Purpose

Clear, concise explanation of what this skill does and when to use it.
Include what makes it different from similar skills.

## Workflow

### Phase 1: [Name]

1. **Step description** -- What to do and why
2. **Step description** -- Details on execution
3. **Step description** -- Expected output

### Phase 2: [Name]

1. **Step description** -- ...
2. **Step description** -- ...

## Decision Points

| Condition | Action |
|-----------|--------|
| Input is simple | Skip Phase 2, go directly to output |
| Input is complex | Invoke sequential-thinking for analysis |
| Error occurs | Invoke fallback skill |

## Usage

**Best for**:
- Scenario 1
- Scenario 2

**Not ideal for**:
- Scenario where another skill is better (use X instead)

## Examples

### Example 1: Simple case
```
User: /my-skill Do the simple thing
Workflow: Phase 1 only, produces output in 2 steps
```

### Example 2: Complex case
```
User: /my-skill Do the complex thing with constraints
Workflow: Phase 1 -> Phase 2 -> invoke linked skill -> output
```

## Guardrails

- Constraint 1: Always do X before Y
- Constraint 2: Never invoke Z without user confirmation
- Constraint 3: Limit scope to avoid bloat
```

## Step 4: Define Links

Think carefully about links. Your skill should declare:

### `linksTo` -- What you call

List skills your workflow explicitly invokes. Be honest -- only list skills you actually use in the workflow body.

**Good**:
```yaml
linksTo:
  - scout       # I search the codebase during Phase 1
  - test        # I run tests during Phase 3
```

**Bad**:
```yaml
linksTo:
  - every-skill-that-might-be-relevant  # Don't list things you don't actually call
```

### `linkedFrom` -- What calls you

List skills that invoke your skill. Check their `linksTo` to verify -- this should be bidirectional.

### `preferredNextSkills` -- What comes next

After your skill finishes, what should the user do next? This is a recommendation, not a requirement.

### `fallbackSkills` -- Recovery options

If your skill gets stuck (missing context, unexpected error, scope exceeded), what skill can help?

## Step 5: Verify Consistency

Check that your links are bidirectional:

1. If you list `scout` in `linksTo`, go to `scout/SKILL.md` and verify your skill is in its `linkedFrom`
2. If you list `cook` in `linkedFrom`, go to `cook/SKILL.md` and verify your skill is in its `linksTo`

If they are not bidirectional, update both files.

## Step 6: Test the Skill

Test your skill by invoking it through its triggers:

```
/my-skill <test input>
```

Verify:
- The trigger is recognized
- The workflow phases execute in order
- Linked skills are invoked correctly
- Memory policies are respected
- Output matches the declared format

## Step 7: Add to Dashboard

The dashboard's Skills page reads skill metadata from the `.claude/skills/` directory. After creating your skill:

1. Reload the dashboard (or restart `npm run dashboard:dev`)
2. Navigate to the Skills page
3. Verify your skill appears in the catalog
4. Check the skill graph for correct link visualization

## Complete Example: A Code Audit Skill

```yaml
---
name: code-audit
description: Systematic code quality audit targeting specific files or modules
layer: hub
category: workflow
triggers:
  - "/audit-code"
  - "audit this code"
  - "review code quality"
inputs:
  - target: File path, directory, or glob pattern to audit
  - focus: Specific concerns to prioritize (optional)
outputs:
  - report: Structured audit report with findings and recommendations
  - metrics: Code quality metrics (complexity, duplication, coverage)
linksTo:
  - scout
  - security-scanner
  - performance-profiler
  - testing-patterns
linkedFrom:
  - cook
  - audit
preferredNextSkills:
  - fix
  - refactor
fallbackSkills:
  - scout
riskLevel: low
memoryReadPolicy: selective
memoryWritePolicy: selective
sideEffects:
  - Reads many files during analysis
  - May run static analysis tools
---

# Code Audit

## Purpose

Perform a systematic code quality audit on targeted files or modules.
Unlike `code-review` (which focuses on recent changes/diffs), code-audit
examines existing code regardless of when it was last modified.

## Workflow

### Phase 1: Scope

1. **Identify targets** -- Resolve the input path/glob to a concrete file list
2. **Check memory** -- Recall any previous audit findings for these files
3. **Classify** -- Group files by type (components, utilities, API routes, etc.)

### Phase 2: Analyze

4. **Invoke `scout`** -- Map dependencies and usage patterns for the target files
5. **Invoke `security-scanner`** -- Run security checks on the targets
6. **Invoke `performance-profiler`** -- Check for performance anti-patterns
7. **Run complexity analysis** -- Measure cyclomatic complexity and function length

### Phase 3: Report

8. **Compile findings** -- Aggregate results from all analysis passes
9. **Score** -- Assign overall quality score (A through F)
10. **Write report** -- Structured Markdown with findings, metrics, recommendations

## Guardrails

- Read only -- never modify audited files
- Limit scope to avoid auditing the entire codebase (max 50 files per run)
- Save significant findings to memory for future reference
```

## Related Documentation

- [Skills Catalog](./skills-catalog.md) -- All existing skills for reference
- [Skill Linking Model](./skill-linking-model.md) -- How links work in detail
- [How to Link Skills](./how-to-link-skills.md) -- Guide for setting up links
- [How to Add a New Command](./how-to-add-a-new-command.md) -- Creating a command for your skill
