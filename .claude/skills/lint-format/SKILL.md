---
name: lint-format
description: "Unified linting + formatting toolkit — ESLint (flat config, custom rules, plugins, shared configs), Prettier (formatting, editor integration, CI enforcement), Biome (Rust-based unified linter/formatter), Cursor AI rules (.cursorrules, context management). Single entry point for code style infra."
layer: domain
category: tooling
triggers: [".cursorrules", "ai coding assistant", "biome", "biome check", "biome format", "biome lint", "code format", "cursor config", "cursor ide", "cursor rules", "eslint", "eslint config", "eslint plugin", "eslint rule", "lint", "prettier", "prettier config", "prettier plugin"]
---

# lint-format

Unified linting + formatting toolkit — ESLint (flat config, custom rules, plugins, shared configs), Prettier (formatting, editor integration, CI enforcement), Biome (Rust-based unified linter/formatter), Cursor AI rules (.cursorrules, context management). Single entry point for code style infra.


## Absorbs

- `eslint`
- `prettier`
- `biome`
- `cursor-rules`


---

## From `eslint`

> ESLint flat config, custom rules, plugin development, and shared configuration packages.

# ESLint Flat Config & Custom Rules

## Purpose

Provide expert guidance on ESLint 9+ flat configuration, custom rule development, plugin authoring, shared config packages, and integration with CI/CD pipelines. Focuses on the modern flat config format (eslint.config.js) which replaces `.eslintrc`.

## Flat Config Setup

**Basic `eslint.config.js` for TypeScript + React:**

```javascript
// eslint.config.js
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactPlugin from 'eslint-plugin-react';
import reactHooksPlugin from 'eslint-plugin-react-hooks';
import importPlugin from 'eslint-plugin-import-x';

export default tseslint.config(
  // Global ignores (replaces .eslintignore)
  { ignores: ['dist/', 'node_modules/', '.next/', 'coverage/'] },

  // Base JS recommended rules
  js.configs.recommended,

  // TypeScript strict rules
  ...tseslint.configs.strictTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,

  // TypeScript parser options
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },

  // React
  {
    files: ['**/*.tsx'],
    plugins: {
      react: reactPlugin,
      'react-hooks': reactHooksPlugin,
    },
    rules: {
      ...reactPlugin.configs.recommended.rules,
      ...reactHooksPlugin.configs.recommended.rules,
      'react/react-in-jsx-scope': 'off', // not needed with React 17+
      'react/prop-types': 'off', // using TypeScript
    },
    settings: {
      react: { version: 'detect' },
    },
  },

  // Import ordering
  {
    plugins: { 'import-x': importPlugin },
    rules: {
      'import-x/order': [
        'error',
        {
          groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index'],
          'newlines-between': 'always',
          alphabetize: { order: 'asc', caseInsensitive: true },
        },
      ],
      'import-x/no-duplicates': 'error',
    },
  },

  // Project-specific overrides
  {
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
      ],
    },
  },

  // Test file relaxations
  {
    files: ['**/*.test.ts', '**/*.test.tsx', '**/*.spec.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
    },
  },
);
```

## Custom Rule Development

**Rule structure:**

```typescript
// rules/no-hardcoded-colors.ts
import { ESLintUtils, TSESTree } from '@typescript-eslint/utils';

const createRule = ESLintUtils.RuleCreator(
  (name) => `https://example.com/rules/${name}`,
);

export const noHardcodedColors = createRule({
  name: 'no-hardcoded-colors',
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Disallow hardcoded color values in JSX className',
    },
    fixable: 'code',
    schema: [
      {
        type: 'object',
        properties: {
          allowedPatterns: { type: 'array', items: { type: 'string' } },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      noHardcodedColor:
        'Avoid hardcoded color "{{color}}". Use a design token or CSS variable instead.',
    },
  },
  defaultOptions: [{ allowedPatterns: [] as string[] }],

  create(context, [options]) {
    const colorRegex = /#[0-9a-fA-F]{3,8}\b|rgb\(|hsl\(/;

    return {
      JSXAttribute(node: TSESTree.JSXAttribute) {
        if (
          node.name.name !== 'style' ||
          node.value?.type !== 'JSXExpressionContainer'
        )
          return;

        const raw = context.sourceCode.getText(node.value);
        const match = raw.match(colorRegex);
        if (match) {
          context.report({
            node,
            messageId: 'noHardcodedColor',
            data: { color: match[0] },
          });
        }
      },
    };
  },
});
```

**Testing custom rules:**

```typescript
// rules/__tests__/no-hardcoded-colors.test.ts
import { RuleTester } from '@typescript-eslint/rule-tester';
import { noHardcodedColors } from '../no-hardcoded-colors';

