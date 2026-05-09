import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
      "@typescript-eslint/no-explicit-any": "warn",
      "no-console": "off",
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
        process: "readonly",
        console: "readonly",
      },
    },
    rules: {
      "@typescript-eslint/no-require-imports": "off",
    },
  },
  {
    files: ["**/wailsjs/**/*.js", "**/wailsjs/**/*.ts"],
    languageOptions: {
      globals: {
        window: "readonly",
        document: "readonly",
        fetch: "readonly",
        setTimeout: "readonly",
        setInterval: "readonly",
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
  },
  { ignores: ["node_modules/", ".next/", "**/dist/", "dashboard/.next/"] }
);
