// intent: Stub provider — fake delays and actions for dev/demo mode.
//         Extracted from the original spawner.ts stubWorker.
// status: done
// confidence: high

import type { Provider, ProviderConfig, SpawnRequest, SpawnResult } from "./types.js";
import type { WorkerEvent } from "../workers/bus.js";

export function createStubProvider(config: ProviderConfig): Provider {
  return {
    kind: "stub",
    label: config.label,

    async available(): Promise<boolean> {
      return true;
    },

    async spawn(id, req, emit): Promise<SpawnResult> {
      const actions = defaultStubActions(req);
      for (const a of actions) {
        await sleep(350 + Math.random() * 550);
        emit({ type: "worker:action", id, action: a });
      }
      emit({ type: "worker:done", id, success: true });
      return { id, success: true };
    },
  };
}

function defaultStubActions(req: SpawnRequest): string[] {
  const base = `phase=${req.phase} skill=${req.skill ?? "(auto)"}`;
  switch (req.phase) {
    case "clarify":
      return [
        `${base} — analyzing intent`,
        `extracting target user, problem, value prop`,
        `drafting 3 clarifying questions`,
      ];
    case "plan":
      return [
        `${base} — invoking gsd plan`,
        `researching stack conventions`,
        `writing .planning/SPEC.md`,
        `writing .planning/PLAN.md`,
      ];
    case "build":
      return [
        `${base} — spawning build agents`,
        `wave 1/3: scaffolding files`,
        `wave 2/3: wiring routes`,
        `wave 3/3: applying styles`,
      ];
    case "validate":
      return [`${base} — goal-backward verification`, `checking must-haves against spec`, `running test suite`];
    case "ship":
      return [`${base} — preparing ship checklist`, `generating CHANGELOG`, `awaiting user confirmation`];
    default:
      return [`${base} — nothing to do`];
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
