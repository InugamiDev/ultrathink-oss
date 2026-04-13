// intent: Claude Code CLI provider — spawns `claude -p` with stream-json output.
//         Extracted from the original spawner.ts realWorker.
// status: done
// confidence: high

import { spawn } from "node:child_process";
import type { Phase } from "../pipeline/phases.js";
import type { WorkerEvent } from "../workers/bus.js";
import type { Provider, ProviderConfig, SpawnRequest, SpawnResult } from "./types.js";

export function createClaudeProvider(config: ProviderConfig): Provider {
  return {
    kind: "claude",
    label: config.label,

    async available(): Promise<boolean> {
      return new Promise((resolve) => {
        const child = spawn("claude", ["--version"], { stdio: "ignore" });
        child.on("error", () => resolve(false));
        child.on("exit", (code) => resolve(code === 0));
      });
    },

    async spawn(id, req, emit): Promise<SpawnResult> {
      return new Promise((resolve) => {
        const prompt = buildPrompt(req);
        const args = ["-p", prompt, "--output-format", "stream-json", "--verbose"];
        if (config.model) args.push("--model", config.model);
        if (config.extraFlags) args.push(...config.extraFlags);

        let child;
        try {
          child = spawn("claude", args, {
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
            try {
              const ev = JSON.parse(line);
              const action = summarizeEvent(ev);
              if (action) emit({ type: "worker:action", id, action });
            } catch {
              emit({ type: "worker:action", id, action: line.slice(0, 120) });
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
  const skill = req.skill ? `Load skill \`~/.claude/skills/${req.skill}/SKILL.md\` and follow it strictly.\n` : "";
  const directive: Record<string, string> = {
    clarify:
      "CLARIFY ONLY — ask 3 targeted questions to extract target user, problem, value prop, stack. Do not write code.",
    plan: "PLAN ONLY — invoke `gsd plan` mode to produce .planning/SPEC.md and .planning/PLAN.md. Do not execute.",
    build: "BUILD — invoke `gsd execute` mode, wave-based. Each wave is a fresh subagent.",
    validate: "VALIDATE — invoke `gsd verify` mode, goal-backward against .planning/SPEC.md must-haves.",
    ship: "SHIP — prepare CHANGELOG, stage commit, ask user to confirm before push.",
  };
  return `${skill}PHASE: ${req.phase}\n${directive[req.phase] ?? ""}\n\nUSER INTENT:\n${req.prompt}\n`;
}

function summarizeEvent(ev: unknown): string | null {
  if (!ev || typeof ev !== "object") return null;
  const e = ev as Record<string, unknown>;
  if (e.type === "tool_use" && typeof e.name === "string") return `tool: ${e.name}`;
  if (e.type === "text" && typeof e.text === "string") return (e.text as string).slice(0, 100);
  if (e.type === "result") return "done";
  return null;
}