const ruleTester = new RuleTester();

ruleTester.run('no-hardcoded-colors', noHardcodedColors, {
  valid: [
    { code: '<div style={{ color: "var(--text-primary)" }} />' },
    { code: '<div className="text-blue-500" />' },
  ],
  invalid: [
    {
      code: '<div style={{ color: "#ff0000" }} />',
      errors: [{ messageId: 'noHardcodedColor' }],
    },
    {
      code: '<div style={{ background: "rgb(255, 0, 0)" }} />',
      errors: [{ messageId: 'noHardcodedColor' }],
    },
  ],
});
```

## Plugin Development

**Creating a shareable plugin:**

```typescript
// eslint-plugin-my-team/src/index.ts
import { noHardcodedColors } from './rules/no-hardcoded-colors';
import { requireErrorBoundary } from './rules/require-error-boundary';

const plugin = {
  meta: {
    name: 'eslint-plugin-my-team',
    version: '1.0.0',
  },
  rules: {
    'no-hardcoded-colors': noHardcodedColors,
    'require-error-boundary': requireErrorBoundary,
  },
  configs: {},
};

// Self-referencing config
Object.assign(plugin.configs, {
  recommended: {
    plugins: { 'my-team': plugin },
    rules: {
      'my-team/no-hardcoded-colors': 'warn',
      'my-team/require-error-boundary': 'error',
    },
  },
});

export default plugin;
```

## Shared Config Package

```typescript
// @my-org/eslint-config/index.js
import js from '@eslint/js';
import tseslint from 'typescript-eslint';

/** @param {{ tsconfigPath?: string }} options */
export function createConfig(options = {}) {
  return tseslint.config(
    { ignores: ['dist/', 'node_modules/', 'coverage/'] },
    js.configs.recommended,
    ...tseslint.configs.strict,
    {
      languageOptions: {
        parserOptions: {
          projectService: true,
          ...(options.tsconfigPath && { project: options.tsconfigPath }),
        },
      },
    },
    {
      rules: {
        '@typescript-eslint/no-unused-vars': [
          'error',
          { argsIgnorePattern: '^_' },
        ],
        '@typescript-eslint/consistent-type-imports': 'error',
      },
    },
  );
}
```

**Consumer usage:**

```javascript
// eslint.config.js (in a consuming project)
import { createConfig } from '@my-org/eslint-config';

export default [
  ...createConfig(),
  // Project-specific overrides
  { rules: { '@typescript-eslint/no-explicit-any': 'warn' } },
];
```

## Migration from Legacy Config

**Key differences:**

| Legacy (`.eslintrc`) | Flat (`eslint.config.js`) |
|---|---|
| `extends: [...]` | Spread config arrays: `...tseslint.configs.strict` |
| `plugins: ['react']` | `plugins: { react: reactPlugin }` |
| `env: { browser: true }` | `languageOptions: { globals: globals.browser }` |
| `.eslintignore` | `{ ignores: ['dist/'] }` at top level |
| `overrides: [...]` | Multiple config objects with `files` |
| `parser: '@typescript-eslint/parser'` | Included in `tseslint.configs.*` |

## CI Integration

```yaml
# .github/workflows/lint.yml
- name: Lint
  run: npx eslint . --max-warnings 0

# For large repos, use caching
- name: Lint with cache
  run: npx eslint . --cache --cache-location .eslintcache --max-warnings 0
