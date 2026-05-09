// intent: typed event union for the studio engine spawn stream
// status: done
// next: extend with more granular tool-use subtypes as Claude Code's stream-json shape evolves
// confidence: high
//
// Engine emits a typed AsyncIterable<EngineEvent>. Consumers (CLI, Tauri shell)
// pattern-match on `kind` to render. Shape mirrors what Claude Code emits via
// `--output-format stream-json --include-partial-messages`, normalised so callers
// don't have to know the underlying Claude protocol.

export type EngineEvent =
  | { kind: "spawn-started"; sessionId: string; projectDir: string; pid: number }
  | { kind: "system-init"; data: Record<string, unknown> }
  | { kind: "assistant-text-delta"; text: string }
  | { kind: "assistant-text-block"; text: string }
  | { kind: "tool-use-start"; toolUseId: string; name: string; input?: unknown }
  | { kind: "tool-use-input-delta"; toolUseId: string; partial: string }
  | { kind: "tool-result"; toolUseId: string; content: unknown; isError?: boolean }
  | { kind: "thinking"; text: string }
  | {
      kind: "usage";
      inputTokens: number;
      outputTokens: number;
      cacheReadTokens?: number;
      cacheWriteTokens?: number;
      model?: string;
    }
  | { kind: "skill-injected"; skills: Array<{ name: string; score: number }> }
  | { kind: "memory-recalled"; memoryIds: string[] }
  | { kind: "completion"; durationMs: number; costUsd?: number; result: string | null }
  | { kind: "error"; message: string; code?: string; recoverable?: boolean }
  | { kind: "spawn-exited"; exitCode: number | null; signal: NodeJS.Signals | null };

export interface SpawnOptions {
  /** Plain-English prompt from the user (chat input). */
  prompt: string;

  /** Absolute path to the project directory. Engine will cd into this for the spawn. */
  projectDir: string;

  /**
   * Which provider drives this turn. Defaults to "claude".
   * - "claude"           → Anthropic Claude Code CLI (--print stream-json) — uses skill mesh + MCP + memory
   * - "codex"            → OpenAI Codex CLI (exec --json)
   * - "anthropic-direct" → Direct https://api.anthropic.com — bypasses CLI; ANTHROPIC_API_KEY required
   * - "openai-compat"    → Any OpenAI-compatible chat-completions endpoint (OpenRouter, Groq, Together, LM Studio)
   * - "ollama"           → Local Ollama at http://localhost:11434 — free, private, slower
   */
  adapter?: "claude" | "codex" | "anthropic-direct" | "openai-compat" | "ollama";

  /** Override API key (otherwise uses provider-specific env). */
  apiKey?: string;

  /** Override base URL — for openai-compat (OpenRouter, etc) or ollama (remote box). */
  baseUrl?: string;

  /**
   * Optional explicit session id. Pass an existing UUID to resume a project's prior
   * conversation; omit to start fresh.
   */
  sessionId?: string;

  /**
   * Model alias or full id. Defaults to the user's Claude Code default.
   * Example: "sonnet", "opus", "claude-sonnet-4-6", "claude-opus-4-7".
   */
  model?: string;

  /** Permission mode for autonomous edits. Defaults to "acceptEdits". */
  permissionMode?: "acceptEdits" | "auto" | "bypassPermissions" | "default" | "dontAsk" | "plan";

  /**
   * Path to an MCP config JSON. If omitted, the engine generates a temp config
   * containing the UltraThink memory MCP scoped to this project's session id.
   */
  mcpConfigPath?: string;

  /**
   * Top-N skills to auto-inject as appended system prompt. Set to 0 to skip
   * skill routing entirely.
   */
  topSkills?: number;

  /**
   * Skip CLAUDE.md, hooks, plugin sync. Useful for hermetic test runs.
   * Defaults false in interactive use (we want UltraThink hooks active).
   */
  bare?: boolean;

  /** Abort signal — ending the controller will SIGTERM the spawn. */
  signal?: AbortSignal;
}

export interface SpawnHandle {
  /** Async iterable of normalised engine events. Iterate to consume the stream. */
  events: AsyncIterable<EngineEvent>;

  /** Stable session id for this conversation; persist to resume. */
  sessionId: string;

  /** Promise resolving to final exit code once the spawn ends. */
  done: Promise<{ exitCode: number | null; signal: NodeJS.Signals | null }>;

  /** Force-stop the spawn. */
  abort: () => void;
}

export interface SkillRouterDecision {
  picked: Array<{ name: string; score: number; description?: string }>;
  appendSystemPrompt: string;
}

export interface MemoryMcpEntry {
  /** Session id used to scope memories to this project. */
  sessionId: string;
  /** Database connection string. */
  databaseUrl: string;
}
