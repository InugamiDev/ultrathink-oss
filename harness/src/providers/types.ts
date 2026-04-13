// intent: provider interface — any CLI/API backend that can run phase prompts.
//         Each provider adapts a different tool into the same event stream.
// status: done
// confidence: high

import type { Phase } from "../pipeline/phases.js";
import type { WorkerEvent } from "../workers/bus.js";

export type ProviderKind = "claude" | "codex" | "local" | "cloud" | "stub";

export type ProviderConfig = {
  kind: ProviderKind;
  /** Display name shown in the TUI */
  label: string;
  /** Model override (e.g., "claude-sonnet-4-5-20250514", "gpt-4.1", "llama3") */
  model?: string;
  /** Base URL for cloud/local HTTP providers */
  endpoint?: string;
  /** API key — only used by cloud provider */
  apiKey?: string;
  /** Extra CLI flags passed to the spawned process */
  extraFlags?: string[];
};

export type SpawnRequest = {
  phase: Phase;
  prompt: string;
  skill?: string;
};

export type SpawnResult = {
  id: string;
  success: boolean;
};

/**
 * A provider must implement:
 * - available(): can we use this right now? (binary exists, API reachable, etc.)
 * - spawn(): run a prompt and emit WorkerEvents through the callback
 */
export interface Provider {
  readonly kind: ProviderKind;
  readonly label: string;
  available(): Promise<boolean>;
  spawn(id: string, req: SpawnRequest, emit: (ev: WorkerEvent) => void): Promise<SpawnResult>;
}

export const PROVIDER_LABELS: Record<ProviderKind, string> = {
  claude: "Claude Code CLI",
  codex: "Codex CLI",
  local: "Local LLM (Ollama)",
  cloud: "Cloud API",
  stub: "Stub (demo mode)",
};
