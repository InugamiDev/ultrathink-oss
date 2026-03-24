---
name: biome
description: Biome (formerly Rome) — fast unified linter and formatter for JavaScript, TypeScript, JSON, and CSS. Configuration, rule customization, migration from ESLint/Prettier, CI integration
layer: utility
category: tooling
triggers:
  - "biome"
  - "rome"
  - "biome lint"
  - "biome format"
  - "biome check"
  - "migrate from eslint"
  - "replace prettier"
inputs:
  - Existing linter/formatter config (ESLint, Prettier)
  - Project language (JS, TS, JSON, CSS)
  - Desired rule strictness level
outputs:
  - biome.json configuration file
  - Migration plan from ESLint/Prettier
  - CI integration scripts
  - Custom rule overrides
linksTo: [cicd, code-review, typescript-frontend]
linkedFrom: [code-review, optimize, refactor]
preferredNextSkills: [cicd, code-review]
fallbackSkills: [typescript-frontend]
riskLevel: low
memoryReadPolicy: selective
memoryWritePolicy: none
sideEffects: [modifies project formatting, may change code style across files]
---

# Biome Specialist

## Purpose

Biome is a high-performance unified toolchain for web projects — linting, formatting, and import sorting in a single binary with zero dependencies. It replaces ESLint + Prettier with a single tool that runs 20-100x faster. This skill covers configuration, rule customization, migration from legacy tools, and CI integration.

## Key Concepts

### Why Biome Over ESLint + Prettier

| Aspect | ESLint + Prettier | Biome |
|--------|-------------------|-------|
| Speed | ~5-30s on large projects | ~100-500ms on same projects |
| Config files | `.eslintrc` + `.prettierrc` + plugins | Single `biome.json` |
| Dependencies | 50-200+ transitive deps | Zero (single binary) |
| Conflict risk | ESLint/Prettier rule conflicts | Unified — no conflicts |
| Language support | JS/TS (via plugins for others) | JS, TS, JSX, TSX, JSON, CSS |

### Architecture

```
biome check = biome format + biome lint + biome organize-imports

Single pass over each file:
  1. Parse into AST (custom high-perf parser)
  2. Run lint rules against AST
  3. Apply formatting
  4. Sort imports
  5. Output diagnostics + fixes
```

## Workflow

### Step 1: Installation

```bash
# Install as dev dependency
pnpm add -D @biomejs/biome

# Or install globally
pnpm add -g @biomejs/biome

# Initialize config
pnpm biome init
```

### Step 2: Configure biome.json

```json
{
  "$schema": "https://biomejs.dev/schemas/1.9.0/schema.json",
  "vcs": {
    "enabled": true,
    "clientKind": "git",
    "useIgnoreFile": true
  },
  "organizeImports": {
    "enabled": true
  },
  "formatter": {
    "enabled": true,
    "indentStyle": "tab",
    "indentWidth": 2,
    "lineWidth": 100,
    "lineEnding": "lf"
  },
  "javascript": {
    "formatter": {
      "quoteStyle": "single",
      "trailingCommas": "all",
      "semicolons": "always",
      "arrowParentheses": "always",
      "bracketSpacing": true,
      "jsxQuoteStyle": "double"
    }
  },
  "json": {
    "formatter": {
      "trailingCommas": "none"
    }
  },
  "css": {
    "formatter": {
      "enabled": true,
      "indentStyle": "tab",
      "lineWidth": 100
    },
    "linter": {
      "enabled": true
    }
  },
  "linter": {
    "enabled": true,
    "rules": {
      "recommended": true,
      "complexity": {
        "noExcessiveCognitiveComplexity": {
          "level": "warn",
          "options": { "maxAllowedComplexity": 15 }
        }
      },
      "correctness": {
        "noUnusedVariables": "error",
        "noUnusedImports": "error",
        "useExhaustiveDependencies": "warn"
      },
      "suspicious": {
        "noExplicitAny": "warn",
        "noConsoleLog": "warn"
      },
      "style": {
        "useConst": "error",
        "noNonNullAssertion": "warn",
        "useTemplate": "error"
      },
      "performance": {
        "noAccumulatingSpread": "error",
        "noDelete": "warn"
      },
      "nursery": {
        "useSortedClasses": {
          "level": "warn",
          "options": {}
        }
      }
    }
  },
  "files": {
    "ignore": [
      "node_modules",
      ".next",
      "dist",
      "build",
      "coverage",
      "*.gen.ts",
      "*.d.ts"
    ],
    "maxSize": 1048576
  }
}
```

### Step 3: Add Package Scripts

```json
{
  "scripts": {
    "check": "biome check .",
    "check:fix": "biome check --write .",
    "lint": "biome lint .",
    "lint:fix": "biome lint --write .",
    "format": "biome format .",
    "format:fix": "biome format --write .",
    "ci": "biome ci ."
  }
}
```

### Step 4: Migrate from ESLint + Prettier

```bash
# Automatic migration — reads existing configs and generates biome.json
pnpm biome migrate eslint --write
pnpm biome migrate prettier --write

# Review the generated config
pnpm biome check --diagnostic-level=info .
```

