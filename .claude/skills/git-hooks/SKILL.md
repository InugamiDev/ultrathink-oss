---
name: git-hooks
description: Git hooks with Husky setup, pre-commit with lint-staged, commit-msg with commitlint, pre-push checks, and conventional commits enforcement
layer: utility
category: devops
triggers:
  - "git hooks"
  - "husky"
  - "pre-commit"
  - "lint-staged"
  - "commitlint"
  - "conventional commits"
  - "pre-push"
  - "commit message format"
inputs: [package manager, linters/formatters in use, commit convention, CI pipeline]
outputs: [husky config, lint-staged config, commitlint config, hook scripts]
linksTo: [cicd, dev-workflow, git-workflow]
linkedFrom: [bootstrap, code-review, ship]
preferredNextSkills: [cicd, dev-workflow]
fallbackSkills: [git-workflow, shell-scripting]
riskLevel: low
memoryReadPolicy: selective
memoryWritePolicy: none
sideEffects:
  - Adds husky, lint-staged, commitlint dependencies
  - Creates .husky/ directory with hook scripts
  - Modifies package.json (prepare script, lint-staged config)
---

# Git Hooks Skill

## Purpose

Automate code quality enforcement at commit and push time. Catch lint errors, formatting issues, and bad commit messages before they enter the repository -- not in CI where feedback is slow.

## Setup

### Husky + lint-staged + commitlint (Full Stack)

```bash
# Install dependencies
pnpm add -D husky lint-staged @commitlint/cli @commitlint/config-conventional

# Initialize husky
pnpm exec husky init
```

### Package.json Config

```json
{
  "scripts": {
    "prepare": "husky"
  },
  "lint-staged": {
    "*.{ts,tsx}": [
      "eslint --fix --max-warnings 0",
      "prettier --write"
    ],
    "*.{json,md,css}": [
      "prettier --write"
    ]
  }
}
```

## Hook Scripts

### Pre-Commit: Lint Staged Files Only

```bash
# .husky/pre-commit
pnpm exec lint-staged
```

```typescript
// lint-staged.config.ts — advanced config with type checking
import type { Config } from "lint-staged";

const config: Config = {
  "*.{ts,tsx}": (filenames) => [
    `eslint --fix --max-warnings 0 ${filenames.join(" ")}`,
    `prettier --write ${filenames.join(" ")}`,
    "tsc --noEmit --pretty",  // Type check entire project (not per-file)
  ],
  "*.css": ["prettier --write"],
  "*.{json,md}": ["prettier --write"],
};

export default config;
```

### Commit-Msg: Enforce Conventional Commits

```bash
# .husky/commit-msg
pnpm exec commitlint --edit $1
```

```typescript
// commitlint.config.ts
import type { UserConfig } from "@commitlint/types";

const config: UserConfig = {
  extends: ["@commitlint/config-conventional"],
  rules: {
    "type-enum": [
      2,
      "always",
      ["feat", "fix", "docs", "style", "refactor", "perf", "test", "build", "ci", "chore", "revert"],
    ],
    "subject-max-length": [2, "always", 72],
    "body-max-line-length": [1, "always", 100],
  },
};

export default config;
```

### Conventional Commit Format

```
type(scope): description

feat(auth): add OAuth 2.0 login flow
fix(cart): resolve quantity update race condition
docs(api): update endpoint documentation
refactor(db): extract query builder utility
perf(images): lazy load below-fold images
test(checkout): add integration tests for payment flow
```

### Pre-Push: Run Tests and Type Check

```bash
# .husky/pre-push
pnpm run typecheck
pnpm run test:ci
```

## Advanced Patterns

### Skip Hooks When Needed

```bash
# Emergency bypass (use sparingly)
git commit --no-verify -m "hotfix: critical production fix"
git push --no-verify
```

### Branch Name Validation

```bash
# .husky/pre-push
BRANCH=$(git rev-parse --abbrev-ref HEAD)
PATTERN="^(feat|fix|hotfix|chore|refactor)/[a-z0-9._-]+$"

if [[ ! "$BRANCH" =~ $PATTERN ]] && [[ "$BRANCH" != "main" ]] && [[ "$BRANCH" != "develop" ]]; then
  echo "Branch name '$BRANCH' does not match pattern: $PATTERN"
  exit 1
fi
```

## Best Practices

- **Lint only staged files**: Use lint-staged to keep pre-commit fast (seconds, not minutes).
- **Type check the full project**: `tsc --noEmit` must check all files since types are interconnected.
- **Keep hooks fast**: Pre-commit under 10 seconds. Move slow checks (e2e, full test suite) to CI.
- **Commit the hooks**: Husky hooks in `.husky/` are version-controlled so the whole team uses them.
- **Document bypass**: Teams need `--no-verify` for hotfixes, but log when it happens.
- **Match CI checks**: Hooks should be a subset of CI. Never have hooks stricter than CI.

## Common Pitfalls

| Pitfall | Fix |
|---------|-----|
| Hooks not running for teammates | Ensure `"prepare": "husky"` in package.json |
| Pre-commit is too slow | Use lint-staged, not full-project lint |
| tsc fails on unrelated files | That is correct -- type errors anywhere break the build |
| Hooks fail in CI environment | CI should set `HUSKY=0` to skip hooks (it runs its own checks) |
| Forgot to run `pnpm install` | Husky installs via the `prepare` script automatically |
