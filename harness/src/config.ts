// intent: user preferences — persisted to ~/.ultrathink/harness/config.json.
//         Stores provider choice, model overrides, and endpoint config.
// status: done
// confidence: high

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import type { ProviderConfig, ProviderKind } from "./providers/types.js";

const CONFIG_DIR = join(homedir(), ".ultrathink", "harness");
const CONFIG_PATH = join(CONFIG_DIR, "config.json");

export type UserConfig = {
  /** Active provider */
  provider: ProviderConfig;
  /** Previously used providers (for quick switching) */
  recentProviders?: ProviderKind[];
};

const DEFAULT_CONFIG: UserConfig = {
  provider: {
    kind: (process.env.ULTRATHINK_HARNESS_MODE as ProviderKind) || "stub",
    label: "Stub (demo mode)",
  },
};

export function loadConfig(): UserConfig {
  if (!existsSync(CONFIG_PATH)) return { ...DEFAULT_CONFIG };
  try {
    const raw = JSON.parse(readFileSync(CONFIG_PATH, "utf8")) as Partial<UserConfig>;
    return {
      provider: raw.provider ?? DEFAULT_CONFIG.provider,
      recentProviders: raw.recentProviders,
    };
  } catch {
    return { ...DEFAULT_CONFIG };
  }
}

export function saveConfig(config: UserConfig): void {
  mkdirSync(CONFIG_DIR, { recursive: true });
  writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), "utf8");
}

export function setProvider(kind: ProviderKind, overrides?: Partial<ProviderConfig>): UserConfig {
  const labels: Record<ProviderKind, string> = {
    claude: "Claude Code CLI",
    codex: "Codex CLI",
    local: "Local LLM (Ollama)",
    cloud: "Cloud API",
    stub: "Stub (demo mode)",
  };

  const config = loadConfig();
  const recent = new Set(config.recentProviders ?? []);
  recent.add(config.provider.kind);
  recent.add(kind);

  config.provider = {
    kind,
    label: labels[kind],
    ...overrides,
  };
  config.recentProviders = [...recent].slice(-5);

  saveConfig(config);
  return config;
}
