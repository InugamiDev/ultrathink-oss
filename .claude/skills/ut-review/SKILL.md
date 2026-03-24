---
name: ut-review
description: Multi-pass code review using UltraThink code-review and security-scanner skills
disable-model-invocation: true
allowed-tools: Read, Grep, Glob, Bash
argument-hint: "[file-or-directory]"
---

# UltraThink Code Review

Run a multi-pass code review following the `code-review` and `security-scanner` skills.

## Load skills

Read these skill files for patterns:
- `~/.claude/skills/code-review/SKILL.md`
- `~/.claude/skills/security-scanner/SKILL.md`

## Target

Review `$ARGUMENTS`. If no argument provided, review all recently modified files:

```bash
git diff --name-only HEAD~1 2>/dev/null || git diff --name-only --cached 2>/dev/null || echo "No git changes found"
```

## Review Passes

### Pass 1: Logic & Correctness
- Control flow errors
- Off-by-one errors
- Null/undefined handling
- Race conditions
- Error handling gaps

### Pass 2: Security
- Injection vulnerabilities (SQL, XSS, command)
- Authentication/authorization gaps
- Sensitive data exposure
- OWASP Top 10 checks

### Pass 3: Performance
- N+1 queries
- Unnecessary re-renders
- Missing memoization
- Large bundle imports
- Unoptimized loops

### Pass 4: Style & Conventions
- Naming consistency
- File organization
- TypeScript type safety
- Dead code

## Output Format

```
Code Review Summary
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Files reviewed: X
Issues found:   X (Y critical, Z warnings)

Critical:
  - [file:line] Description

Warnings:
  - [file:line] Description

Suggestions:
  - [file:line] Description

Verdict: PASS / NEEDS CHANGES
```
