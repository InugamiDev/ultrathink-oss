# Vitest

> Blazing fast unit testing powered by Vite — Jest-compatible API, native ESM, TypeScript.

## When to Use
- Unit and integration testing for Vite/React/Vue/Svelte projects
- Replacing Jest with faster, ESM-native alternative
- Component testing with happy-dom or jsdom
- In-source testing (tests alongside implementation)

## Core Patterns

### Configuration
```typescript
// vitest.config.ts
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,           // No need for import { test, expect }
    environment: "happy-dom", // or "jsdom" for browser APIs
    setupFiles: ["./test/setup.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
    },
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
  },
});
```

### Testing
```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";

describe("UserService", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("creates user", async () => {
    const mockDb = vi.fn().mockResolvedValue({ id: "1", name: "Inu" });
    const user = await createUser(mockDb, { name: "Inu" });
    expect(user).toMatchObject({ id: "1", name: "Inu" });
    expect(mockDb).toHaveBeenCalledOnce();
  });

  it("throws on invalid input", () => {
    expect(() => validateName("")).toThrow("Name required");
  });
});
```

### Key Features
- **vi.fn()**: Mock functions (same API as jest.fn())
- **vi.mock()**: Module mocking with auto-mock support
- **vi.spyOn()**: Spy on object methods
- **Snapshots**: `expect(result).toMatchSnapshot()`
- **In-source**: `if (import.meta.vitest)` blocks stripped from production
- **Watch mode**: `vitest` (default), `vitest run` for CI
- **Workspace**: `vitest.workspace.ts` for monorepo testing
- **Type testing**: `expectTypeOf<string>().toMatchTypeOf<string>()`
- **Browser mode**: `vitest --browser` for real browser testing
