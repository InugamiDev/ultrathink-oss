---
name: code-review
description: Multi-pass code review covering logic correctness, security, performance, style, and maintainability
layer: hub
category: workflow
triggers:
  - "/code-review"
  - "review this code"
  - "check this code"
  - "review my changes"
  - "is this code good"
inputs:
  - target: File(s), diff, PR, or code snippet to review
  - focus: Specific concern area (optional -- security, performance, etc.)
  - context: What the code is supposed to do (optional but helpful)
outputs:
  - reviewReport: Structured report with findings across all passes
  - findings: Categorized issues (critical, major, minor, nit)
  - suggestions: Concrete improvement recommendations with code examples
linksTo:
  - fix
  - refactor
  - test
  - scout
  - optimize
linkedFrom:
  - cook
  - team
  - ship
  - fix
  - refactor
preferredNextSkills:
  - fix
  - refactor
  - test
fallbackSkills:
  - scout
  - debug
riskLevel: low
memoryReadPolicy: selective
memoryWritePolicy: selective
sideEffects:
  - Reads source files
  - Produces review report in working memory
  - Does NOT modify any files
---

# Code-Review Skill

## Purpose

Perform thorough, multi-pass code review that catches bugs, security vulnerabilities, performance issues, and maintainability problems before they reach production. Each pass focuses on a different dimension of code quality.

A code review is not a checklist exercise. It is an act of empathy -- reading code as a future maintainer who needs to understand it, modify it, and trust it.

## Workflow

### Pre-Review: Context Gathering

1. **Understand what the code is supposed to do** -- Read the PR description, commit messages, or user explanation. If none is available, infer the intent from the code itself and state your assumption.
2. **Identify the scope** -- What files are being reviewed? What is the blast radius of these changes?
3. **Read related code** -- Understand the interfaces and contracts the code interacts with. Read the caller and callee code, not just the changed code.

### Pass 1: Logic and Correctness

Focus: Does the code do what it is supposed to do?

4. **Trace the happy path** -- Walk through the main execution path. Does it produce the correct result?
5. **Trace error paths** -- What happens when things go wrong? Are errors handled? Do they propagate correctly?
6. **Check edge cases**:
   - Empty inputs (null, undefined, empty string, empty array, zero)
   - Boundary values (max int, empty collections, single-element collections)
   - Concurrent access (if applicable)
   - Unicode/special characters in strings
7. **Check state management** -- Are there race conditions? Can state become inconsistent? Are there memory leaks?
8. **Check types** -- Are types correct and specific enough? Any unsafe casts or `any` types?
9. **Check return values** -- Are all code paths covered? Can a function return undefined unexpectedly?

### Pass 2: Security

Focus: Can this code be exploited?

10. **Input validation** -- Is all user/external input validated and sanitized?
11. **Injection risks** -- SQL injection, XSS, command injection, template injection
12. **Authentication/Authorization** -- Are access controls properly checked? Any privilege escalation paths?
13. **Data exposure** -- Are sensitive fields (passwords, tokens, PII) properly protected? Not logged? Not returned in API responses?
14. **Cryptography** -- Are secure algorithms used? Are secrets stored properly? No hardcoded credentials?
15. **Dependencies** -- Are new dependencies trustworthy? Known vulnerabilities?

### Pass 3: Performance

Focus: Will this code perform well at scale?

16. **Algorithm complexity** -- Are there O(n^2) or worse operations hidden in loops? Can they be optimized?
17. **Database queries** -- N+1 query problems? Missing indexes? Unbounded queries?
18. **Memory usage** -- Large allocations? Unbounded caches? Memory leaks?
19. **Network calls** -- Sequential calls that could be parallel? Missing timeouts? Missing retries?
20. **Rendering** (if frontend) -- Unnecessary re-renders? Missing memoization? Large bundle impact?
21. **Caching** -- Are cacheable computations cached? Are caches invalidated correctly?

### Pass 4: Style and Maintainability

Focus: Will a future developer understand and safely modify this code?

