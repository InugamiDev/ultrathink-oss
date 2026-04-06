---
name: prettier
description: Prettier code formatting configuration, editor integration, and CI enforcement patterns.
layer: domain
category: tooling
triggers:
  - "prettier"
  - "prettier config"
  - "code format"
  - "prettier plugin"
inputs:
  - "Prettier configuration and options"
  - "Editor integration setup"
  - "CI/CD formatting enforcement"
  - "Plugin usage and development"
outputs:
  - "Prettier configuration files"
  - "Editor integration configs"
  - "CI enforcement workflows"
  - "Plugin recommendations"
linksTo:
  - eslint
  - biome
  - dev-workflow
  - git-hooks
linkedFrom: []
preferredNextSkills:
  - eslint
  - git-hooks
  - dev-workflow
fallbackSkills:
  - biome
riskLevel: low
memoryReadPolicy: selective
memoryWritePolicy: none
sideEffects: []
---

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
