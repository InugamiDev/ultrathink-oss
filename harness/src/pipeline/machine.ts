// intent: finite state machine — intentions → phase transitions.
// status: done
// next: add guards that require phase output to exist before advancing.
// confidence: high

import type { Phase } from "./phases.js";

/**
 * User intentions. These are the ONLY verbs the TUI exposes. Raw commands
 * do not exist — the user selects an intention, and the machine decides
 * whether it's allowed from the current phase.
 *
 * Feedback loop intents (redo/modify/improve) are self-loops: they rerun the
 * current phase with either the same prompt (redo), a revised prompt (modify),
 * or a polish/refine pass on top of the existing output (improve).
 */
export type Intent =
  | "start_project"
  | "answer_clarify"
  | "approve_plan"
  | "reject_plan"
  | "build_feature"
  | "fix_failure"
  | "continue_pipeline"
  | "ship_now"
  | "redo"
  | "modify"
  | "improve"
  | "give_feedback"
  | "abort";

// Every live phase supports the same feedback-loop subset.
const FEEDBACK_LOOPS = {
  redo: "SAME" as const,
  modify: "SAME" as const,
  improve: "SAME" as const,
  give_feedback: "SAME" as const,
};

function loopFor(phase: Phase): Partial<Record<Intent, Phase>> {
  return {
    redo: phase,
    modify: phase,
    improve: phase,
    give_feedback: phase,
  };
}

const TABLE: Record<Phase, Partial<Record<Intent, Phase>>> = {
  idle: {
    start_project: "clarify",
  },
  clarify: {
    answer_clarify: "plan",
    ...loopFor("clarify"),
    abort: "idle",
  },
  plan: {
    approve_plan: "build",
    reject_plan: "clarify",
    ...loopFor("plan"),
    abort: "idle",
  },
  build: {
    continue_pipeline: "validate",
    build_feature: "build", // self-loop: add another feature
    fix_failure: "build",
    ...loopFor("build"),
    abort: "failed",
  },
  validate: {
    continue_pipeline: "ship",
    fix_failure: "build",
    ...loopFor("validate"),
    abort: "failed",
  },
  ship: {
    ship_now: "done",
    ...loopFor("ship"),
    abort: "failed",
  },
  done: {
    start_project: "clarify",
  },
  failed: {
    continue_pipeline: "clarify",
    fix_failure: "build",
    abort: "idle",
  },
};
// Suppress unused import — FEEDBACK_LOOPS documents intent but the logic lives in loopFor.
void FEEDBACK_LOOPS;

export function next(phase: Phase, intent: Intent): Phase | null {
  return TABLE[phase][intent] ?? null;
}

export function allowed(phase: Phase): Intent[] {
  return Object.keys(TABLE[phase]) as Intent[];
}
