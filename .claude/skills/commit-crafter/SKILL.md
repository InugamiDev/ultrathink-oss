---
name: commit-crafter
description: Generate well-structured conventional commit messages from staged changes with appropriate type, scope, and description
layer: utility
category: developer-workflow
triggers:
  - "commit message"
  - "write commit"
  - "conventional commit"
  - "how should I commit this"
  - "craft commit"
inputs:
  - Staged changes (git diff --staged)
  - Context about the change (optional)
  - Commit convention in use (Conventional Commits, Angular, custom)
outputs:
  - Formatted commit message following project conventions
  - Type classification (feat, fix, docs, etc.)
  - Scope recommendation
  - Breaking change notation if applicable
  - Body with detailed explanation when needed
linksTo:
  - changelog-writer
  - pr-writer
  - git-workflow
linkedFrom:
  - ship
  - git-workflow
  - code-review
preferredNextSkills:
  - pr-writer
  - changelog-writer
fallbackSkills:
  - docs-writer
riskLevel: low
memoryReadPolicy: selective
memoryWritePolicy: selective
sideEffects: []
---

# Commit Crafter Skill

## Purpose

Write commit messages that tell the story of your codebase. A good commit message enables efficient code review, powers automated changelogs, simplifies bisecting bugs, and helps future developers understand not just what changed but why.

## Key Concepts

### Conventional Commits Format

```
<type>(<scope>): <description>

[optional body]

[optional footer(s)]
```

**Rules:**
1. Subject line max 72 characters
2. No period at end of subject
3. Imperative mood ("Add feature" not "Added feature")
4. Body wraps at 72 characters
5. Body explains WHAT and WHY, not HOW (the diff shows how)

### Commit Types

| Type | When to Use | Appears in Changelog |
|------|-------------|---------------------|
| `feat` | New feature for the user | Yes (Added) |
| `fix` | Bug fix for the user | Yes (Fixed) |
| `docs` | Documentation only changes | No |
| `style` | Formatting, whitespace, semicolons | No |
| `refactor` | Code change that neither fixes nor adds | No |
| `perf` | Performance improvement | Yes (Changed) |
| `test` | Adding or correcting tests | No |
| `build` | Build system or external dependencies | No |
| `ci` | CI configuration and scripts | No |
| `chore` | Maintenance tasks, dependency bumps | No |
| `revert` | Reverts a previous commit | Yes |

### Scope Selection

Scope should be a noun describing the section of the codebase:

```
feat(auth): add OAuth2 support for GitHub
fix(api): handle null response from payment gateway
docs(readme): add deployment instructions
refactor(db): extract query builder into separate module
test(cart): add integration tests for checkout flow
build(deps): bump next from 14.1 to 14.2
ci(deploy): add staging environment to pipeline
```

**Common scopes:** `auth`, `api`, `ui`, `db`, `config`, `deps`, `core`, `router`, `middleware`, component names

## Workflow

### Step 1: Analyze the Diff

Read the staged changes and identify:
1. **What files changed?** — Suggests the scope
2. **What kind of change?** — Suggests the type
3. **Is anything removed/renamed?** — Might be breaking
4. **How many logical changes?** — Should this be multiple commits?

### Step 2: Classify the Change

```
Decision Tree:

Is this a new user-facing feature?
  → feat

Does this fix a bug that users experience?
  → fix

Does this change behavior without adding features or fixing bugs?
  → refactor (if no user impact) or feat/fix (if user impact)

Does this only change tests?
  → test

Does this only change documentation?
  → docs

Does this only change CI/CD?
  → ci

Does this only change build configuration?
  → build

Does this improve performance measurably?
  → perf

Does this revert a previous commit?
  → revert
```

### Step 3: Craft the Message

#### Subject Line Patterns

```
Good subjects:
  feat(auth): add password reset via email
  fix(cart): prevent duplicate items when clicking rapidly
  refactor(api): extract validation middleware from route handlers
  perf(search): add database index for full-text queries
  docs(api): document rate limiting behavior

Bad subjects:
  fix: fixed the bug                    ← Too vague
  feat(auth): Added new auth feature    ← Past tense, redundant
  update files                          ← No type, no scope, no meaning
  WIP                                   ← Never commit WIP to main
  fix(auth): fix auth issue.            ← Trailing period
  feat: implement the new user registration system with email verification and admin approval workflow  ← Too long
```

