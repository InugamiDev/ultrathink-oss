// intent: define the fixed pipeline phases and their ordering.
// status: done
// next: extend ORDER if we ever add "feasibility" as a visible phase.
// confidence: high

export type Phase =
  | "idle"
  | "clarify"
  | "plan"
  | "build"
  | "validate"
  | "ship"
  | "done"
  | "failed";

/**
 * Visible phase order — what the PhaseBar renders. "idle/done/failed" are
 * meta states and never appear as steps.
 */
export const PHASE_ORDER: Phase[] = ["clarify", "plan", "build", "validate", "ship"];

export const PHASE_LABEL: Record<Phase, string> = {
  idle: "Idle",
  clarify: "Clarify",
  plan: "Plan",
  build: "Build",
  validate: "Validate",
  ship: "Ship",
  done: "Done",
  failed: "Failed",
};

export type PhaseStatus =
  | "pending"
  | "running"
  | "awaiting-input"
  | "passed"
  | "failed"
  | "skipped";
