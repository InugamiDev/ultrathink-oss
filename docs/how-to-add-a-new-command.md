# How to Add a New Command

## Overview

Commands in UltraThink are **skill aliases** -- shortcut files in `.claude/commands/` that map to skills in the skill mesh. This guide covers creating command files that provide a user-friendly slash-command interface to your skills.

## Prerequisites

- The target skill must already exist in `.claude/skills/[name]/SKILL.md`
- You should understand what the skill does and what inputs it expects
- See [How to Create a New Skill](./how-to-create-a-new-skill.md) if you need to create the skill first

## Step 1: Create the Command File

Commands live in `.claude/commands/` as Markdown files. The filename (without `.md`) becomes the command name.

```bash
touch .claude/commands/my-command.md
```

This creates the `/my-command` command.

### Naming Conventions

- Use **kebab-case**: `my-command.md`, not `myCommand.md` or `my_command.md`
- Keep names short and memorable: `/cook`, `/plan`, `/debug`
- Use colons for sub-commands: `plan.md` and `plan-validate.md` (invoked as `/plan` and `/plan:validate`)

## Step 2: Write the Command File

A command file is simple Markdown that describes what happens when the command is invoked. It references existing skills by name.

### Basic Template

```markdown
# /my-command

When the user invokes `/my-command`:

1. Load and execute the `my-skill` skill
2. Follow all phases defined in the skill's SKILL.md
3. Respect the current coding level from ck.json

## Default Behavior

- Input: The text following the command is passed as the primary input
- Output: Follow the skill's output format

## Examples

```
/my-command Build a REST API for user management
```
```

### Template with Multiple Skills

If your command chains multiple skills:

```markdown
# /quick-check

When the user invokes `/quick-check`:

1. Invoke the `scout` skill with a Quick Scan on the specified target
2. Invoke the `code-review` skill, focusing only on Pass 1 (Logic) and Pass 2 (Security)
3. Present a combined summary of findings
4. Suggest follow-up commands based on findings:
   - If security issues found: suggest `/audit`
   - If logic issues found: suggest `/fix`
   - If all clear: suggest `/ship`

## Scope

This is a lightweight check. For full review, use `/review` instead.

## Examples

```
/quick-check src/api/auth/
/quick-check components/LoginForm.tsx
```
```

### Template with Options

Commands can accept flags or options:

```markdown
# /plan

When the user invokes `/plan`:

1. Load and execute the `plan` skill
2. Pass the text after `/plan` as the goal input
3. Write the plan to the configured `defaultPlanDir` from ck.json

## Options

- `--phases N` -- Limit the plan to N phases (default: auto, typically 3-7)
- `--quick` -- Skip risk assessment and dependency mapping for simple tasks
- `--validate` -- Immediately invoke `plan-validate` after plan creation

## Sub-commands

- `/plan:validate @plan-file.md` -- Validate an existing plan
- `/plan:archive` -- Archive completed plans with journal entries

## Examples

```
/plan Implement user authentication with OAuth
/plan --quick Add a dark mode toggle
/plan:validate plans/auth-implementation.md
/plan:archive
```
```

## Step 3: Handle Sub-commands

For commands with sub-commands (like `/plan:validate`), create separate files with a naming convention:

```
.claude/commands/
  plan.md              # /plan
  plan-validate.md     # /plan:validate
  plan-archive.md      # /plan:archive
```

Each sub-command file follows the same template but references a different skill:

```markdown
# /plan:validate

When the user invokes `/plan:validate`:

1. Load and execute the `plan-validate` skill
2. Read the target plan file (specified after the command, or the most recent plan)
3. Present a validation checklist to the user
4. Support approve / revise / expand / trim responses
```

## Step 4: Test the Command

Invoke the command in Claude Code:

```
/my-command Test input here
```

Verify:
1. The command is recognized
2. The correct skill is activated
3. Input is passed correctly
4. Output matches expectations
5. Coding level is respected

## Examples of Existing Commands

### `/cook` -> `cook` skill

```markdown
# /cook

When the user invokes `/cook`:

1. Load the `cook` orchestrator skill
2. Parse the text after `/cook` as the feature description
3. Execute the full cook pipeline: plan -> research -> scout -> implement -> test -> review -> commit
4. Report completion with a summary of what was built
```

### `/debug` -> `debug` skill

```markdown
# /debug

When the user invokes `/debug`:

1. Load the `debug` hub skill
2. Parse the text after `/debug` as the symptom description
3. Execute hypothesis-driven debugging
4. Suggest `/fix` when root cause is identified
```

### `/kanban` -> `kanban` skill

```markdown
# /kanban

When the user invokes `/kanban`:

1. Load the `kanban` skill
2. If no sub-command, display the current board state
3. Support actions: add, move, show, list

## Sub-commands
- `/kanban add "Task title"` -- Add a new task to backlog
- `/kanban move <id> <status>` -- Move a task to a new column
- `/kanban show <id>` -- Show task details
```

## Command Discovery

Users can discover available commands through:

1. **This documentation** -- The [Command System](./command-system.md) page lists all commands
2. **Dashboard** -- The Home page shows available commands
3. **Natural language** -- Skills also respond to natural language triggers, so users don't need to memorize exact commands

## Best Practices

### Do

- **Keep commands simple** -- A command should delegate to skills, not define complex logic
- **Reference existing skills** -- Commands are aliases, not skill replacements
- **Document examples** -- Show concrete usage with real-world inputs
- **Include scope notes** -- Explain what the command does and does not handle

### Do Not

- **Don't duplicate skill logic** -- If you find yourself writing workflow steps in the command file, that logic should be in the skill's SKILL.md instead
- **Don't create commands without skills** -- Every command should map to at least one skill
- **Don't use ambiguous names** -- `/do` is too vague; `/code-review` is clear

## Related Documentation

- [Command System](./command-system.md) -- Full command reference
- [How to Create a New Skill](./how-to-create-a-new-skill.md) -- Creating the skill behind a command
- [Skills Catalog](./skills-catalog.md) -- All skills that commands can reference
