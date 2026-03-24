---
name: dev-workflow
description: Development workflow optimization — ESLint flat config, Prettier, TypeScript strict mode, pre-commit hooks, build optimization, branch strategy, and monorepo patterns
layer: utility
category: development
triggers:
  - "dev workflow"
  - "DX"
  - "developer experience"
  - "eslint config"
  - "prettier config"
  - "pre-commit hooks"
  - "lint-staged"
  - "husky"
  - "monorepo"
  - "turborepo"
  - "build optimization"
  - "editorconfig"
  - "commitlint"
  - "dx setup"
inputs:
  - "Project type and tech stack"
  - "Team size and workflow requirements"
  - "Build performance concerns"
  - "Monorepo structure needs"
outputs:
  - "ESLint, Prettier, TypeScript configuration files"
  - "Pre-commit hook setup (husky + lint-staged)"
  - "Build optimization recommendations"
  - "Branch strategy and workflow documentation"
linksTo:
  - git-workflow
  - test
  - code-review
  - cicd
linkedFrom:
  - cook
  - bootstrap
  - plan
preferredNextSkills:
  - git-workflow
  - test
  - cicd
fallbackSkills:
  - code-review
riskLevel: low
memoryReadPolicy: selective
memoryWritePolicy: selective
sideEffects:
  - Creates/modifies configuration files
  - Installs dev dependencies
  - Modifies git hooks
---

# Dev Workflow

## Purpose

Optimize the developer experience loop: write code, get instant feedback, catch errors early, ship confidently. This skill covers the essential DX tooling stack organized in tiers, from individual essentials to team-scale infrastructure.

---

## DX Stack Tiers

### Tier 1: Every Project (Solo + Team)

Essential DX tools for any project, regardless of size.

#### TypeScript Strict Mode

```json
// tsconfig.json — non-negotiable settings
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "noPropertyAccessFromIndexSignature": true,
    "exactOptionalPropertyTypes": true,
    "forceConsistentCasingInFileNames": true,
    "isolatedModules": true,
    "moduleDetection": "force",
    "verbatimModuleSyntax": true,
    "skipLibCheck": true,

    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "esModuleInterop": true,
    "jsx": "react-jsx"
  }
}
```

