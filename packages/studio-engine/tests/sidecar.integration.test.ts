// intent: integration test — drive the actual sidecar.js binary as a subprocess
// status: done — verifies the JSON-RPC protocol end-to-end through anthropic-direct
//          which doesn't need claude on PATH and surfaces a clean 401 on bad key
// next: add a real-key path gated by env so CI can run an end-to-end stream
//
// Why: the unit tests use mocked fetch — they verify the parser logic but NOT the
// process boundary, the readline buffering, the JSON-RPC framing, or the locate-
// sidecar resolution. This test runs the real artifact and asserts behavior.

import { spawn } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SIDECAR = resolve(__dirname, "..", "dist", "sidecar.js");

interface SidecarMsg {
  type: "ready" | "event" | "turn-done" | "error" | "ack";
  sessionId?: string;
  event?: { kind: string; [k: string]: unknown };
  exitCode?: number | null;
  message?: string;
}

async function runSidecarTurn(input: object, timeoutMs = 15_000): Promise<SidecarMsg[]> {
  return new Promise((resolveP, rejectP) => {
    const child = spawn("node", [SIDECAR], { stdio: ["pipe", "pipe", "pipe"] });
    const messages: SidecarMsg[] = [];
    let stdoutBuf = "";
    let settled = false;
    const settle = (msgs: SidecarMsg[]) => {
      if (settled) return;
      settled = true;
      try {
        child.kill("SIGTERM");
      } catch {
        /* already dead */
      }
      resolveP(msgs);
    };

    const timer = setTimeout(() => settle(messages), timeoutMs);

    child.stdout.setEncoding("utf8");
    child.stdout.on("data", (chunk: string) => {
      stdoutBuf += chunk;
      let nl: number;
      while ((nl = stdoutBuf.indexOf("\n")) !== -1) {
        const line = stdoutBuf.slice(0, nl).trim();
        stdoutBuf = stdoutBuf.slice(nl + 1);
        if (!line) continue;
        try {
          const msg = JSON.parse(line) as SidecarMsg;
          messages.push(msg);
          if (msg.type === "turn-done") {
            clearTimeout(timer);
            settle(messages);
          }
        } catch {
          /* skip malformed */
        }
      }
    });

    child.on("error", (err) => {
      clearTimeout(timer);
      rejectP(err);
    });

    child.stdin.write(JSON.stringify(input) + "\n");
  });
}

describe("sidecar.js integration", () => {
  it("loads sidecar, accepts start with anthropic-direct, surfaces clean 401 on bad key", async () => {
    const messages = await runSidecarTurn(
      {
        op: "start",
        params: {
          prompt: "ping",
          adapter: "anthropic-direct",
          apiKey: "sk-ant-fake-test-key-do-not-use",
          model: "claude-haiku-4-5",
          projectDir: "/tmp/studio-test",
        },
      },
      20_000
    );

    // Lifecycle markers we depend on
    const types = messages.map((m) => m.type);
    expect(types).toContain("ready");
    expect(types).toContain("turn-done");

    const events = messages.filter((m) => m.type === "event").map((m) => m.event!);
    const kinds = events.map((e) => e.kind);
    expect(kinds).toContain("spawn-started");
    expect(kinds).toContain("error");
    expect(kinds).toContain("spawn-exited");

    // The error should be a recognisable 401 from Anthropic
    const errorEvent = events.find((e) => e.kind === "error") as
      | { kind: "error"; message: string; code?: string }
      | undefined;
    expect(errorEvent).toBeDefined();
    expect(errorEvent!.code).toBe("http_401");
    expect(errorEvent!.message).toMatch(/authentication_error|invalid x-api-key/);
  }, 30_000);

  it("rejects start without prompt", async () => {
    const messages = await runSidecarTurn({ op: "start", params: {} }, 5_000);
    const errs = messages.filter((m) => m.type === "error");
    expect(errs.length).toBeGreaterThan(0);
    expect(errs[0].message).toMatch(/prompt/i);
  }, 10_000);

  it("rejects unknown op", async () => {
    const messages = await runSidecarTurn({ op: "garbage" }, 5_000);
    const errs = messages.filter((m) => m.type === "error");
    expect(errs.length).toBeGreaterThan(0);
    expect(errs[0].message).toMatch(/unknown op/i);
  }, 10_000);

  // Live-key smoke. Skipped unless ANTHROPIC_API_KEY is set in env.
  // Run via `ANTHROPIC_API_KEY=sk-ant-… pnpm --filter @inuverse/studio-engine test`.
  const liveKey = process.env.ANTHROPIC_API_KEY;
  it.skipIf(!liveKey)(
    "real Anthropic API streams text-delta + completion (live key required)",
    async () => {
      const messages = await runSidecarTurn(
        {
          op: "start",
          params: {
            prompt: "Reply with exactly the single word: PONG",
            adapter: "anthropic-direct",
            apiKey: liveKey,
            model: "claude-haiku-4-5",
            projectDir: "/tmp/studio-live-test",
          },
        },
        25_000
      );
      const events = messages.filter((m) => m.type === "event").map((m) => m.event!);
      const kinds = events.map((e) => e.kind);
      expect(kinds).toContain("assistant-text-delta");
      expect(kinds).toContain("usage");
      expect(kinds).toContain("completion");
      const usage = events.find((e) => e.kind === "usage") as
        | { kind: "usage"; inputTokens: number; outputTokens: number }
        | undefined;
      expect(usage?.inputTokens).toBeGreaterThan(0);
      expect(usage?.outputTokens).toBeGreaterThan(0);
      const text = events
        .filter((e) => e.kind === "assistant-text-delta")
        .map((e) => (e as { kind: "assistant-text-delta"; text: string }).text)
        .join("");
      expect(text.toUpperCase()).toContain("PONG");
    },
    30_000
  );
});
