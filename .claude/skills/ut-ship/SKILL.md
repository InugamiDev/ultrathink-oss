---
name: ut-ship
description: Ship workflow — test, review, changelog, commit, and prepare for deploy
disable-model-invocation: true
allowed-tools: Read, Bash, Grep, Glob, Edit, Write
argument-hint: "[commit message]"
---

# UltraThink Ship

Run the shipping checklist: test → review → changelog → commit.

## Load skills

Read these for patterns:
- `~/.claude/skills/ship/SKILL.md`
- `~/.claude/skills/test/SKILL.md`
- `~/.claude/skills/commit-crafter/SKILL.md`
- `~/.claude/skills/changelog-writer/SKILL.md`

## Pipeline

### Step 1: Pre-flight Checks

```bash
# Check for uncommitted changes
git status --short

# Check current branch
git branch --show-current

# Check if tests exist and pass
npm test 2>/dev/null || echo "No test script found"
```

### Step 2: Review Changes

Run a quick review of staged/unstaged changes:

```bash
git diff --stat
git diff --cached --stat
```

Flag any obvious issues (console.logs, TODO comments, debug code).

### Step 3: Generate Changelog Entry

Based on the changes, generate a changelog entry following Keep a Changelog format.

### Step 4: Craft Commit

Using the `commit-crafter` skill patterns, generate a conventional commit message:
- `feat:` for new features
- `fix:` for bug fixes
- `refactor:` for refactoring
- `docs:` for documentation
- `test:` for tests

If `$ARGUMENTS` is provided, use it as the commit message base.

### Step 5: Confirmation

Present the full summary before committing:

```
Ship Summary
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Branch:   feature/xyz
Changes:  X files modified, Y insertions, Z deletions
Tests:    passed / failed / skipped
Review:   clean / X issues found

Commit message:
  feat: description here

Changelog:
  ### Added
  - New feature description

Proceed? [y/N]
```

Wait for user confirmation before creating the commit.
