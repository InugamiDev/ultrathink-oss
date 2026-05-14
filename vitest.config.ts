import { defineConfig } from "vitest/config";

// intent: keep the root Vitest pass on root/package-neutral tests only.
// status: done
// next: run package-local Vitest configs for UI packages when changing them.
// blockers: none
// confidence: high
export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["**/*.test.ts"],
    exclude: [
      "**/node_modules/**",
      ".next",
      "dashboard/.next",
      "dashboard/**",
      "paperclip/ui/**",
      "videos/**",
      "mcp/**",
      "code-intel/node_modules/**",
    ],
    testTimeout: 10000,
    fileParallelism: false, // DB-backed tests need sequential file execution
  },
});
