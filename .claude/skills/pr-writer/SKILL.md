---
name: pr-writer
description: Generate comprehensive pull request descriptions with summary, context, testing plan, and review guidance
layer: utility
category: developer-workflow
triggers:
  - "write PR"
  - "PR description"
  - "pull request"
  - "create PR"
  - "describe this PR"
inputs:
  - Branch diff (commits, changed files)
  - Related issue or ticket
  - Context about the change
  - Team conventions for PR format
outputs:
  - Formatted PR title
  - Structured PR description with summary, context, changes, testing, and screenshots
  - Review checklist
  - Deployment notes if applicable
linksTo:
  - commit-crafter
  - changelog-writer
  - code-review
  - git-workflow
linkedFrom:
  - ship
  - git-workflow
preferredNextSkills:
  - code-review
  - ship
fallbackSkills:
  - docs-writer
riskLevel: low
memoryReadPolicy: selective
memoryWritePolicy: selective
sideEffects: []
---

# PR Writer Skill

## Purpose

Write pull request descriptions that enable efficient, thorough code review. A well-written PR saves reviewers time, reduces back-and-forth, and creates a permanent record of why changes were made. The PR description is not for you (you know what you did) — it is for everyone else.

## Key Concepts

### The PR Contract

A pull request communicates:
1. **What** changed (summary)
2. **Why** it changed (motivation/context)
3. **How** it changed (implementation approach)
4. **How to verify** it works (testing plan)
5. **What could go wrong** (risk assessment)

### PR Size Guidelines

| Size | Files Changed | Lines Changed | Review Time |
|------|--------------|---------------|-------------|
| XS | 1-2 | < 50 | 5 min |
| S | 3-5 | 50-200 | 15 min |
| M | 5-10 | 200-500 | 30 min |
| L | 10-20 | 500-1000 | 1 hour |
| XL | 20+ | 1000+ | Split this PR |

Target: **Small PRs** (S-M). Large PRs get superficial reviews.

## Workflow

### Step 1: Analyze the Branch

Gather information:
```bash
# What commits are in this branch
git log main..HEAD --oneline

# What files changed
git diff main..HEAD --stat

# Full diff for understanding changes
git diff main..HEAD

# Related issues
gh issue view <number>
```

### Step 2: Write the Title

```
Format: <type>: <concise description> (#issue)

Rules:
- Under 70 characters
- Imperative mood
- No period at end
- Include issue number if applicable

Good:
  feat: add CSV export for transaction history (#312)
  fix: prevent duplicate charges on double-click (#234)
  refactor: extract auth middleware into separate package

Bad:
  Updated the code
  Fix
  WIP: working on the new feature
  Implementing the new user registration system with email verification
```

### Step 3: Write the Description

#### Standard PR Template

```markdown
## Summary
[1-3 sentences explaining what this PR does and why]

## Context
[Link to issue/ticket. Background on why this change is needed.
What problem does it solve? What was the previous behavior?]

Closes #123

## Changes
- [Bullet point of each logical change]
- [Another change]
- [And another]

## Implementation Notes
[Optional: Explain non-obvious design decisions, trade-offs,
or alternative approaches you considered and rejected]

## Screenshots / Recordings
[For UI changes: before/after screenshots or screen recordings]

| Before | After |
|--------|-------|
| ![before](url) | ![after](url) |

## Testing
- [ ] Unit tests added/updated
- [ ] Integration tests pass
- [ ] Manual testing steps:
  1. Go to [page/feature]
  2. Do [action]
  3. Verify [expected result]

## Deployment Notes
[Optional: Any special deployment steps, feature flags,
migrations, or rollback considerations]

## Checklist
- [ ] Code follows project conventions
- [ ] Self-reviewed the diff
- [ ] No console.log or debug statements
- [ ] No hardcoded secrets or credentials
- [ ] Documentation updated (if applicable)
- [ ] Accessibility checked (if UI change)
```

### Step 4: Add Context for Reviewers

#### For Complex PRs

```markdown
## Review Guide

**Start here:** `src/services/payment-service.ts` — This is the core change.
The rest of the files are supporting changes.

**Key decisions to review:**
1. I used an idempotency key approach instead of client-side debouncing
   because [reason]. See `processPayment()` at line 45.
2. The retry logic uses exponential backoff with jitter. I considered
   circuit breaker but it was overkill for this use case.

**What I am NOT confident about:**
- The error handling in `handleWebhook()` — I am not sure if we should
  retry or dead-letter failed webhook events. Would appreciate input.

**Out of scope (intentionally):**
- Refactoring the webhook handler — tracked in #456
- Adding monitoring — tracked in #457
```

#### For Migration PRs

