# Pull Request Process

How to submit and review pull requests for UltraThink.

## Before Submitting

Run the full validation suite:

```bash
npm run test           # Vitest
npm run lint           # ESLint
npm run format:check   # Prettier
npm run typecheck      # TypeScript (if you changed TS files)
```

Additional checks based on what you changed:

- **Hook changes**: `bash -n .claude/hooks/your-hook.sh`
- **prompt-analyzer.ts changes**: `cd .claude/hooks && npx tsc`
- **Migration changes**: `npm run migrate` against a test database

## PR Template

```markdown
## Summary

- What does this change?
- Why?

## Type

- [ ] New skill
- [ ] New hook
- [ ] Dashboard feature
- [ ] Memory system change
- [ ] Database migration
- [ ] Bug fix
- [ ] Documentation

## Testing

- [ ] Tests pass (`npm run test`)
- [ ] Lint passes (`npm run lint`)
- [ ] Manually tested in Claude Code session

## Breaking changes

- None / describe any breaking changes
```

## Review Process

1. **All PRs require at least one review**
2. **Database migrations** require extra scrutiny (irreversible in production)
3. **Hook changes** should include performance benchmarks (before/after timing)
4. **Skill additions** should include example prompts that trigger them

## Review Checklist

### For skill PRs

- [ ] SKILL.md follows the standard template
- [ ] YAML frontmatter is valid
- [ ] Triggers are specific (not overly generic)
- [ ] `linksTo` / `linkedFrom` are bidirectional
- [ ] `_registry.json` is updated
- [ ] Example prompts demonstrate the skill

### For hook PRs

- [ ] Script starts with `set -euo pipefail`
- [ ] Variables are quoted
- [ ] Handles missing input gracefully
- [ ] Uses matchers to limit scope
- [ ] Runs in under 5 seconds
- [ ] Logs to standard JSONL format

### For dashboard PRs

- [ ] Server components used by default
- [ ] Client components marked with `"use client"`
- [ ] Tailwind v4 classes only
- [ ] Responsive layout works
- [ ] API routes use parameterized queries

### For migration PRs

- [ ] Uses `IF NOT EXISTS` for idempotency
- [ ] No column or table drops
- [ ] Indexes added for queried columns
- [ ] UUIDs for primary keys
- [ ] TIMESTAMPTZ for dates

## Merge Policy

- Squash merge for single-commit PRs
- Regular merge for multi-commit PRs with meaningful history
- Rebase before merge to keep a linear history
