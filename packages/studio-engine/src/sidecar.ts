#!/usr/bin/env node
// intent: stdio JSON-RPC bridge between the Tauri Rust shell and the engine
// status: done
// next: support concurrent sessions per sidecar (today: one session per process)
// confidence: high
//
// Protocol (line-delimited JSON in both directions):
//
//   IN  (stdin)  → {op: "start", params: SpawnOptions}
//                  {op: "send",  params: {prompt: string}}     # follow-up turn
//                  {op: "stop"}
//                  {op: "shutdown"}
//
//   OUT (stdout) → {type: "ready",        sessionId, projectDir}
//                  {type: "event",        sessionId, event: EngineEvent}
//                  {type: "turn-done",    sessionId, exitCode}
//                  {type: "error",        message}
//                  {type: "ack"}                                # for send/stop
//
// One session per sidecar. The Rust shell spawns one sidecar per chat session.
// Follow-up turns reuse the same projectDir and sessionId so context resumes
// across calls (Claude Code resumes by --session-id).

import { createInterface } from "node:readline";
import { config as loadDotenv } from "dotenv";
import { resolve } from "node:path";

import { createSpawn } from "./spawn.js";
import { resolveProject } from "./project.js";
import type { EngineEvent, SpawnOptions } from "./types.js";

// Note: prompt is passed as a positional arg to startTurn(); params holds only
// the optional config (model, projectDir override, sessionId, etc.).
type StartParams = Omit<SpawnOptions, "prompt" | "projectDir"> & {
  /** If omitted, project resolved from prompt under ~/Studio/projects/<slug>/ */
  projectDir?: string;
  /** Convenience: same shape allows the IncomingMessage to also carry prompt. */
  prompt?: string;
};

interface IncomingMessage {
  op: "start" | "send" | "stop" | "shutdown";
  params?: StartParams | { prompt: string };
}

// Load .env from common project roots so DATABASE_URL is available for memory MCP.
const tryDotenv = (path: string) => {
  try {
    loadDotenv({ path });
  } catch {
    /* ignore */
  }
};
tryDotenv(resolve(process.cwd(), ".env"));
tryDotenv(resolve(process.env.HOME ?? "", ".ultrathink/.env"));

let currentSessionId: string | null = null;
let currentProjectDir: string | null = null;
let activeSpawn: ReturnType<typeof createSpawn> | null = null;
let activeSpawnDone: Promise<unknown> | null = null;

function send(payload: Record<string, unknown>): void {
  process.stdout.write(JSON.stringify(payload) + "\n");
}

async function startTurn(prompt: string, params: StartParams): Promise<void> {
  let projectDir = currentProjectDir;
  if (!projectDir) {
    const project = await resolveProject({
      prompt,
      projectDir: params.projectDir,
    });
    projectDir = project.dir;
    currentProjectDir = projectDir;
  }

  const handle = createSpawn({
    prompt,
    projectDir,
    sessionId: currentSessionId ?? params.sessionId,
    model: params.model,
    adapter: params.adapter,
    apiKey: (params as unknown as { apiKey?: string }).apiKey,
    baseUrl: (params as unknown as { baseUrl?: string }).baseUrl,
    topSkills: params.topSkills ?? 3,
    permissionMode: params.permissionMode,
    bare: params.bare,
  });
  currentSessionId = handle.sessionId;
  activeSpawn = handle;

  if (!activeSpawn) return;
  // First turn: emit ready with the resolved sessionId+projectDir before draining events
  send({
    type: "ready",
    sessionId: handle.sessionId,
    projectDir: projectDir,
  });

  const drain = (async () => {
    try {
      for await (const ev of handle.events) {
        send({ type: "event", sessionId: handle.sessionId, event: ev as EngineEvent });
      }
    } catch (err) {
      send({
        type: "error",
        message: err instanceof Error ? err.message : String(err),
      });
    }
    const exit = await handle.done;
    send({
      type: "turn-done",
      sessionId: handle.sessionId,
      exitCode: exit.exitCode,
    });
    activeSpawn = null;
  })();
  activeSpawnDone = drain;
}

const rl = createInterface({ input: process.stdin });

rl.on("line", (line) => {
  if (!line.trim()) return;
  let msg: IncomingMessage;
  try {
    msg = JSON.parse(line);
  } catch {
    send({ type: "error", message: "invalid JSON in stdin" });
    return;
  }

  void handle(msg);
});

async function handle(msg: IncomingMessage): Promise<void> {
  switch (msg.op) {
    case "start": {
      const params = (msg.params ?? {}) as StartParams;
      const prompt = (params as unknown as { prompt?: string }).prompt;
      if (!prompt || typeof prompt !== "string") {
        send({ type: "error", message: "start requires params.prompt" });
        return;
      }
      try {
        await startTurn(prompt, params);
      } catch (err) {
        send({
          type: "error",
          message: err instanceof Error ? err.message : String(err),
        });
      }
      break;
    }
    case "send": {
      const p = (msg.params ?? {}) as { prompt?: string };
      if (!p.prompt) {
        send({ type: "error", message: "send requires params.prompt" });
        return;
      }
      // wait for prior turn to fully drain
      if (activeSpawnDone) await activeSpawnDone;
      try {
        await startTurn(p.prompt, {});
        send({ type: "ack" });
      } catch (err) {
        send({
          type: "error",
          message: err instanceof Error ? err.message : String(err),
        });
      }
      break;
    }
    case "stop": {
      activeSpawn?.abort();
      send({ type: "ack" });
      break;
    }
    case "shutdown": {
      activeSpawn?.abort();
      if (activeSpawnDone) await activeSpawnDone;
      process.exit(0);
    }
    default: {
      send({ type: "error", message: `unknown op: ${(msg as { op: string }).op}` });
    }
  }
}

process.on("SIGTERM", () => {
  activeSpawn?.abort();
  process.exit(0);
});
process.on("SIGINT", () => {
  activeSpawn?.abort();
  process.exit(0);
});
