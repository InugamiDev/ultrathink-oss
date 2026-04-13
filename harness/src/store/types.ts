// intent: store shape shared between reducers, screens, and the forge state adapter.
// status: done
// confidence: high

import type { Phase, PhaseStatus } from "../pipeline/phases.js";
import type { ClarifyOutput, PlanOutput, BuildOutput, ValidateOutput, ShipOutput } from "../pipeline/contracts.js";

export type WorkerStatus = "idle" | "busy" | "done" | "crashed";

export type WorkerInfo = {
  id: string;
  phase: Phase;
  skill?: string;
  status: WorkerStatus;
  currentAction?: string;
  startedAt?: number;
  finishedAt?: number;
  pid?: number;
};

export type LogLevel = "info" | "warn" | "error" | "worker";

export type LogEntry = {
  at: number;
  level: LogLevel;
  message: string;
  workerId?: string;
  phase?: Phase;
};

export type AppMode = "guided" | "expert";
export type AppScreen = "picker" | "pipeline" | "provider";

export type RunState = {
  id: string;
  intent: string;
  templateId?: string;
  projectPath: string;
  phase: Phase;
  phaseStatus: PhaseStatus;
  artifacts: Record<Phase, string[]>;
  clarify?: ClarifyOutput;
  plan?: PlanOutput;
  build?: BuildOutput;
  validate?: ValidateOutput;
  ship?: ShipOutput;
  skillShortlist: string[];
  workers: WorkerInfo[];
  log: LogEntry[];
  createdAt: string;
  updatedAt: string;
};

export const EMPTY_ARTIFACTS: Record<Phase, string[]> = {
  idle: [],
  clarify: [],
  plan: [],
  build: [],
  validate: [],
  ship: [],
  done: [],
  failed: [],
};