#### Body (When Needed)

Add a body when the subject alone does not explain the change:

```
fix(payments): use idempotency key for Stripe charges

The checkout flow could create duplicate charges when users
double-clicked the submit button. The browser-side debounce was
insufficient because it did not survive page navigations.

Now each checkout session generates a unique idempotency key
that Stripe uses to deduplicate charge requests. This guarantees
at-most-once processing regardless of client behavior.

Closes #234
```

#### Breaking Changes

```
feat(api)!: require authentication for all endpoints

BREAKING CHANGE: All API endpoints now require a valid Bearer token.
Previously, read-only endpoints were publicly accessible.

Migration guide:
1. Generate an API key in Settings > API Keys
2. Add `Authorization: Bearer <key>` header to all requests
3. Public endpoints now return 401 without authentication

Closes #567
```

The `!` after the type/scope signals a breaking change. The `BREAKING CHANGE:` footer provides details.

### Step 4: Verify Before Committing

```
Checklist:
  [ ] Subject line under 72 characters
  [ ] Uses imperative mood
  [ ] Type is correct
  [ ] Scope is appropriate
  [ ] No trailing period
  [ ] Body explains WHY (if present)
  [ ] Breaking changes noted with ! and footer
  [ ] Related issue/PR referenced
  [ ] This is a single logical change (not multiple squished together)
```

## Examples by Scenario

### Simple Bug Fix

```
fix(ui): prevent layout shift when images load

Add explicit width/height to avatar images in the user list.
This eliminates the CLS (Cumulative Layout Shift) reported by
Lighthouse on the team page.
```

### Feature with Multiple Files

```
feat(export): add CSV export for transaction history

Users can now download their transaction history as a CSV file
from the Transactions page. The export respects current filters
(date range, type, status) and includes all visible columns.

- New ExportButton component with format selection
- API endpoint: GET /api/transactions/export?format=csv
- Rate limited to 10 exports per hour per user

Closes #312
```

### Dependency Update

```
build(deps): bump next from 14.1.0 to 14.2.0

Includes built-in support for Partial Prerendering (experimental)
and improved development server startup time.

See: https://nextjs.org/blog/next-14-2
```

### Revert

```
revert: feat(search): add elasticsearch integration

This reverts commit abc123def456.

The Elasticsearch cluster is causing memory issues in staging.
Reverting to the PostgreSQL full-text search while we investigate.

See #489 for tracking.
```

### Multi-Scope Change (Split It)

If a change touches multiple scopes, consider splitting into multiple commits:

```
# Instead of one big commit:
feat: add dark mode with API preferences and UI toggle

# Split into:
feat(api): add user theme preference endpoint
feat(ui): add dark mode toggle to settings page
feat(theme): implement CSS custom properties for dark mode
```

## Atomic Commits

Each commit should be:
1. **Complete** — The codebase works after this commit (tests pass)
2. **Focused** — One logical change per commit
3. **Reversible** — Can be reverted without breaking unrelated features

```
BAD commit history:
  abc123 WIP
  def456 more WIP
  789abc fix tests
  bcd012 actually fix tests
  ef0123 final fix

GOOD commit history:
  abc123 feat(auth): add OAuth2 login with GitHub
  def456 test(auth): add integration tests for OAuth flow
  789abc docs(auth): document OAuth setup in README
```

## Integration with Git Hooks

```bash
# .husky/commit-msg (validate commit message format)
#!/usr/bin/env sh
npx --no -- commitlint --edit "$1"

# commitlint.config.js
module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'subject-max-length': [2, 'always', 72],
    'body-max-line-length': [2, 'always', 100],
    'scope-enum': [2, 'always', [
      'auth', 'api', 'ui', 'db', 'config', 'deps', 'core',
    ]],
  },
};
```
