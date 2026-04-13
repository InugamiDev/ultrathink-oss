// intent: Codex CLI provider — spawns `codex` in non-interactive mode.
//         Codex uses --quiet + --full-auto for headless operation, outputs JSON events.
// status: done
// confidence: medium — codex CLI flags may change between versions.

import { spawn } from "node:child_process";
import type { Provider, ProviderConfig, SpawnRequest, SpawnResult } from "./types.js";
import type { WorkerEvent } from "../workers/bus.js";

export function createCodexProvider(config: ProviderConfig): Provider {
  return {
    kind: "codex",
    label: config.label,

    async available(): Promise<boolean> {
      return new Promise((resolve) => {
        const child = spawn("codex", ["--version"], { stdio: "ignore" });
        child.on("error", () => resolve(false));
        child.on("exit", (code) => resolve(code === 0));
      });
    },

    async spawn(id, req, emit): Promise<SpawnResult> {
      return new Promise((resolve) => {
        const prompt = buildPrompt(req);
        const args = ["--quiet", "--full-auto", prompt];
        if (config.model) args.push("--model", config.model);
        if (config.extraFlags) args.push(...config.extraFlags);

        let child;
        try {
          child = spawn("codex", args, {
            stdio: ["ignore", "pipe", "pipe"],
            env: process.env,
          });
        } catch (e) {
          emit({ type: "worker:error", id, error: e instanceof Error ? e.message : String(e) });
          resolve({ id, success: false });
          return;
        }

        let buf = "";
        child.stdout?.on("data", (d: Buffer) => {
          buf += d.toString("utf8");
          let idx: number;
          while ((idx = buf.indexOf("\n")) >= 0) {
            const line = buf.slice(0, idx).trim();
            buf = buf.slice(idx + 1);
            if (!line) continue;
            // Codex outputs tool_use/text events as JSON lines
            try {
              const ev = JSON.parse(line);
              const action = summarizeCodexEvent(ev);
              if (action) emit({ type: "worker:action", id, action });
            } catch {
              // Plain text output — show as action
              if (line.length > 0) emit({ type: "worker:action", id, action: line.slice(0, 120) });
            }
          }
        });

        child.stderr?.on("data", (d: Buffer) => {
          emit({ type: "worker:log", id, level: "warn", message: d.toString("utf8").trim().slice(0, 200) });
        });

        child.on("exit", (code) => {
          const success = code === 0;
          emit({ type: "worker:done", id, success });
          resolve({ id, success });
        });

        child.on("error", (e) => {
          emit({ type: "worker:error", id, error: e.message });
          resolve({ id, success: false });
        });
      });
    },
  };
}

function buildPrompt(req: SpawnRequest): string {
  const skill = req.skill
    ? `Read the skill file at .claude/skills/${req.skill}/SKILL.md and follow its instructions.\n`
    : "";
  const directive: Record<string, string> = {
    clarify: "Ask 3 clarifying questions about the user's intent. Do not write code.",
    plan: "Create a step-by-step plan in .planning/PLAN.md. Do not execute.",
    build: "Build the feature following the plan in .planning/PLAN.md.",
    validate: "Verify the build against the spec in .planning/SPEC.md.",
    ship: "Prepare for release: CHANGELOG, git commit, ask before push.",
  };
  return `${skill}PHASE: ${req.phase}\n${directive[req.phase] ?? ""}\n\n${req.prompt}`;
}

function summarizeCodexEvent(ev: unknown): string | null {
  if (!ev || typeof ev !== "object") return null;
  const e = ev as Record<string, unknown>;
  if (typeof e.type === "string" && typeof e.name === "string") return `tool: ${e.name}`;
  if (typeof e.message === "string") return (e.message as string).slice(0, 100);
  if (typeof e.output === "string") return (e.output as string).slice(0, 100);
  return null;
}
