import { defineConfig } from "vitest/config";

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
      "videos/**",
      "mcp/**",
      "code-intel/node_modules/**",
    ],
    testTimeout: 10000,
    fileParallelism: false, // DB-backed tests need sequential file execution
  },
});
