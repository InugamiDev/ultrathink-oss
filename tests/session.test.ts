import { describe, it, expect, afterEach } from "vitest";
import { execFileSync } from "child_process";
import { existsSync, unlinkSync } from "fs";
import { resolve } from "path";

const ROOT = resolve(__dirname, "..");
const RUNNER = resolve(ROOT, "memory/scripts/memory-runner.ts");

/**
 * Session tests are skipped by default because they require a live Neon Postgres database.
 * To run: set DATABASE_URL in .env and use `vitest run --reporter=verbose`.
 */
const hasDatabase = (() => {
  try {
    const { readFileSync } = require("fs");
    const envPath = resolve(ROOT, ".env");
    if (!existsSync(envPath)) return false;
    const env = readFileSync(envPath, "utf-8");
    return env.includes("DATABASE_URL=") && !env.includes("DATABASE_URL=\n");
  } catch {
    return false;
  }
})();

const describeDb = hasDatabase ? describe : describe.skip;

function runRunner(command: string, env: Record<string, string> = {}): string {
  return execFileSync("npx", ["tsx", RUNNER, command], {
    encoding: "utf-8",
    cwd: ROOT,
    timeout: 20000,
    env: { ...process.env, ...env },
    stdio: ["pipe", "pipe", "pipe"],
  }).trim();
}

describeDb("session isolation", { timeout: 30000 }, () => {
  const sessionFiles: string[] = [];

  afterEach(() => {
    for (const f of sessionFiles) {
      try {
        unlinkSync(f);
      } catch {}
    }
    sessionFiles.length = 0;
  });

  it("creates session-scoped file with CC_SESSION_ID", () => {
    const sid = "vitest-" + Date.now();
    const filePath = `/tmp/ultrathink-session-${sid.slice(0, 12)}`;
    sessionFiles.push(filePath);

    runRunner("session-start", { CC_SESSION_ID: sid });
    expect(existsSync(filePath)).toBe(true);

    runRunner("session-end", { CC_SESSION_ID: sid });
    expect(existsSync(filePath)).toBe(false);
  });

  it("falls back to legacy file without CC_SESSION_ID", () => {
    const filePath = "/tmp/ultrathink-session-id";
    sessionFiles.push(filePath);

    runRunner("session-start", { CC_SESSION_ID: "" });
    expect(existsSync(filePath)).toBe(true);

    runRunner("session-end", { CC_SESSION_ID: "" });
    expect(existsSync(filePath)).toBe(false);
  });
});
