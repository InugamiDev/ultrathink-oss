// intent: wire the event bus into the store and expose executePhase().
//         Importing this module registers the bus handlers as a side-effect.
// status: done
// confidence: high

import type { Phase } from "../pipeline/phases.js";
import { store } from "../store/store.js";
import { bus, type WorkerEvent } from "./bus.js";
import { runWorker } from "./spawner.js";

bus.on("event", (ev: WorkerEvent) => {
  switch (ev.type) {
    case "worker:start":
      store.upsertWorker({
        id: ev.id,
        phase: ev.phase,
        skill: ev.skill,
        status: "busy",
        startedAt: Date.now(),
      });
      store.log({
        level: "info",
        phase: ev.phase,
        workerId: ev.id,
        message: `spawn ${ev.skill ?? "(worker)"}`,
      });
      break;
    case "worker:action":
      store.upsertWorker({
        id: ev.id,
        phase: currentPhase(),
        status: "busy",
        currentAction: ev.action,
      });
      store.log({ level: "worker", workerId: ev.id, message: ev.action });
      break;
    case "worker:artifact":
      store.log({
        level: "info",
        workerId: ev.id,
        message: `artifact: ${ev.path}`,
      });
      break;
    case "worker:done":
      store.upsertWorker({
        id: ev.id,
        phase: currentPhase(),
        status: "done",
        finishedAt: Date.now(),
      });
      store.log({
        level: "info",
        workerId: ev.id,
        message: ev.success ? "done" : "failed",
      });
      break;
    case "worker:error":
      store.upsertWorker({
        id: ev.id,
        phase: currentPhase(),
        status: "crashed",
      });
      store.log({ level: "error", workerId: ev.id, message: ev.error });
      break;
    case "worker:log":
      store.log({ level: ev.level, workerId: ev.id, message: ev.message });
      break;
  }
});

function currentPhase(): Phase {
  return store.state.run?.phase ?? "idle";
}

export async function executePhase(phase: Phase, prompt: string) {
  const run = store.state.run;
  if (!run) throw new Error("harness: no active run");
  const skill = run.skillShortlist[0];
  store.patchRun((r) => ({ ...r, phaseStatus: "running" }));
  const result = await runWorker({ phase, prompt, skill });

  // intent: clarify phase ends in "awaiting-input" so the user can type answers.
  // All other phases end in passed/failed based on worker result.
  const endStatus = phase === "clarify" && result.success ? "awaiting-input" : result.success ? "passed" : "failed";

  store.patchRun((r) => ({ ...r, phaseStatus: endStatus }));
  return result;
}