```

## Best Practices

1. **Use flat config exclusively** — Legacy `.eslintrc` is deprecated in ESLint 9+.
2. **Use `typescript-eslint` strict preset** — Catches more bugs than the base preset.
3. **Set `--max-warnings 0` in CI** — Prevents warning accumulation.
4. **Use `--cache` in CI** — Dramatically faster on incremental runs.
5. **Separate test file config** — Relax strict rules (any, non-null assertion) for tests.
6. **Use `projectService` over `project`** — Faster TypeScript integration in ESLint 8+.
7. **Import ordering rules** — Use `eslint-plugin-import-x` for consistent import structure.
8. **Consistent type imports** — Enforce `import type` for type-only imports.
9. **Combine with Prettier** — ESLint for logic/correctness, Prettier for formatting.
10. **Pin ESLint major version** — Config format can change between majors.

## Common Pitfalls

| Pitfall | Problem | Fix |
|---------|---------|-----|
| Mixing legacy and flat config | ESLint ignores one format | Remove `.eslintrc` when using `eslint.config.js` |
| Missing `ignores` at top level | Node_modules/dist get linted | Add `{ ignores: [...] }` as first config object |
| Slow TypeScript linting | `project` option parses entire TS project | Use `projectService: true` for faster type-aware rules |
| Plugin name collision | Two plugins register same namespace | Use unique plugin keys in flat config `plugins` object |
| `extends` in flat config | Not supported — flat config is compositional | Spread config arrays instead |
| No `type: "module"` | `eslint.config.js` fails with import syntax | Add `"type": "module"` to `package.json` or use `.mjs` extension |


---

## From `prettier`

> Prettier code formatting configuration, editor integration, and CI enforcement patterns.

# Prettier Configuration & Enforcement

## Purpose

Provide expert guidance on Prettier configuration, editor integration, ESLint coordination, CI enforcement, and plugin usage. Covers Prettier 3.x with ESM support and the modern flat config approach.

## Configuration

**`.prettierrc` (JSON — most common):**

```json
{
  "semi": true,
  "singleQuote": true,
  "trailingComma": "all",
  "printWidth": 100,
  "tabWidth": 2,
  "useTabs": false,
  "bracketSpacing": true,
  "arrowParens": "always",
  "endOfLine": "lf",
  "singleAttributePerLine": false
}
```

**`prettier.config.js` (when you need logic or plugins):**

```javascript
// prettier.config.js
/** @type {import("prettier").Config} */
const config = {
  semi: true,
  singleQuote: true,
  trailingComma: 'all',
  printWidth: 100,
  tabWidth: 2,
  plugins: [
    'prettier-plugin-tailwindcss',
    'prettier-plugin-organize-imports',
  ],
  // Tailwind plugin options
  tailwindFunctions: ['clsx', 'cn', 'cva'],
};

export default config;
```

## Ignore Patterns

**`.prettierignore`:**

```
# Build output
dist/
build/
.next/
out/

# Dependencies
node_modules/

# Generated
coverage/
*.min.js
*.min.css
pnpm-lock.yaml
package-lock.json

# Auto-generated
src/generated/
prisma/migrations/
```

## ESLint + Prettier Coordination

**The modern approach — ESLint for logic, Prettier for formatting:**

```javascript
// eslint.config.js
import eslintConfigPrettier from 'eslint-config-prettier';

