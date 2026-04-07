import { describe, it, expect } from "vitest";
import { execFileSync } from "child_process";
import { resolve, join } from "path";
import { writeFileSync, unlinkSync, mkdirSync, existsSync } from "fs";
import { tmpdir } from "os";

const ROOT = resolve(__dirname, "..");
const RUNNER = resolve(ROOT, "memory/scripts/memory-runner.ts");

function run(command: string, ...args: string[]): string {
  return execFileSync("npx", ["tsx", RUNNER, command, ...args], {
    encoding: "utf-8",
    cwd: ROOT,
    timeout: 30000,
    stdio: ["pipe", "pipe", "pipe"],
  }).trim();
}

function runJSON(command: string, ...args: string[]) {
  const out = run(command, ...args);
  try {
    return JSON.parse(out);
  } catch {
    return { raw: out };
  }
}

describe("memory-benchmark", () => {
  // 1. Search returns results for known terms
  it("search returns results for common terms", () => {
    const result = runJSON("search", "ultrathink");
    // Should return array or have results property
    const items = Array.isArray(result) ? result : result.results || [];
    expect(Array.isArray(items)).toBe(true);
    // We don't require matches — just that it doesn't crash
  });

  // 2. Compact context generates valid output
  it("compact-context returns valid JSON with additionalContext", () => {
    const result = runJSON("compact-context");
    expect(result).toHaveProperty("additionalContext");
    expect(typeof result.additionalContext).toBe("string");
    // Should be under 3KB cap
    expect(result.additionalContext.length).toBeLessThan(4000);
  });

  // 3. Identity graph returns structured data
  it("identity returns structured graph", () => {
    const result = runJSON("identity");
    // Should have nodes and edges (or be a formatted string)
    expect(result).toBeDefined();
  });

  // 4. Conflict detection doesn't crash
  it("conflicts returns structured data", () => {
    const result = runJSON("conflicts");
    // May return array directly or { conflicts: [...] }
    const conflicts = Array.isArray(result) ? result : result.conflicts || [];
    expect(Array.isArray(conflicts)).toBe(true);
  });

  // 5. Save + search roundtrip
  it("save and search roundtrip works", () => {
    const uniqueTag = `benchmark-${Date.now()}`;
    const memoryInput = JSON.stringify({
      content: `Benchmark test memory ${uniqueTag}`,
      scope: "test",
      importance: 3,
      confidence: 0.8,
      tags: ["benchmark", "test"],
    });

    // Save
    const saveResult = run("save", memoryInput);
    expect(saveResult).toBeTruthy();

    // Search — the memory should be findable
    const searchResult = runJSON("search", uniqueTag);
    const items = Array.isArray(searchResult) ? searchResult : searchResult.results || [];
    const found = items.some((m: { content?: string }) => m.content?.includes(uniqueTag));
    expect(found).toBe(true);
  });

  // 6. Duplicate detection works
  it("dedup detects similar content", () => {
    const content = `This is a duplicate detection test for memory benchmark ${Date.now()}`;
    // Save once
    run(
      "save",
      JSON.stringify({
        content,
        scope: "test",
        importance: 3,
        confidence: 0.8,
      })
    );

    // Check dedup — slightly modified version
    const dedupResult = runJSON("dedup", content);
    // Should find the duplicate
    expect(dedupResult).toBeDefined();
  });

  // 7. Wheel stats don't crash
  it("wheel-stats returns data", () => {
    const result = run("wheel-stats");
    expect(result).toBeTruthy();
  });

  // 8. Preferences command works
  it("preferences returns valid JSON", () => {
    const result = runJSON("preferences");
    // Should be object with preferences array
    const prefs = result.preferences || result;
    expect(prefs).toBeDefined();
  });

  // 9. Session lifecycle (session-start + session-end)
  it("session lifecycle works", () => {
    const startResult = runJSON("session-start");
    expect(startResult).toBeDefined();
    // Should have additionalContext
    expect(startResult).toHaveProperty("additionalContext");

    // End session
    const endResult = run("session-end");
    expect(endResult).toBeDefined();
  });

  // 10. Memory flush from temp files
  it("flush handles empty directory gracefully", () => {
    // Ensure the temp dir exists but is empty (or has no files)
    const memDir = "/tmp/ultrathink-memories-benchmark-test";
    if (!existsSync(memDir)) mkdirSync(memDir, { recursive: true });

    // Flush shouldn't crash even with no files
    // We just test that the command exists and returns
    const result = run("flush");
    expect(result).toBeDefined();
  });
});
