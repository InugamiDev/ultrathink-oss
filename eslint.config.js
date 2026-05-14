import js from "@eslint/js";
import tseslint from "typescript-eslint";

// intent: keep root lint focused on source files instead of generated bundles.
// status: done
// next: split package-specific lint configs if warnings need stricter ownership.
// blockers: none
// confidence: high
const runtimeGlobals = {
  Buffer: "readonly",
  clearInterval: "readonly",
  clearTimeout: "readonly",
  console: "readonly",
  fetch: "readonly",
  process: "readonly",
  setInterval: "readonly",
  setTimeout: "readonly",
};

export default tseslint.config(
  {
    ignores: [
      "**/node_modules/**",
      "**/.next/**",
      "**/dist/**",
      "**/next-env.d.ts",
      "**/target/**",
      "**/coverage/**",
      ".playwright-mcp/**",
      "packages/memory/src/*.js",
      ".claude/skills/**/examples/**",
      "paperclip/server/ui-dist/**",
      "paperclip/server/ui-dist.backup.*/**",
      "paperclip/ui/**",
      "tools/harness/bin/**",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      globals: runtimeGlobals,
    },
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          ignoreRestSiblings: true,
        },
      ],
      "@typescript-eslint/no-explicit-any": "warn",
      "no-console": "off",
    },
  },
  {
    // Dynamic boundaries parse CLI output, JSON payloads, DB rows, and test fixtures.
    // Keep lint useful by enforcing unused-code cleanup while allowing explicit dynamic shapes here.
    files: [
      "apps/discord-bot/src/**/*.ts",
      "apps/ut-bridge/src/**/*.ts",
      "packages/memory/**/*.{ts,tsx}",
      "packages/code-intel/src/indexer.ts",
      "scripts/**/*.{ts,tsx}",
      "tests/**/*.{ts,tsx}",
      "**/*.test.{ts,tsx}",
    ],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
  {
    files: ["**/*.cjs"],
    languageOptions: {
      globals: {
        require: "readonly",
        module: "readonly",
        exports: "readonly",
        __dirname: "readonly",
        __filename: "readonly",
        ...runtimeGlobals,
      },
    },
    rules: {
      "@typescript-eslint/no-require-imports": "off",
    },
  },
  {
    files: ["apps/studio/scripts/**/*.mjs"],
    rules: {
      "@typescript-eslint/no-unused-expressions": "off",
    },
  },
  {
    files: ["tools/smoke/**/*.{cjs,mjs,js}"],
    languageOptions: {
      globals: {
        ...runtimeGlobals,
        Event: "readonly",
        PerformanceObserver: "readonly",
        PopStateEvent: "readonly",
        axe: "readonly",
        document: "readonly",
        history: "readonly",
        window: "readonly",
      },
    },
    rules: {
      "@typescript-eslint/no-unused-vars": "off",
      "no-empty": "off",
    },
  },
  {
    files: ["**/wailsjs/**/*.js", "**/wailsjs/**/*.ts"],
    languageOptions: {
      globals: {
        ...runtimeGlobals,
        window: "readonly",
        document: "readonly",
        fetch: "readonly",
        confirm: "readonly",
        Node: "readonly",
        Terminal: "readonly",
        FitAddon: "readonly",
        WebLinksAddon: "readonly",
        location: "readonly",
        WebSocket: "readonly",
        ResizeObserver: "readonly",
      },
    },
    rules: {
      "@typescript-eslint/no-namespace": "off",
    },
  }
);