export default [
  // ... your ESLint configs
  eslintConfigPrettier, // MUST be last — disables conflicting ESLint formatting rules
];
```

Do NOT use `eslint-plugin-prettier` (runs Prettier inside ESLint). Instead, run them as separate tools:

```json
{
  "scripts": {
    "lint": "eslint . --max-warnings 0",
    "format": "prettier --write .",
    "format:check": "prettier --check ."
  }
}
```

## Editor Integration

**VS Code settings (`.vscode/settings.json`):**

```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "[typescript]": { "editor.defaultFormatter": "esbenp.prettier-vscode" },
  "[typescriptreact]": { "editor.defaultFormatter": "esbenp.prettier-vscode" },
  "[javascript]": { "editor.defaultFormatter": "esbenp.prettier-vscode" },
  "[json]": { "editor.defaultFormatter": "esbenp.prettier-vscode" },
  "[css]": { "editor.defaultFormatter": "esbenp.prettier-vscode" },
  "[markdown]": { "editor.defaultFormatter": "esbenp.prettier-vscode" }
}
```

**Recommended VS Code extensions (`.vscode/extensions.json`):**

```json
{
  "recommendations": [
    "esbenp.prettier-vscode",
    "dbaeumer.vscode-eslint"
  ]
}
```

## Git Hooks Enforcement

**With lint-staged and Husky:**

```json
// package.json
{
  "lint-staged": {
    "*.{ts,tsx,js,jsx}": ["eslint --fix --max-warnings 0", "prettier --write"],
    "*.{json,md,yml,yaml,css}": ["prettier --write"]
  }
}
```

```bash
# Setup
npx husky init
echo "npx lint-staged" > .husky/pre-commit
```

## CI Enforcement

**GitHub Actions workflow:**

```yaml
# .github/workflows/format.yml
name: Format Check
on: [pull_request]

jobs:
  prettier:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm prettier --check .
```

## Plugins

**Tailwind CSS class sorting:**

```bash
pnpm add -D prettier-plugin-tailwindcss
```

```javascript
// prettier.config.js
export default {
  plugins: ['prettier-plugin-tailwindcss'],
  tailwindFunctions: ['clsx', 'cn', 'cva', 'twMerge'],
  tailwindAttributes: ['className', 'class', 'tw'],
};
```

**Import sorting:**

```bash
pnpm add -D prettier-plugin-organize-imports
# OR
pnpm add -D @ianvs/prettier-plugin-sort-imports
```

```javascript
// prettier.config.js (with @ianvs/prettier-plugin-sort-imports)
export default {
  plugins: ['@ianvs/prettier-plugin-sort-imports'],
  importOrder: [
    '<BUILTIN_MODULES>',
    '',
    '<THIRD_PARTY_MODULES>',
    '',
    '^@/(.*)$',
    '',
    '^[./]',
  ],
  importOrderTypeScriptVersion: '5.0.0',
};
```

## Per-File Overrides

```json
{
  "semi": true,
  "singleQuote": true,
  "overrides": [
    {
      "files": "*.md",
      "options": { "proseWrap": "always", "printWidth": 80 }
    },
    {
      "files": "*.json",
      "options": { "tabWidth": 2, "trailingComma": "none" }
    },
    {
      "files": "*.yml",
      "options": { "singleQuote": false }
    }
  ]
}
```

## Programmatic API

```typescript
import * as prettier from 'prettier';

async function formatCode(code: string, filepath: string): Promise<string> {
  const options = await prettier.resolveConfig(filepath);
  return prettier.format(code, {
    ...options,
    filepath, // infers parser from file extension
  });
}

