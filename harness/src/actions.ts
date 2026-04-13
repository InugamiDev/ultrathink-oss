// intent: public action surface. UI components dispatch through these — never
//         touching the store or workers directly. Every action is an intention,
//         every intention goes through the FSM.
// status: done
// confidence: high

import { runIdFor, saveRun } from "./state/forge-state.js";
import { next, type Intent } from "./pipeline/machine.js";
import type { Phase } from "./pipeline/phases.js";
import { EMPTY_ARTIFACTS, type RunState } from "./store/types.js";
import { store } from "./store/store.js";
import { selectForPhase, selectSkillsForIntent } from "./skills/select.js";
import { getTemplate } from "./skills/templates.js";
import { executePhase } from "./workers/runner.js";
import { getProjectDir } from "./project.js";

// ─────────────────────────────────────────────────────────────
// start_project — the only action allowed from idle.
// ─────────────────────────────────────────────────────────────
export function startProject(intent: string, templateId?: string): RunState {
  const tpl = templateId ? getTemplate(templateId) : undefined;
  const resolved = tpl?.intent ?? intent;
  // Seed the shortlist with phase-biased picks for "clarify" (entry phase).
  // The top orchestrator/hub skills will anchor the first worker.
  const matches = selectSkillsForIntent(resolved);
  const shortlist = matches.map((m) => m.skill.name);
  const now = new Date().toISOString();
  const projectPath = getProjectDir();

  const run: RunState = {
    id: runIdFor(`${projectPath}:${now}`),
    intent: resolved,
    templateId,
    projectPath,
    phase: "clarify",
    phaseStatus: "awaiting-input",
    artifacts: structuredClone(EMPTY_ARTIFACTS),
    skillShortlist: shortlist,
    workers: [],
    log: [],
    createdAt: now,
    updatedAt: now,
  };
  store.setRun(run);
  saveRun(run);
  store.log({
    level: "info",
    phase: "clarify",
    message: `start: ${resolved.slice(0, 80)}`,
  });
  if (matches.length > 0) {
    store.log({
      level: "info",
      phase: "clarify",
      message: `matched ${matches.length} skills from registry — lead: ${matches[0].skill.name} (${matches[0].score}pts)`,
    });
  } else {
    store.log({
      level: "warn",
      phase: "clarify",
      message: `no skill matches for intent — running without skill anchor`,
    });
  }

  // Kick off the clarify worker immediately. The UI can override with
  // answer_clarify to jump ahead once the user has responded.
  void executePhase("clarify", resolved).then(() => {
    saveRun(store.state.run!);
  });
  return run;
}

// ─────────────────────────────────────────────────────────────
// applyIntent — generic intent dispatcher. Rejects invalid transitions.
// ─────────────────────────────────────────────────────────────
export async function applyIntent(intent: Intent, payload?: { feedback?: string }): Promise<Phase | null> {
  const run = store.state.run;
  if (!run) return null;

  const target = next(run.phase, intent);
  if (target === null) {
    store.log({
      level: "warn",
      message: `intent "${intent}" not allowed from phase "${run.phase}"`,
    });
    return null;
  }

  // Feedback-loop intents re-shortlist skills in case the phase context changed.
  const isLoop = intent === "redo" || intent === "modify" || intent === "improve" || intent === "give_feedback";
  if (isLoop) {
    const biased = selectForPhase(run.intent, target).map((m) => m.skill.name);
    store.patchRun((r) => ({ ...r, skillShortlist: biased }));
  }

  store.patchRun((r) => ({ ...r, phase: target, phaseStatus: "running" }));
  saveRun(store.state.run!);

  // Build phase prompt with optional feedback context.
  const prompt = buildPhasePromptWithFeedback(run, intent, payload?.feedback);

  // Only run a worker for live phases.
  // intent: answer_clarify transitions to plan — the user's answers are in the prompt.
  if (target !== "done" && target !== "idle" && target !== "failed") {
    await executePhase(target, prompt);
    saveRun(store.state.run!);
  }
  return target;
}

function buildPhasePromptWithFeedback(run: RunState, intent: Intent, feedback?: string): string {
  const base = run.intent;
  switch (intent) {
    case "answer_clarify":
      return `USER ANSWERS:\n${feedback ?? "(no answers provided)"}\n\nOriginal intent: ${base}`;
    case "redo":
      return `RETRY — rerun this phase from scratch.\n\nOriginal intent: ${base}`;
    case "modify":
      return `REVISE — apply this feedback and regenerate.\n\nFeedback: ${feedback ?? "(no feedback given)"}\n\nOriginal intent: ${base}`;
    case "improve":
      return `POLISH — the previous output is acceptable but could be better. Refine it without starting over.\n\nOriginal intent: ${base}${feedback ? `\n\nEmphasis: ${feedback}` : ""}`;
    case "give_feedback":
      return `FEEDBACK ACKNOWLEDGED — ${feedback ?? "(no feedback given)"}\n\nOriginal intent: ${base}`;
    default:
      return base;
  }
}

// ─────────────────────────────────────────────────────────────
// Named convenience actions — the buttons shown in guided mode.
// ─────────────────────────────────────────────────────────────
export async function buildFeature(description: string) {
  const run = store.state.run;
  if (!run) return;
  store.patchRun((r) => ({ ...r, phaseStatus: "running" }));
  await executePhase("build", `Add feature: ${description}`);
  saveRun(store.state.run!);
}

export async function fixFailure() {
  await applyIntent("fix_failure");
}

export async function continuePipeline() {
  await applyIntent("continue_pipeline");
}

export async function approvePlan() {
  await applyIntent("approve_plan");
}

export async function revisePlan() {
  await applyIntent("reject_plan");
}

export async function shipNow() {
  await applyIntent("ship_now");
}

// ─────────────────────────────────────────────────────────────
// Feedback loop convenience actions
// ─────────────────────────────────────────────────────────────
export async function redoPhase() {
  await applyIntent("redo");
}

export async function modifyPhase(feedback: string) {
  await applyIntent("modify", { feedback });
}

export async function improvePhase(emphasis?: string) {
  await applyIntent("improve", { feedback: emphasis });
}

export async function giveFeedback(feedback: string) {
  await applyIntent("give_feedback", { feedback });
}