Key flags explained:
- `noUncheckedIndexedAccess` — Array/object access returns `T | undefined` (catches #1 runtime error)
- `exactOptionalPropertyTypes` — Distinguishes `undefined` from "not set"
- `verbatimModuleSyntax` — Forces explicit `import type` for type-only imports
- `isolatedModules` — Ensures compatibility with SWC/esbuild (non-tsc bundlers)

#### ESLint Flat Config

```js
// eslint.config.js (flat config — ESLint 9+)
import js from "@eslint/js";
import tseslint from "typescript-eslint";
import reactPlugin from "eslint-plugin-react";
import hooksPlugin from "eslint-plugin-react-hooks";

export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    files: ["**/*.{ts,tsx}"],
    plugins: {
      react: reactPlugin,
      "react-hooks": hooksPlugin,
    },
    rules: {
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/consistent-type-imports": [
        "error",
        { prefer: "type-imports", fixStyle: "inline-type-imports" },
      ],
      "@typescript-eslint/no-misused-promises": [
        "error",
        { checksVoidReturn: { attributes: false } },
      ],
    },
  },
  {
    ignores: [
      "node_modules/",
      ".next/",
      "dist/",
      "build/",
      "coverage/",
      "*.config.{js,cjs,mjs}",
    ],
  }
);
```

#### Prettier

```json
// .prettierrc
{
  "semi": true,
  "singleQuote": false,
  "trailingComma": "all",
  "tabWidth": 2,
  "printWidth": 100,
  "bracketSpacing": true,
  "arrowParens": "always",
  "endOfLine": "lf",
  "plugins": ["prettier-plugin-tailwindcss"]
}
```

```
// .prettierignore
node_modules
.next
dist
build
coverage
pnpm-lock.yaml
```

#### EditorConfig

```ini
# .editorconfig
root = true

[*]
indent_style = space
indent_size = 2
end_of_line = lf
charset = utf-8
trim_trailing_whitespace = true
insert_final_newline = true

[*.md]
trim_trailing_whitespace = false

[Makefile]
indent_style = tab
```

#### Pre-commit Hooks (Husky + lint-staged)

```bash
# Install
pnpm add -D husky lint-staged
pnpm exec husky init
```

```json
// package.json
{
  "lint-staged": {
    "*.{ts,tsx}": [
      "eslint --fix --no-warn-ignored",
      "prettier --write"
    ],
    "*.{json,md,yml,yaml,css}": [
      "prettier --write"
    ]
  }
}
```

```bash
# .husky/pre-commit
pnpm exec lint-staged
```

### Tier 2: Team Projects

Additional tools for team collaboration and code quality.

#### Commitlint

```bash
pnpm add -D @commitlint/cli @commitlint/config-conventional
```

```js
// commitlint.config.js
export default {
  extends: ["@commitlint/config-conventional"],
  rules: {
    "type-enum": [
      2,
      "always",
      ["feat", "fix", "docs", "style", "refactor", "perf", "test", "build", "ci", "chore"],
    ],
    "subject-case": [2, "never", ["start-case", "pascal-case", "upper-case"]],
    "subject-max-length": [2, "always", 72],
    "body-max-line-length": [2, "always", 100],
  },
};
```

```bash
# .husky/commit-msg
pnpm exec commitlint --edit "$1"
```

#### Path Aliases

```json
// tsconfig.json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"],
      "@/components/*": ["./src/components/*"],
      "@/lib/*": ["./src/lib/*"],
      "@/hooks/*": ["./src/hooks/*"],
      "@/types/*": ["./src/types/*"]
    }
  }
}
```

#### PR Template

```markdown
<!-- .github/pull_request_template.md -->
## Summary

<!-- What does this PR do? Keep to 1-3 sentences. -->

## Changes

-

## Testing

- [ ] Unit tests added/updated
- [ ] Manual testing completed
- [ ] No regressions observed

## Screenshots

<!-- If UI changes, include before/after screenshots -->
```

#### Changesets

```bash
pnpm add -D @changesets/cli @changesets/changelog-github
pnpm exec changeset init
```

```json
// .changeset/config.json
{
  "$schema": "https://unpkg.com/@changesets/config@3.0.0/schema.json",
  "changelog": ["@changesets/changelog-github", { "repo": "org/repo" }],
  "commit": false,
  "access": "restricted",
  "baseBranch": "main"
}
```

### Tier 3: Monorepo

Tools for managing multi-package repositories.

#### Turborepo

```json
// turbo.json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": [".next/**", "dist/**"]
    },
    "lint": {
      "dependsOn": ["^build"]
    },
    "typecheck": {
      "dependsOn": ["^build"]
    },
    "test": {
      "dependsOn": ["^build"],
      "cache": false
    },
    "dev": {
      "persistent": true,
      "cache": false
    }
  }
}
```

#### Monorepo Structure

```
repo/
  apps/
    web/          Next.js app
    api/          API server
    admin/        Admin dashboard
  packages/
    ui/           Shared component library
    db/           Database schema + client
    config/       Shared ESLint, TS, Prettier configs
    types/        Shared TypeScript types
  turbo.json
  pnpm-workspace.yaml
```

```yaml
# pnpm-workspace.yaml
packages:
  - "apps/*"
  - "packages/*"
```

#### Package Boundaries

```json
// packages/config/package.json — shared ESLint config
{
  "name": "@repo/eslint-config",
  "exports": {
    "./base": "./eslint.base.js",
    "./react": "./eslint.react.js",
    "./next": "./eslint.next.js"
  }
}
```

```js
// apps/web/eslint.config.js
import { nextConfig } from "@repo/eslint-config/next";
export default nextConfig;
```

#### Remote Caching (Turborepo)

```bash
# Enable Vercel Remote Cache
npx turbo login
npx turbo link

# Or self-hosted
# Set TURBO_TOKEN and TURBO_TEAM env vars
```

---

## Build Optimization

### Parallel Tasks

Run independent tasks in parallel:

```json
// package.json scripts
{
  "scripts": {
    "check": "concurrently -n lint,types,test --kill-others-on-fail \"pnpm lint\" \"pnpm typecheck\" \"pnpm test:unit\"",
    "precommit": "pnpm check"
  }
}
```

Or with Turborepo:

```bash
turbo lint typecheck test --parallel
```

### Turbopack (Next.js Dev)

```bash
next dev --turbopack    # 10x faster HMR in development
```

### SWC (Compilation)

SWC is the default compiler in Next.js 12+. Ensure you're not overriding with Babel:

```
Delete: .babelrc, babel.config.js (if present)
Next.js will auto-use SWC without Babel config
```

### Bundle Analysis

```bash
# Next.js bundle analyzer
pnpm add -D @next/bundle-analyzer

# next.config.js
import withBundleAnalyzer from "@next/bundle-analyzer";
export default withBundleAnalyzer({ enabled: process.env.ANALYZE === "true" })({
  // ...config
});

# Run
ANALYZE=true pnpm build
```

### Tree Shaking Verification

```
Ensure package.json has:
  "sideEffects": false        (for libraries)
  "sideEffects": ["*.css"]    (for apps with CSS imports)

Use named exports, not default exports
Avoid barrel files (index.ts re-exports) in performance-critical paths
```

### CI Caching Strategy

```yaml
# GitHub Actions — cache node_modules and Turbo
- uses: actions/cache@v4
  with:
    path: |
      node_modules
      .turbo
      .next/cache
    key: ${{ runner.os }}-${{ hashFiles('pnpm-lock.yaml') }}-${{ github.sha }}
    restore-keys: |
      ${{ runner.os }}-${{ hashFiles('pnpm-lock.yaml') }}-
      ${{ runner.os }}-
```

---

## Branch Strategy

### Trunk-Based (Recommended for Small Teams)

```
main (production)
  ├── feat/feature-name    (short-lived, 1-3 days max)
  ├── fix/bug-description  (short-lived)
  └── chore/task-name      (short-lived)

Rules:
  - Branch from main, merge to main
  - Squash merge PRs (clean linear history)
  - No long-lived feature branches
  - Feature flags for incomplete features in production
```

### Git Flow (Larger Teams / Release Cycles)

```
main (production)
  └── develop (integration)
        ├── feature/xyz    (from develop)
        ├── release/v1.2   (from develop, merge to main + develop)
        └── hotfix/urgent  (from main, merge to main + develop)
```

### Branch Naming Convention

```
feat/short-description     New features
fix/short-description      Bug fixes
chore/short-description    Maintenance, refactoring
docs/short-description     Documentation only
test/short-description     Test additions/changes
perf/short-description     Performance improvements
ci/short-description       CI/CD changes
```

---

## Renovation (Dependency Updates)

### Renovate Config

```json
// renovate.json
{
  "$schema": "https://docs.renovatebot.com/renovate-schema.json",
  "extends": [
    "config:recommended",
    ":automergeMinor",
    ":automergePatch",
    "group:allNonMajor"
  ],
  "labels": ["dependencies"],
  "schedule": ["before 9am on monday"],
  "packageRules": [
    {
      "matchPackagePatterns": ["eslint", "prettier", "typescript"],
      "groupName": "tooling",
      "automerge": true
    },
    {
      "matchUpdateTypes": ["major"],
      "automerge": false,
      "labels": ["dependencies", "breaking-change"]
    }
  ]
}
```

---

## DX Setup Checklist

```
Tier 1 (Every Project):
[ ] TypeScript strict mode enabled
[ ] ESLint flat config with strict type checking
[ ] Prettier with Tailwind plugin
[ ] .editorconfig for consistent editor settings
[ ] Husky + lint-staged pre-commit hooks
[ ] .gitignore comprehensive and up-to-date

Tier 2 (Team Projects):
[ ] Commitlint enforcing conventional commits
[ ] PR template in .github/
[ ] Path aliases configured (@/ imports)
[ ] Changesets for versioning (if library/package)
[ ] Branch protection rules on main

Tier 3 (Monorepo):
[ ] Turborepo or Nx configured
[ ] Shared configs in packages/config
[ ] Package boundaries respected (no circular deps)
[ ] Remote caching enabled
[ ] Renovate for automated dependency updates
```

---

## Pitfalls

1. **ESLint legacy config** — Always use flat config (`eslint.config.js`), not `.eslintrc`. Legacy config is deprecated in ESLint 9+.
2. **Prettier + ESLint conflicts** — Don't use ESLint for formatting. Let Prettier handle formatting, ESLint handle logic. Use `eslint-config-prettier` if needed.
3. **Over-strict TSConfig** — Enable strict settings incrementally on existing projects. For new projects, start with full strict from day one.
4. **Missing lint-staged** — Running lint on the entire codebase in pre-commit is too slow. Only lint staged files.
5. **Barrel file performance** — `index.ts` re-exports import everything in the barrel. Use direct imports for Next.js/Webpack projects.
6. **Turbo task graph mistakes** — If tasks depend on each other (e.g., lint needs build output for types), declare `dependsOn: ["^build"]` or you get stale type errors.
7. **pnpm phantom dependencies** — pnpm's strict hoisting catches undeclared dependencies. Add missing deps to `package.json` rather than loosening hoisting rules.
8. **Husky not running** — Ensure `.husky/pre-commit` is executable (`chmod +x`) and husky is initialized (`pnpm exec husky`).