```markdown
## Migration Details

**Type:** Database schema migration
**Reversible:** Yes (down migration included)
**Downtime:** None — backward compatible
**Data backfill:** Required, runs async after deploy

### Migration Steps
1. Deploy this PR (adds new column, nullable)
2. Run backfill job: `npm run migrate:backfill-user-roles`
3. Verify: `SELECT COUNT(*) FROM users WHERE role IS NULL` should be 0
4. Deploy follow-up PR (#460) that makes column NOT NULL

### Rollback Plan
1. Revert this PR
2. Run: `npm run migrate:down -- --to 20250615`
3. Verify application works without the new column
```

## PR Description by Scenario

### Bug Fix PR

```markdown
## Summary
Fix duplicate Stripe charges when users double-click the checkout button.

## Context
Users reported being charged twice for single purchases. The root cause
was that rapid button clicks could trigger multiple API calls before the
UI disabled the button.

Closes #234
Reported by: 3 users in support tickets SW-891, SW-895, SW-903

## Changes
- Add idempotency key generation to checkout session creation
- Pass idempotency key to Stripe charge API
- Add client-side request deduplication as defense-in-depth
- Add regression test for concurrent checkout attempts

## Testing
- [ ] Unit test: `checkout-service.test.ts` — concurrent payment test
- [ ] Integration test: verify Stripe idempotency with test mode
- [ ] Manual test:
  1. Add item to cart, go to checkout
  2. Rapidly click "Pay Now" 5 times
  3. Verify only one charge appears in Stripe dashboard
  4. Verify order confirmation shows single charge
```

### Feature PR

```markdown
## Summary
Add CSV and JSON export functionality for transaction history,
respecting current filters and visible columns.

## Context
Users with accounting needs requested the ability to export their
transaction data for import into QuickBooks and other tools.

Closes #312
Design: [Figma link]
RFC: [link to design doc if applicable]

## Changes
- New `ExportButton` component with format dropdown (CSV, JSON)
- `GET /api/transactions/export` endpoint with format query param
- Export respects active filters (date range, type, status)
- Rate limited to 10 exports per hour per user
- Streaming response for large datasets (no memory issues)

## Screenshots
| Export button | Format selection |
|--------------|-----------------|
| ![button](url) | ![dropdown](url) |

## Testing
- [ ] Unit: ExportButton renders and triggers download
- [ ] Integration: API returns correct CSV/JSON format
- [ ] Integration: Rate limiting works (11th request returns 429)
- [ ] Manual: Export 10,000+ transactions without timeout
- [ ] Manual: Verify CSV opens correctly in Excel and Google Sheets
- [ ] Manual: Verify JSON is valid and parseable

## Deployment Notes
- Feature flag: `ENABLE_EXPORT` — deploy disabled, enable after QA
- No database migration needed
- No environment variable changes
```

### Refactor PR

```markdown
## Summary
Extract authentication logic from route handlers into dedicated
middleware, reducing duplication across 23 endpoints.

## Context
Auth checks were copy-pasted across route handlers with slight
variations, leading to inconsistencies (some endpoints checked
token expiry, others did not). This refactor centralizes auth
into composable middleware.

Related: #445 (auth audit findings)

## Changes
- New `requireAuth` middleware — validates JWT, attaches user to request
- New `requireRole(role)` middleware — checks user role after auth
- New `optionalAuth` middleware — attaches user if token present, continues if not
- Updated all 23 route handlers to use middleware instead of inline auth
- Removed 450 lines of duplicated auth code
- No behavior changes — all existing tests pass unmodified

## Review Guide
**Start with:** `src/middleware/auth.ts` — the three new middleware functions.
Then spot-check 2-3 route handler changes to verify the pattern.

The route handler changes are mechanical (remove inline auth, add middleware).
I verified each one but they are not individually interesting to review.

## Testing
- [ ] All existing auth tests pass (no behavior change)
- [ ] New middleware unit tests for edge cases
- [ ] Integration: verified all 23 endpoints still work with valid/invalid/expired tokens
```

## Anti-Patterns

1. **Empty description** — "Fixed stuff" tells reviewers nothing
2. **Novel-length description** — If the PR needs 500 words to explain, it is too large
3. **No testing plan** — "It works on my machine" is not a testing plan
4. **Screenshots of code** — Use code blocks, not images
5. **Mixing concerns** — "Add feature AND refactor AND fix bug" — split into 3 PRs
6. **No issue link** — Changes without context lack accountability
7. **WIP PRs without draft status** — Use GitHub draft PRs for work in progress

## Automation

```bash
# Generate PR from commits using gh CLI
gh pr create \
  --title "feat: add CSV export for transactions (#312)" \
  --body "$(cat <<'EOF'
## Summary
Add CSV and JSON export for transaction history.

## Changes
- ExportButton component
- Export API endpoint
- Rate limiting

## Test plan
- [ ] Unit tests
- [ ] Manual export test

Generated with Claude Code
EOF
)"
```