**Manual migration mapping for common ESLint rules:**

| ESLint Rule | Biome Equivalent |
|-------------|-----------------|
| `no-unused-vars` | `correctness/noUnusedVariables` |
| `no-console` | `suspicious/noConsoleLog` |
| `prefer-const` | `style/useConst` |
| `eqeqeq` | `suspicious/noDoubleEquals` |
| `no-debugger` | `suspicious/noDebugger` |
| `@typescript-eslint/no-explicit-any` | `suspicious/noExplicitAny` |
| `react-hooks/exhaustive-deps` | `correctness/useExhaustiveDependencies` |
| `import/order` | `organizeImports` (built-in) |
| `prettier/prettier` | `formatter` (built-in) |

**Post-migration cleanup:**

```bash
# Remove old configs and dependencies
rm .eslintrc* .prettierrc* .eslintignore .prettierignore
pnpm remove eslint prettier eslint-config-prettier eslint-plugin-react \
  eslint-plugin-react-hooks @typescript-eslint/parser \
  @typescript-eslint/eslint-plugin eslint-plugin-import
```

### Step 5: CI Integration

```yaml
# .github/workflows/lint.yml
name: Lint & Format
on: [push, pull_request]

jobs:
  biome:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: biomejs/setup-biome@v2
        with:
          version: latest
      - run: biome ci .
```

```bash
# Pre-commit hook (via lefthook or husky)
# .lefthook/pre-commit/biome.sh
#!/bin/sh
pnpm biome check --staged --no-errors-on-unmatched --files-ignore-unknown=true
```

### Step 6: Editor Integration

```json
// .vscode/settings.json
{
  "editor.defaultFormatter": "biomejs.biome",
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "quickfix.biome": "explicit",
    "source.organizeImports.biome": "explicit"
  },
  "[javascript]": { "editor.defaultFormatter": "biomejs.biome" },
  "[typescript]": { "editor.defaultFormatter": "biomejs.biome" },
  "[typescriptreact]": { "editor.defaultFormatter": "biomejs.biome" },
  "[json]": { "editor.defaultFormatter": "biomejs.biome" },
  "[css]": { "editor.defaultFormatter": "biomejs.biome" }
}
```

## Best Practices

- Use `biome ci` in CI (exits non-zero on any issue, unlike `biome check`)
- Enable `vcs.useIgnoreFile` to respect `.gitignore` automatically
- Use `--staged` flag in pre-commit hooks to only check staged files
- Set `files.maxSize` to skip generated/minified files
- Start with `recommended: true` and override specific rules as needed
- Use `"level": "warn"` during migration, tighten to `"error"` once clean
- Pin Biome version in CI with `biomejs/setup-biome@v2` for reproducibility
- Use `biome explain <rule-name>` to understand any diagnostic

## Common Pitfalls

| Pitfall | Fix |
|---------|-----|
| Running `biome check` in CI instead of `biome ci` | `biome ci` is stricter — fails on warnings too. Always use `ci` in pipelines |
| Forgetting to remove ESLint/Prettier after migration | Delete old configs and uninstall packages to avoid confusion |
| Formatting conflicts with Tailwind class sorting | Enable `nursery/useSortedClasses` in Biome instead of `prettier-plugin-tailwindcss` |
| Ignoring files not working | Set `vcs.enabled: true` and `vcs.useIgnoreFile: true` to respect `.gitignore` |
| Rules not applying to JSX/TSX | Ensure `javascript` section is configured — JSX/TSX inherit from it |
| Large generated files causing slowdowns | Add patterns to `files.ignore` or set `files.maxSize` |
| Team members not using Biome formatter | Add `.vscode/settings.json` to repo and document setup |

## Examples

### Monorepo Setup with Shared Config

```json
// biome.json (root)
{
  "$schema": "https://biomejs.dev/schemas/1.9.0/schema.json",
  "linter": {
    "rules": {
      "recommended": true,
      "correctness": {
        "noUnusedVariables": "error",
        "noUnusedImports": "error"
      }
    }
  },
  "formatter": {
    "indentStyle": "tab",
    "lineWidth": 100
  }
}
```

```json
// apps/web/biome.json (extends root)
{
  "extends": ["../../biome.json"],
  "linter": {
    "rules": {
      "suspicious": {
        "noConsoleLog": "error"
      }
    }
  }
}
```

### Suppressing Rules Inline

```typescript
// Suppress a single rule for the next line
// biome-ignore lint/suspicious/noExplicitAny: legacy API requires any
const response: any = await legacyApi.fetch();

// Suppress formatting for a block
// biome-ignore format: matrix alignment is intentional
const matrix = [
  [1,  0,  0],
  [0,  1,  0],
  [0,  0,  1],
];
```

### Checking Specific File Types Only

```bash
# Lint only TypeScript files
biome lint --include="**/*.ts" --include="**/*.tsx" .

# Format only JSON config files
biome format --write --include="**/*.json" .

# Check everything except test files
biome check --exclude="**/*.test.*" --exclude="**/*.spec.*" .
```
