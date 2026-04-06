import { describe, it, expect } from "vitest";
import { execFileSync } from "child_process";
import { resolve, join } from "path";
import { writeFileSync, unlinkSync } from "fs";
import { tmpdir } from "os";

const ROOT = resolve(__dirname, "..");

function runHook(hookName: string, input: object): string {
  // Write input to a temp file and pipe it via bash to avoid shell injection
  const tmpFile = join(tmpdir(), `hook-input-${Date.now()}.json`);
  writeFileSync(tmpFile, JSON.stringify(input));
  try {
    const hookPath = resolve(ROOT, `.claude/hooks/${hookName}`);
    return execFileSync("bash", ["-c", `cat "${tmpFile}" | bash "${hookPath}"`], {
      encoding: "utf-8",
      cwd: ROOT,
      timeout: 10000,
      env: { ...process.env, PATH: process.env.PATH },
      stdio: ["pipe", "pipe", "pipe"],
    }).trim();
  } finally {
    try {
      unlinkSync(tmpFile);
    } catch {
      /* ignore */
    }
  }
}

describe("privacy-hook", () => {
  it("blocks .env files", () => {
    const result = JSON.parse(
      runHook("privacy-hook.sh", {
        tool_name: "Read",
        tool_input: { file_path: "/project/.env" },
      })
    );
    expect(result.hookSpecificOutput.permissionDecision).toBe("deny");
  });

  it("blocks .pem files", () => {
    const result = JSON.parse(
      runHook("privacy-hook.sh", {
        tool_name: "Read",
        tool_input: { file_path: "/certs/server.pem" },
      })
    );
    expect(result.hookSpecificOutput.permissionDecision).toBe("deny");
  });

  it("allows .env.example", () => {
    const result = runHook("privacy-hook.sh", {
      tool_name: "Read",
      tool_input: { file_path: "/project/.env.example" },
    });
    expect(result === "" || result === "{}").toBe(true);
  });

  it("allows normal source files", () => {
    const result = runHook("privacy-hook.sh", {
      tool_name: "Read",
      tool_input: { file_path: "/project/src/index.ts" },
    });
    expect(result === "" || result === "{}").toBe(true);
  });
});

describe("prompt-submit", () => {
  it("returns empty for short prompts", () => {
    const result = JSON.parse(
      runHook("prompt-submit.sh", {
        user_prompt: "hi",
        session_id: "test-session",
      })
    );
    expect(result).toEqual({});
  });

  it("returns skills for relevant prompts", () => {
    const result = JSON.parse(
      runHook("prompt-submit.sh", {
        user_prompt: "build a react component with tailwind styling",
        session_id: "test-session",
      })
    );
    expect(result).toHaveProperty("additionalContext");
    expect(result.additionalContext).toContain("MANDATORY");
  });
});

/** Strip ANSI escape codes so assertions match visible text. */
function stripAnsi(str: string): string {
  // eslint-disable-next-line no-control-regex
  return str.replace(/\x1b\[[0-9;]*m/g, "");
}

describe("statusline", () => {
  it("outputs formatted status", () => {
    const raw = runHook("statusline.sh", {
      model: { display_name: "Claude Opus 4.6" },
      context_window: { used_percentage: 42 },
      cost: { total_cost_usd: 1.5 },
      workspace: { current_dir: "/Users/test/myproject" },
      session_id: "test-session-123",
    });
    const result = stripAnsi(raw);
    expect(result).toContain("ultrathink");
    expect(result).toContain("58%");
    expect(result).toContain("$1.5");
  });
});