22. **Naming** -- Are variable, function, and type names clear and consistent?
23. **Structure** -- Is the code organized logically? Are functions/methods a reasonable size?
24. **Duplication** -- Is there copied code that should be extracted?
25. **Comments** -- Are complex sections explained? Are there misleading or stale comments?
26. **Consistency** -- Does the code match the project's established patterns and conventions?
27. **Testability** -- Is the code easy to test? Are dependencies injectable?
28. **Dead code** -- Is there unreachable code, unused variables, or commented-out code?

### Pass 5: Architecture (for larger changes)

Focus: Does this change fit well in the broader system?

29. **Abstraction level** -- Are abstractions at the right level? Too abstract? Too concrete?
30. **Coupling** -- Does this change increase coupling between modules?
31. **API design** -- Are interfaces clean and intuitive? Will they need breaking changes soon?
32. **Migration path** -- If this changes existing behavior, is the migration handled?

### Synthesis

33. **Categorize findings** by severity:
    - **Critical**: Must fix before merge. Bugs, security vulnerabilities, data loss risks.
    - **Major**: Should fix before merge. Performance issues, missing error handling, design concerns.
    - **Minor**: Nice to fix. Style issues, minor improvements, better naming.
    - **Nit**: Optional. Formatting, personal preferences, alternative approaches.

34. **Produce the review report** using the template below.

## Review Report Template

```markdown
# Code Review Report

## Summary
**Files reviewed**: [count]
**Overall assessment**: Approve | Request Changes | Needs Discussion
**Critical issues**: [count]
**Major issues**: [count]

---

## Critical Issues
### [C1] [Title]
**File**: [path:line]
**Category**: Logic | Security | Performance
**Description**: [what is wrong]
**Impact**: [what could happen]
**Suggestion**:
```[language]
// suggested fix
```

---

## Major Issues
### [M1] [Title]
...

## Minor Issues
### [m1] [Title]
...

## Nits
- [file:line] [suggestion]
- ...

---

## Positive Observations
- [something done well -- reinforce good practices]
- ...

## Recommended Follow-ups
- [ ] [action] (via [skill])
```

## Usage

### Review specific files
```
/code-review src/lib/auth.ts src/app/api/login/route.ts
```

### Review with focus
```
/code-review Security review of the payment processing module
```

### Review recent changes
```
/code-review Review the changes in the last commit
```

### Review a PR
```
/code-review Review PR #42
```

## Examples

### Example: Finding a logic bug

**Code**:
```typescript
function getDiscount(items: Item[]): number {
  if (items.length > 10) return 0.15;
  if (items.length > 5) return 0.10;
  if (items.length > 0) return 0.05;
}
```

**Finding (Critical)**: Function has no return statement when `items.length === 0`. Returns `undefined`, which will cause NaN when used in arithmetic.

### Example: Finding a security issue

**Code**:
```typescript
const query = `SELECT * FROM users WHERE email = '${email}'`;
```

**Finding (Critical)**: SQL injection vulnerability. User-provided `email` is interpolated directly into the query string. Use parameterized queries instead.

### Example: Finding a performance issue

**Code**:
```typescript
const results = users.map(user => {
  const orders = await db.orders.findMany({ where: { userId: user.id } });
  return { ...user, orders };
});
```

**Finding (Major)**: N+1 query problem. For 1000 users, this makes 1001 database queries. Use a single query with a JOIN or batch the lookups.

## Guidelines

- **Review the code, not the person** -- Frame findings as observations about the code, not judgments about the author.
- **Provide solutions, not just problems** -- Every finding should include a concrete suggestion or code example.
- **Acknowledge good work** -- Include positive observations. Reviews that only find problems are demoralizing.
- **Prioritize ruthlessly** -- A review with 3 critical findings is more useful than one with 50 nits.
- **Be specific** -- "This could be better" is not useful. "This loop is O(n^2) because of the inner filter; use a Set for O(n)" is useful.
- **Question, do not command** -- For subjective issues, phrase as questions: "Would it be clearer to..."
- **Consider context** -- Code in a prototype has different standards than code in a payment system.
- **Do not rewrite** -- The review identifies issues. The `fix` or `refactor` skill implements changes.
