// intent: frontend mirror of @inuverse/studio-engine event types
// status: done (kept manually in sync; could codegen from engine .d.ts)
// next: codegen these from the engine's types.ts via tsc --emitDeclarationOnly
// confidence: high

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
  | {
      kind: "completion";
      durationMs: number;
      costUsd?: number;
      result: string | null;
    }
  | { kind: "error"; message: string; code?: string; recoverable?: boolean }
  | {
      kind: "spawn-exited";
      exitCode: number | null;
      // POSIX signal name (e.g. "SIGTERM"). Stringly-typed in the webview to
      // avoid pulling NodeJS namespace types into the browser bundle.
      signal: string | null;
    }
  | { kind: "checkpoint-created"; sha: string; projectDir: string };

export interface Checkpoint {
  sha: string;
  message: string;
  date: string;
}

export interface ProjectInfo {
  dir: string;
  name: string;
  lastModified: string; // ISO
}

export interface StartSessionRequest {
  prompt: string;
  projectDir?: string;
  model?: string;
  adapter?: "claude" | "codex" | "anthropic-direct" | "openai-compat" | "ollama";
  apiKey?: string;
  baseUrl?: string;
  topSkills?: number;
}
