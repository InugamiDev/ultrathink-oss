---
name: eslint
description: ESLint flat config, custom rules, plugin development, and shared configuration packages.
layer: domain
category: tooling
triggers:
  - "eslint"
  - "eslint config"
  - "eslint rule"
  - "eslint plugin"
  - "lint"
inputs:
  - "ESLint configuration and setup"
  - "Custom rule development"
  - "Plugin and shared config creation"
  - "Migration from legacy to flat config"
outputs:
  - "Flat config ESLint configurations"
  - "Custom ESLint rules with tests"
  - "Shared config packages"
  - "Migration guides from legacy config"
linksTo:
  - biome
  - dev-workflow
  - git-hooks
linkedFrom:
  - prettier
preferredNextSkills:
  - prettier
  - git-hooks
  - dev-workflow
fallbackSkills:
  - biome
riskLevel: low
memoryReadPolicy: selective
memoryWritePolicy: none
sideEffects: []
---

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
