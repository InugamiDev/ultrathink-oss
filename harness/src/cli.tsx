#!/usr/bin/env node
// intent: tsx entry point. Parses flags, sets project dir, loads provider, renders <App/>.
// status: done
// confidence: high

import React from "react";
import { render } from "ink";
import { App } from "./app.js";
import { store } from "./store/store.js";
import { loadConfig, setProvider } from "./config.js";
import { createProvider, PROVIDER_LABELS } from "./providers/index.js";
import { setActiveProvider } from "./workers/spawner.js";
import { setProjectDir } from "./project.js";
import type { AppMode } from "./store/types.js";
import type { ProviderKind } from "./providers/types.js";

const args = process.argv.slice(2);
const mode: AppMode = args.includes("--expert") ? "expert" : "guided";
store.setMode(mode);

if (args.includes("--help") || args.includes("-h")) {
  console.log(`
UltraThink UY Edition — intention-driven pipeline TUI

Usage:
  ultrathink-harness [options] [project-dir]

  If project-dir is provided, the harness operates in that directory.
  Otherwise, it defaults to the current working directory.
  You can also change the project directory interactively with [d].

Options:
  --expert               Show run id, skill matches, and worker internals
  --provider <kind>      Set provider: claude | codex | local | cloud | stub
  --model <model>        Override model (e.g., claude-sonnet-4-5-20250514, gpt-4.1, llama3)
  --endpoint <url>       Override endpoint for local/cloud providers
  --dir <path>           Set project directory (same as positional arg)
  --help, -h             Print this message

Providers:
  claude    Claude Code CLI (claude -p)
  codex     Codex CLI (codex --quiet --full-auto)
  local     Local LLM via Ollama API (http://localhost:11434)
  cloud     Any OpenAI-compatible API endpoint
  stub      Demo mode with fake delays (default)

Environment:
  ULTRATHINK_HARNESS_MODE    Provider kind (same as --provider)
  OPENAI_API_KEY             API key for cloud provider

Config: ~/.ultrathink/harness/config.json
`);
  process.exit(0);
}

// Handle --dir or positional project directory
const dirIdx = args.indexOf("--dir");
if (dirIdx >= 0 && args[dirIdx + 1]) {
  try {
    setProjectDir(args[dirIdx + 1]);
  } catch (e) {
    console.error(e instanceof Error ? e.message : String(e));
    process.exit(1);
  }
} else {
  // Positional arg: last arg that's not a flag or flag value
  const lastArg = args[args.length - 1];
  if (
    lastArg &&
    !lastArg.startsWith("--") &&
    !["--provider", "--model", "--endpoint", "--dir"].includes(args[args.length - 2])
  ) {
    try {
      setProjectDir(lastArg);
    } catch {
      // not a valid dir — ignore, use cwd
    }
  }
}

// Handle --provider flag
const providerArgIdx = args.indexOf("--provider");
if (providerArgIdx >= 0 && args[providerArgIdx + 1]) {
  const kind = args[providerArgIdx + 1] as ProviderKind;
  if (!PROVIDER_LABELS[kind]) {
    console.error(`Unknown provider: ${kind}. Use: claude, codex, local, cloud, stub`);
    process.exit(1);
  }
  const overrides: Partial<{ model: string; endpoint: string }> = {};
  const modelIdx = args.indexOf("--model");
  if (modelIdx >= 0 && args[modelIdx + 1]) overrides.model = args[modelIdx + 1];
  const endpointIdx = args.indexOf("--endpoint");
  if (endpointIdx >= 0 && args[endpointIdx + 1]) overrides.endpoint = args[endpointIdx + 1];
  setProvider(kind, overrides);
}

// Load provider from config
const config = loadConfig();
store.setProviderKind(config.provider.kind);
const provider = createProvider(config.provider);
setActiveProvider(provider);

render(<App />);