// Check if file is formatted
async function checkFormatted(code: string, filepath: string): Promise<boolean> {
  const options = await prettier.resolveConfig(filepath);
  return prettier.check(code, { ...options, filepath });
}
```

## Best Practices

1. **Use a config file, not CLI flags** — Ensures consistency across editors, CI, and CLI.
2. **Run Prettier last in lint-staged** — Format after ESLint fixes.
3. **Use `eslint-config-prettier`** — Disable conflicting ESLint rules (always last in config).
4. **Do NOT use `eslint-plugin-prettier`** — Slower and produces confusing ESLint errors for formatting.
5. **Set `endOfLine: "lf"`** — Prevent cross-platform line ending issues.
6. **Add `.prettierignore`** — Skip generated files, lock files, and build output.
7. **Enforce in CI with `--check`** — Fail the build if code is unformatted.
8. **Use `format-on-save` in editors** — Catch formatting issues immediately.
9. **Pin Prettier version** — Formatting changes between versions cause noisy diffs.
10. **Use the Tailwind plugin** — Consistent class ordering across the team.

## Common Pitfalls

| Pitfall | Problem | Fix |
|---------|---------|-----|
| ESLint and Prettier fight | Conflicting formatting rules | Use `eslint-config-prettier` as last ESLint config |
| Format-on-save not working | Wrong default formatter | Set `editor.defaultFormatter` per language in VS Code |
| Noisy diffs after upgrade | Prettier changes formatting between versions | Pin exact version, format entire codebase in one commit |
| Ignoring generated files | Prettier reformats generated code | Add to `.prettierignore` |
| Plugin order matters | Tailwind plugin must run after import sorting | Order plugins correctly in config array |
| Missing `--check` in CI | Unformatted code merges | Add `prettier --check .` to CI pipeline |


---

## From `biome`

> Biome (formerly Rome) — fast unified linter and formatter for JavaScript, TypeScript, JSON, and CSS. Configuration, rule customization, migration from ESLint/Prettier, CI integration

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


---

## From `cursor-rules`

> Cursor IDE .cursorrules configuration, AI coding assistant customization, project-specific rules, and context management

# Cursor IDE Rules Configuration

## Purpose

Guide the creation and optimization of `.cursorrules` files (and `.cursor/rules/*.mdc` for Cursor v2) that configure Cursor IDE's AI coding assistant with project-specific conventions, patterns, and constraints. Ensures the AI generates code consistent with your team's standards.

## Key Patterns

### Basic .cursorrules Structure

```text
# Project: MyApp
# Stack: Next.js 15, TypeScript, Tailwind v4, Drizzle ORM, Neon Postgres

## Code Style
- Use TypeScript strict mode. No `any` types.
- Prefer `const` over `let`. Never use `var`.
- Use named exports, not default exports.
- Use arrow functions for callbacks, function declarations for top-level.
- File naming: kebab-case for files, PascalCase for components.

## React/Next.js Conventions
- Use Server Components by default. Add "use client" only when needed.
- Use the App Router. No Pages Router patterns.
- Colocate components with their routes in the app/ directory.
- Use Suspense boundaries around async components.
- Forms: use Server Actions with useActionState for mutations.

## Styling
- Use Tailwind CSS v4 with CSS-first config. No tailwind.config.js.
- Follow the golden ratio spacing scale: 0.625rem, 0.8125rem, 1rem, 1.625rem, 2.625rem, 4.25rem.
- Minimum button padding: px-6 py-4. Minimum text: text-base (1rem).
- All interactive elements need hover/focus states and transitions.

## Database
- Use Drizzle ORM with Neon Postgres.
- Define schemas in src/db/schema/.
- Use prepared statements for repeated queries.
- Always use transactions for multi-step mutations.

## Error Handling
- Never silently catch errors. Log or re-throw.
- Use Result types for expected failures: { success: true, data } | { success: false, error }.
- Validate all external input with Zod at API boundaries.

## Do NOT
- Add analytics tracking to components.
- Use default exports.
- Use CSS-in-JS or styled-components.
- Use `useEffect` for data fetching (use Server Components or TanStack Query).
- Commit .env files.
```

### Cursor v2 Rule Files (.cursor/rules/*.mdc)

**Modular rules with glob-based activation:**

```markdown
<!-- .cursor/rules/react-components.mdc -->
---
description: React component conventions
globs: ["src/components/**/*.tsx", "src/app/**/*.tsx"]
alwaysApply: false
---

# React Component Rules

- Use functional components only.
- Props interface named `{ComponentName}Props`.
- Destructure props in the function signature.
- Export as named export.

Template:
\`\`\`tsx
interface {Name}Props {
  // props
}

export function {Name}({ ...props }: {Name}Props) {
  return (
    <div>
      {/* implementation */}
    </div>
  );
}
\`\`\`
```

