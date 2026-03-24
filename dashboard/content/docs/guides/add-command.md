# Add a Command

Commands are **skill aliases** -- Markdown files in `.claude/commands/` that provide slash-command shortcuts to skills.

## Prerequisites

The target skill must already exist in `.claude/skills/[name]/SKILL.md`.

## Step 1: Create the Command File

```bash
touch .claude/commands/my-command.md
```

The filename (without `.md`) becomes the command name: `/my-command`.

### Naming Conventions

- Use **kebab-case**: `my-command.md`
- Keep names short: `/cook`, `/plan`, `/debug`
- Use sub-commands: `plan.md` and `plan-validate.md` (invoked as `/plan` and `/plan:validate`)

## Step 2: Write the Command

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

/my-command Build a REST API for user management
```

### Template with Multiple Skills

```markdown
# /quick-check

When the user invokes `/quick-check`:

1. Invoke the `scout` skill with a Quick Scan on the specified target
2. Invoke the `code-review` skill, focusing on Logic and Security passes
3. Present a combined summary of findings
4. Suggest follow-up commands based on findings

## Examples

/quick-check src/api/auth/
/quick-check components/LoginForm.tsx
```

### Template with Options

```markdown
# /plan

When the user invokes `/plan`:

1. Load and execute the `plan` skill
2. Pass the text after `/plan` as the goal input
3. Write the plan to the configured `defaultPlanDir`

## Options

- `--phases N` -- Limit to N phases (default: auto)
- `--quick` -- Skip risk assessment for simple tasks
- `--validate` -- Immediately invoke `plan-validate` after creation

## Sub-commands

- `/plan:validate @plan-file.md` -- Validate an existing plan
- `/plan:archive` -- Archive completed plans

## Examples

/plan Implement user authentication with OAuth
/plan --quick Add a dark mode toggle
/plan:validate plans/auth-implementation.md
```

## Step 3: Handle Sub-commands

Create separate files with a naming convention:

```
.claude/commands/
  plan.md              # /plan
  plan-validate.md     # /plan:validate
  plan-archive.md      # /plan:archive
```

## Step 4: Test

```
/my-command Test input here
```

Verify: command recognized, correct skill activated, input passed correctly, coding level respected.

## Best Practices

**Do**:
- Keep commands simple -- delegate to skills
- Document examples with real inputs
- Include scope notes

**Don't**:
- Duplicate skill logic in the command file
- Create commands without backing skills
- Use ambiguous names (`/do` is too vague)
