---
name: ut-cook
description: End-to-end feature builder — plan, research, scout, code, test, review, ship
disable-model-invocation: true
allowed-tools: Read, Bash, Grep, Glob, Edit, Write, Agent, WebSearch, WebFetch
argument-hint: "feature description"
---

# UltraThink Cook — Full Feature Pipeline

The `cook` orchestrator runs the complete feature development lifecycle. This is the most powerful UltraThink command — it chains 7 skills automatically.

## Pipeline

```
plan → scout → [domain skills] → test → code-review → ship-ready
```

## Execution Steps

### Phase 1: Plan
Read `~/.claude/skills/plan/SKILL.md`. Create a phased implementation plan:
- Break the feature into phases
- Identify risks and assumptions
- List files to create/modify
- Present plan for user approval before continuing

### Phase 2: Scout
Read `~/.claude/skills/scout/SKILL.md`. Explore the codebase:
- Find related existing code
- Understand patterns and conventions
- Identify integration points
- Map dependencies

### Phase 3: Implement
Based on the task, identify and load the relevant domain skills:
- Frontend: read `react`, `nextjs`, `tailwindcss`, `typescript-frontend` as needed
- Backend: read `nodejs`, `python`, `fastapi`, `graphql` as needed
- Database: read `postgresql`, `prisma`, `drizzle`, `supabase` as needed
- Auth: read `authentication`, `better-auth` as needed

Implement following the patterns and best practices from each loaded skill.

### Phase 4: Test
Read `~/.claude/skills/test/SKILL.md`. Generate and run tests:
- Unit tests for new functions
- Integration tests for API endpoints
- Verify edge cases from the skill's pitfalls section

### Phase 5: Review
Read `~/.claude/skills/code-review/SKILL.md`. Self-review the implementation:
- Logic correctness
- Security (OWASP patterns)
- Performance
- Code style consistency

### Phase 6: Summary
Present a summary of what was built:
- Files created/modified
- Tests passing
- Review findings (if any)
- Remaining TODOs or follow-ups

## Task

Build the following feature: $ARGUMENTS

Start with Phase 1 (Plan) and wait for approval before proceeding.