```markdown
<!-- .cursor/rules/api-routes.mdc -->
---
description: API route conventions for Next.js App Router
globs: ["src/app/api/**/*.ts"]
alwaysApply: false
---

# API Route Rules

- Export named HTTP method handlers: GET, POST, PUT, DELETE.
- Validate request body with Zod.
- Return NextResponse.json() with appropriate status codes.
- Wrap handlers in try/catch with structured error responses.
- Use { status: number, data?: T, error?: string } response shape.

\`\`\`typescript
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const CreateSchema = z.object({
  name: z.string().min(1).max(100),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = CreateSchema.parse(body);
    const result = await createItem(data);
    return NextResponse.json({ status: 200, data: result });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ status: 400, error: 'Validation failed' }, { status: 400 });
    }
    return NextResponse.json({ status: 500, error: 'Internal error' }, { status: 500 });
  }
}
\`\`\`
```

```markdown
<!-- .cursor/rules/database.mdc -->
---
description: Database schema and query conventions
globs: ["src/db/**/*.ts"]
alwaysApply: false
---

# Database Rules

- Use Drizzle ORM. Import from 'drizzle-orm'.
- Schema files in src/db/schema/, one per domain.
- Use pgTable for table definitions.
- Always include createdAt and updatedAt timestamps.
- Use uuid for primary keys.
- Name foreign keys explicitly: `{table}_{column}_fk`.
```

### Context-Aware Rules

**Include project structure context:**

```text
## Project Structure
src/
  app/           # Next.js App Router pages and layouts
  components/    # Shared UI components
    ui/          # Primitive components (Button, Input, Card)
    features/    # Feature-specific composed components
  db/
    schema/      # Drizzle table definitions
    queries/     # Reusable query functions
  lib/           # Utility functions and shared logic
  hooks/         # Custom React hooks

## Key Files
- src/db/schema/index.ts — re-exports all schemas
- src/lib/utils.ts — cn() helper, formatters
- src/components/ui/index.ts — barrel export for UI primitives

## When generating new files:
- Components go in src/components/features/{feature-name}/
- API routes go in src/app/api/{resource}/route.ts
- DB queries go in src/db/queries/{domain}.ts
```

### Stack-Specific Templates

**Next.js + Supabase template:**

```text
# Stack: Next.js 15 + Supabase + Tailwind v4

## Supabase Client
- Server: use createServerClient from @supabase/ssr in server components/actions
- Client: use createBrowserClient from @supabase/ssr in client components
- Never expose service_role key in client code

## Auth
- Use Supabase Auth with PKCE flow
- Protect routes with middleware.ts
- Access user via supabase.auth.getUser() in server components

## Database
- Use Supabase client for queries, not raw SQL
- Enable RLS on all tables
- Type-generate with: npx supabase gen types typescript
```

## Best Practices

1. **Be specific, not generic** -- Rules like "write clean code" are useless. Specify exact patterns, naming conventions, and file locations.
2. **Include counter-examples** -- "Do NOT" sections prevent the most common AI mistakes for your stack.
3. **Reference actual project paths** -- Tell the AI where files live so it generates correct imports and placements.
4. **Use glob-scoped rules (v2)** -- Apply different rules to different file types. API routes need different guidance than UI components.
5. **Keep rules under 2000 tokens** -- Long rules get diluted. Prioritize the most impactful conventions.
6. **Update rules as the project evolves** -- Treat `.cursorrules` as living documentation. Review monthly.
7. **Include code templates** -- Show the exact pattern you want, not just a description of it.

## Common Pitfalls

| Pitfall | Problem | Fix |
|---------|---------|-----|
| Rules too generic | AI ignores vague instructions like "use best practices" | Specify exact patterns with code examples |
| Contradictory rules | AI picks one randomly or produces hybrid | Audit rules for conflicts; use scoped rules to avoid overlap |
| No negative examples | AI uses anti-patterns not explicitly forbidden | Add a "Do NOT" section for common mistakes |
| Rules too long | Key instructions buried in noise | Prioritize top 10 rules; split into scoped `.mdc` files |
| Missing import paths | AI guesses wrong import locations | Specify exact import paths and barrel exports |
| No project structure | AI creates files in wrong directories | Include directory tree with descriptions |
| Stale rules | Rules reference removed patterns or old APIs | Review and update `.cursorrules` when dependencies change |
| Rules only in `.cursorrules` | Cursor v2 supports richer scoped rules | Migrate to `.cursor/rules/*.mdc` for glob-based activation |

