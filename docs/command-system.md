# Command System

## Overview

Commands in UltraThink are **skill aliases** -- shorthand triggers that map to specific skills in the skill mesh. When you type a command like `/cook` in Claude Code, it activates the corresponding skill's workflow defined in its `SKILL.md`.

Commands exist in `.claude/commands/` as files, but skills can also be triggered directly through their `triggers` metadata. The command system provides a familiar slash-command interface while keeping skills as the source of truth.

## Available Commands

### Orchestrator Commands

| Command | Skill | Description |
|---------|-------|-------------|
| `/cook` | `cook` | End-to-end feature builder: plan, scout, code, test, review, ship |
| `/team` | `team` | Multi-agent coordination for complex tasks |
| `/ship` | `ship` | Release management: versioning, changelog, deploy |
| `/bootstrap` | `bootstrap` | Project scaffolding and initialization |

### Workflow Commands

| Command | Skill | Description |
|---------|-------|-------------|
| `/plan` | `plan` | Create phased implementation plan |
| `/plan:validate` | `plan-validate` | Validate an existing plan against intent |
| `/plan:archive` | `plan-archive` | Archive completed plans with journal entries |
| `/debug` | `debug` | Hypothesis-driven debugging |
| `/fix` | `fix` | Apply targeted fixes to identified issues |
| `/review` | `code-review` | Multi-pass code review |
| `/scout` | `scout` | Codebase exploration and mapping |
| `/test` | `test` | Test generation and execution |
| `/test:ui` | `test-ui` | Multi-viewport UI testing with screenshots |
| `/brainstorm` | `brainstorm` | Divergent thinking and idea generation |
| `/kanban` | `kanban` | Project board management |
| `/preview` | `preview` | Read and present plans or markdown files |

### Utility Commands

| Command | Skill | Description |
|---------|-------|-------------|
| `/memory` | (direct) | Memory operations: search, read, write |
| `/onboard` | `onboard` | New contributor onboarding flow |

## How Commands Work

### Trigger Resolution

When you type a command or natural language that matches a skill trigger, UltraThink resolves it through this process:

1. **Exact command match**: `/cook` maps directly to the `cook` skill
2. **Trigger pattern match**: "build this feature end to end" matches the `cook` skill's trigger list
3. **Layer priority**: If multiple skills match, orchestrators are preferred over hubs, hubs over utilities, and utilities over domain specialists
4. **Specificity**: Among skills at the same layer, the most specific match wins

### Execution Flow

```
User Input ("/cook Add dark mode")
    |
    v
Command Resolution (find matching skill)
    |
    v
Load SKILL.md (read frontmatter + instructions)
    |
    v
Check Memory (recall relevant context)
    |
    v
Execute Workflow (follow skill's phases)
    |
    v
Write Memory (persist decisions and outcomes)
```

## Creating Custom Commands

Commands live in `.claude/commands/` as Markdown files. Each file represents a command alias.

### Step 1: Create the Command File

Create a new file in `.claude/commands/`. The filename (without extension) becomes the command name.

```bash
# Creates the /my-workflow command
touch .claude/commands/my-workflow.md
```

### Step 2: Define the Command

Write the command file with instructions that reference existing skills:

```markdown
# My Workflow

Trigger the following skill chain for a custom workflow:

1. Invoke the `scout` skill to explore the codebase
2. Invoke the `plan` skill to create an implementation plan
3. Present the plan for user approval
4. If approved, invoke `cook` to execute

## Context
- Project: $PROJECT_NAME
- Focus area: [User specifies]
```

### Step 3: Reference Existing Skills

Commands work best when they compose existing skills rather than defining new behavior. Think of commands as workflow shortcuts:

```markdown
# Quick Fix

When the user invokes /quick-fix:

1. Load the `debug` skill -- run Phase 1 (Symptom Analysis) only
2. If root cause is identified, invoke `fix` skill
3. Invoke `test` skill to verify the fix
4. If tests pass, invoke `commit-crafter` to create a clean commit

Skip the full `cook` pipeline -- this is for small, targeted fixes.
```

### Step 4: Test the Command

Use the command in Claude Code:

```
/my-workflow Focus on the authentication module
```

## Command vs. Skill

| Aspect | Command | Skill |
|--------|---------|-------|
| Location | `.claude/commands/` | `.claude/skills/[name]/SKILL.md` |
| Purpose | User-facing shortcut | Full workflow definition |
| Metadata | None (simple markdown) | YAML frontmatter with links, layers, policies |
| Linking | References skills by name | Declares `linksTo`/`linkedFrom` edges |
| Complexity | Simple: delegate to skills | Full: multi-phase workflows with decision points |

## Compound Commands

Some commands support sub-commands using the colon syntax:

- `/plan` -- Create a new plan
- `/plan:validate` -- Validate an existing plan
- `/plan:archive` -- Archive completed plans

These map to separate skills (`plan`, `plan-validate`, `plan-archive`) that share a namespace but have independent workflows.

## Natural Language Triggers

Skills define `triggers` in their YAML frontmatter that match natural language. You do not need to memorize commands -- you can describe what you want and UltraThink will match the right skill:

```yaml
# From cook/SKILL.md frontmatter
triggers:
  - "/cook"
  - "cook a feature"
  - "build this feature end to end"
  - "implement this feature completely"
  - "full feature build"
```

All of these will activate the same `cook` skill.

## Related Documentation

- [Skills Catalog](./skills-catalog.md) -- Full list of skills that commands map to
- [How to Add a New Command](./how-to-add-a-new-command.md) -- Step-by-step guide
- [How to Create a New Skill](./how-to-create-a-new-skill.md) -- Creating the skill behind a command
- [ck.json Config](./ck-json-config.md) -- Configuration that affects command behavior
