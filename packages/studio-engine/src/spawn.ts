// intent: core engine — spawn Claude Code, wire skills+memory, stream typed events
// status: done (CLI-tested path; Tauri consumer pending)
// next: add per-event observability hook for telemetry
// confidence: high
//
// Public entry: createSpawn(opts) → SpawnHandle. The handle's events iterable
// yields typed EngineEvents derived from Claude Code's stream-json stdout. Always
// resolves done with the final exit code/signal even on error paths.

import { spawn as childSpawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { unlink } from "node:fs/promises";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { randomUUID } from "node:crypto";

import { JsonlStreamParser, normaliseClaudeEvent, normaliseCodexEvent } from "./parse.js";
import { routeSkills, findUltrathinkRoot } from "./skill-router.js";
import { buildMcpConfig } from "./mcp-config.js";
import { createAnthropicDirectSpawn } from "./providers/anthropic-direct.js";
import { createOllamaSpawn } from "./providers/ollama.js";
import { createOpenAiCompatSpawn } from "./providers/openai-compat.js";
import type { EngineEvent, SpawnHandle, SpawnOptions } from "./types.js";

const CLAUDE_BIN = process.env.CLAUDE_BIN || "claude";
const CODEX_BIN = process.env.CODEX_BIN || "codex";

export interface EngineConfig {
  /** Absolute path to UltraThink root (skills, hooks, MCP servers). */
  ultrathinkRoot?: string;
  /** Postgres connection string for memory MCP. Falls back to DATABASE_URL env. */
  databaseUrl?: string;
}

export function createSpawn(opts: SpawnOptions, cfg: EngineConfig = {}): SpawnHandle {
  // Direct Anthropic API path — bypass CLI entirely. Used when claude isn't on
  // PATH (macOS GUI apps don't read .zshrc) OR when the user prefers no CLI.
  if (opts.adapter === "anthropic-direct") {
    const apiKey = opts.apiKey ?? process.env.ANTHROPIC_API_KEY ?? "";
    if (!apiKey) {
      return makeErrorHandle(
        opts,
        "anthropic-direct adapter requires ANTHROPIC_API_KEY env or apiKey opt. Set it in Settings or your shell profile."
      );
    }
    return createAnthropicDirectSpawn(opts, { apiKey, baseUrl: opts.baseUrl });
  }

  if (opts.adapter === "ollama") {
    return createOllamaSpawn(opts, { baseUrl: opts.baseUrl });
  }

  if (opts.adapter === "openai-compat") {
    const apiKey = opts.apiKey ?? process.env.OPENAI_API_KEY ?? "";
    if (!apiKey) {
      return makeErrorHandle(opts, "openai-compat adapter requires OPENAI_API_KEY env or apiKey opt.");
    }
    return createOpenAiCompatSpawn(opts, { apiKey, baseUrl: opts.baseUrl });
  }

  // Session id strategy:
  //   - opts.sessionId provided: this is a follow-up turn within the same
  //     sidecar lifetime. Use --resume <id> so claude continues the same
  //     conversation; --session-id <existing> would error with "already in
  //     use" because claude persists the session jsonl on disk.
  //   - opts.sessionId absent: fresh chat — generate a brand-new UUID and
  //     pass --session-id. Don't derive deterministically from projectDir;
  //     that's how we collide with stale sessions left over from a prior
  //     Studio launch.
  const isResume = !!opts.sessionId;
  const sessionId = opts.sessionId ?? randomUUID();
  const ultrathinkRoot = cfg.ultrathinkRoot ?? findUltrathinkRoot(opts.projectDir) ?? process.cwd();
  const databaseUrl = cfg.databaseUrl ?? process.env.DATABASE_URL ?? "";

  const queue: EngineEvent[] = [];
  let resolveNext: ((v: IteratorResult<EngineEvent>) => void) | null = null;
  let closed = false;
  const pending: Promise<void>[] = [];

  const push = (e: EngineEvent) => {
    if (resolveNext) {
      const r = resolveNext;
      resolveNext = null;
      r({ value: e, done: false });
    } else {
      queue.push(e);
    }
  };

  const close = () => {
    if (closed) return;
    closed = true;
    if (resolveNext) {
      const r = resolveNext;
      resolveNext = null;
      r({ value: undefined, done: true });
    }
  };

  const iterable: AsyncIterable<EngineEvent> = {
    [Symbol.asyncIterator]() {
      return {
        next(): Promise<IteratorResult<EngineEvent>> {
          if (queue.length > 0) {
            return Promise.resolve({ value: queue.shift()!, done: false });
          }
          if (closed) {
            return Promise.resolve({ value: undefined as unknown as EngineEvent, done: true });
          }
          return new Promise((res) => {
            resolveNext = res;
          });
        },
      };
    },
  };

  let mcpPath: string | null = null;
  let child: ChildProcessWithoutNullStreams | null = null;
  let exitCode: number | null = null;
  let exitSignal: NodeJS.Signals | null = null;

  const done = (async (): Promise<{ exitCode: number | null; signal: NodeJS.Signals | null }> => {
    try {
      // 1. skill routing (best-effort, never blocks spawn on failure)
      const decision = await routeSkills({
        prompt: opts.prompt,
        ultrathinkRoot,
        topN: opts.topSkills ?? 3,
      }).catch(() => ({ picked: [], appendSystemPrompt: "" }));

      if (decision.picked.length > 0) {
        push({ kind: "skill-injected", skills: decision.picked.map((s) => ({ name: s.name, score: s.score })) });
      }

      // 2. mcp config (best-effort; if memory MCP isn't built, we still spawn without it)
      try {
        if (opts.mcpConfigPath) {
          mcpPath = opts.mcpConfigPath;
        } else if (databaseUrl) {
          mcpPath = await buildMcpConfig({ sessionId, databaseUrl, ultrathinkRoot });
        }
      } catch (err) {
        push({
          kind: "error",
          message: `mcp-config build failed: ${err instanceof Error ? err.message : String(err)}`,
          recoverable: true,
        });
      }

      // 3. spawn flags — branch by adapter
      const adapter = opts.adapter ?? "claude";
      let bin: string;
      let args: string[];
      if (adapter === "codex") {
        // OpenAI Codex CLI doesn't expose --mcp-config, --add-dir, or --append-system-prompt.
        // System hint goes into the prompt prelude; cwd is set on the spawn options.
        //
        // --skip-git-repo-check: codex refuses to run outside a git repo by default;
        //   Studio projects under ~/Studio/projects/<slug>/ are bare dirs at first.
        //
        // Codex defaults to a read-only sandbox + per-command approval prompt.
        // In Studio's automation flow there's no human to click "approve" so the
        // session would silently die after 60s. Passing the bypass flag matches
        // the semantics we already grant claude via --dangerously-skip-permissions.
        bin = CODEX_BIN;
        const prelude = decision.appendSystemPrompt ? `${decision.appendSystemPrompt}\n\n---\n\n` : "";
        args = [
          "exec",
          "--json",
          "--skip-git-repo-check",
          "--dangerously-bypass-approvals-and-sandbox",
          `${prelude}${opts.prompt}`,
        ];
        if (opts.model) {
          args.push("--model", opts.model);
        }
      } else {
        bin = CLAUDE_BIN;
        // Single-shot per turn: prompt comes via `-p`, output streams as JSON.
        // Do NOT pass `--input-format stream-json` here — we never write to
        // claude's stdin (each turn spawns a fresh process), and that flag
        // makes claude ignore `-p` and wait on stdin → it just hangs forever.
        // Use --resume for follow-up turns (claude rejects --session-id when
        // the id already exists on disk).
        args = [
          "-p",
          opts.prompt,
          "--output-format",
          "stream-json",
          "--include-partial-messages",
          "--verbose",
          isResume ? "--resume" : "--session-id",
          sessionId,
          "--add-dir",
          opts.projectDir,
          // Studio runs claude single-shot. Two things that block writes by default:
          //   1. -p mode is conservative ("session is read-only" posture).
          //      → --dangerously-skip-permissions tells claude to skip approval prompts.
          //   2. The user's ~/.claude/settings.json may have an explicit allowlist
          //      (e.g. only mcp__stitch / mcp__pencil) that excludes Edit/Write/Bash.
          //      That denies the policy check even when permission prompts are skipped,
          //      surfacing as "patch rejected: writing is blocked by read-only sandbox".
          //      → --allowedTools with the full core toolset overrides for this session.
          "--dangerously-skip-permissions",
          "--allowedTools",
          "Bash Edit Write Read Glob Grep LS WebFetch WebSearch TodoWrite NotebookEdit Task MultiEdit",
        ];
        if (opts.model) args.push("--model", opts.model);
        if (opts.bare) args.push("--bare");
        if (mcpPath) args.push("--mcp-config", mcpPath);
        if (decision.appendSystemPrompt) args.push("--append-system-prompt", decision.appendSystemPrompt);
      }

      // 4. spawn — neither claude nor codex needs stdin in our flow:
      //   claude: prompt comes via `-p`, every turn spawns a fresh process.
      //   codex:  prompt comes via positional arg.
      // Closing stdin (/dev/null) prevents either CLI from blocking on it.
      const stdinMode = adapter === "codex" || adapter === "claude" ? "ignore" : "pipe";
      child = childSpawn(bin, args, {
        cwd: opts.projectDir,
        env: {
          ...process.env,
          ULTRATHINK_SESSION_ID: sessionId,
          ULTRATHINK_PROJECT_DIR: opts.projectDir,
        },
        stdio: [stdinMode, "pipe", "pipe"],
      }) as ChildProcessWithoutNullStreams;

      push({
        kind: "spawn-started",
        sessionId,
        projectDir: opts.projectDir,
        pid: child.pid ?? -1,
      });

      // Honour external abort.
      const onAbort = () => {
        if (child && !child.killed) child.kill("SIGTERM");
      };
      opts.signal?.addEventListener("abort", onAbort, { once: true });

      // 5. parse stdout — branch on adapter
      const parser = new JsonlStreamParser();
      const normalise = adapter === "codex" ? normaliseCodexEvent : normaliseClaudeEvent;
      child.stdout.setEncoding("utf8");
      child.stdout.on("data", (chunk: string) => {
        for (const raw of parser.consume(chunk)) {
          for (const ev of normalise(raw)) {
            push(ev);
          }
        }
      });

      // 6. surface stderr as error events (non-fatal; process exit decides fatality)
      // Drop known-informational lines (codex's stdin status, etc.) so they
      // don't get folded into the on-exit error message and shown to the user.
      const NOISE_PATTERNS = [/^Reading additional input from stdin\.\.\.\s*$/, /^\s*$/];
      function isNoise(line: string): boolean {
        return NOISE_PATTERNS.some((re) => re.test(line));
      }
      child.stderr.setEncoding("utf8");
      let stderrBuf = "";
      child.stderr.on("data", (chunk: string) => {
        for (const line of chunk.split(/\r?\n/)) {
          if (!isNoise(line)) stderrBuf += line + "\n";
        }
        // Keep last 4KB — claude is verbose, full buffer would balloon memory
        if (stderrBuf.length > 4096) stderrBuf = stderrBuf.slice(-4096);
      });

      // 7. wait for exit
      await new Promise<void>((res) => {
        child!.on("close", (code, signal) => {
          exitCode = code;
          exitSignal = signal;
          // Drain any final non-newline-terminated stdout
          for (const raw of parser.flush()) {
            for (const ev of normalise(raw)) {
              push(ev);
            }
          }
          if (code !== 0 && code !== null) {
            push({
              kind: "error",
              message: stderrBuf.trim() || `${adapter} exited with code ${code}`,
              code: `exit_${code}`,
              recoverable: false,
            });
          }
          push({ kind: "spawn-exited", exitCode: code, signal });
          opts.signal?.removeEventListener?.("abort", onAbort);
          res();
        });
        child!.on("error", (err) => {
          push({
            kind: "error",
            message: `spawn failed: ${err.message}`,
            code: "spawn_failed",
            recoverable: false,
          });
          exitCode = -1;
          push({ kind: "spawn-exited", exitCode: -1, signal: null });
          res();
        });
      });
    } catch (err) {
      push({
        kind: "error",
        message: err instanceof Error ? err.message : String(err),
        recoverable: false,
      });
    } finally {
      // 8. clean up temp mcp config
      if (mcpPath && !opts.mcpConfigPath) {
        unlink(mcpPath).catch(() => undefined);
      }
      close();
    }
    return { exitCode, signal: exitSignal };
  })();

  pending.push(done.then(() => undefined));

  return {
    events: iterable,
    sessionId,
    done,
    abort: () => {
      if (child && !child.killed) child.kill("SIGTERM");
    },
  };
}

/**
 * Build a SpawnHandle that immediately yields an error event then closes.
 * Used to surface configuration problems (missing API key, unknown adapter)
 * to the UI through the same channel as a real spawn — no special-case
 * branches in callers.
 */
function makeErrorHandle(opts: SpawnOptions, message: string): SpawnHandle {
  const sessionId = opts.sessionId ?? `error-${Date.now()}`;
  const events: EngineEvent[] = [
    { kind: "spawn-started", sessionId, projectDir: opts.projectDir, pid: -1 },
    { kind: "error", message, recoverable: false },
    { kind: "spawn-exited", exitCode: 1, signal: null },
  ];
  let i = 0;
  const iterable: AsyncIterable<EngineEvent> = {
    [Symbol.asyncIterator]() {
      return {
        next(): Promise<IteratorResult<EngineEvent>> {
          if (i < events.length) return Promise.resolve({ value: events[i++]!, done: false });
          return Promise.resolve({ value: undefined as unknown as EngineEvent, done: true });
        },
      };
    },
  };
  return {
    events: iterable,
    sessionId,
    done: Promise.resolve({ exitCode: 1, signal: null }),
    abort: () => undefined,
  };
}
