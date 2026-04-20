// intent: OSS stub for adaptation.ts — Tekiō is Core-only
// status: done
// confidence: high
//
// Exports no-op versions of all adaptation functions so memory-runner.ts
// imports resolve cleanly. Tekiō wheel commands return "not available" messages.

import type postgres from "postgres";

export interface FailureEvent {
  tool: string;
  error: string;
  file?: string;
  timestamp?: string;
}

export interface Adaptation {
  id: string;
  trigger_pattern: string;
  adaptation_rule: string;
  category: string;
  severity: number;
  times_applied: number;
  times_prevented: number;
  is_active: boolean;
  created_at: Date;
}

export async function wheelTurn(
  _sql: postgres.Sql,
  _event: FailureEvent
): Promise<{ learned: boolean; adaptation?: Adaptation; reason?: string }> {
  return { learned: false, reason: "Adaptive learning is not available in OSS" };
}

export async function wheelLearn(_sql: postgres.Sql, _pattern: string, _rule: string): Promise<{ id: string } | null> {
  console.log("Adaptive learning is not available in OSS");
  return null;
}

export async function getActiveAdaptations(_sql: postgres.Sql): Promise<Adaptation[]> {
  return [];
}

export function formatAdaptations(_adaptations: Adaptation[]): string {
  return "No adaptive learning rules (OSS mode)";
}

export async function adaptFromCorrection(
  _sql: postgres.Sql,
  _tool: string,
  _trigger: string,
  _rule: string
): Promise<{ id: string } | null> {
  console.log("Adaptive learning corrections are not available in OSS");
  return null;
}

export async function getWheelStats(_sql: postgres.Sql): Promise<Record<string, number>> {
  return { total: 0, defensive: 0, auxiliary: 0, offensive: 0, learning: 0, totalApplied: 0, totalPrevented: 0 };
}

export async function recordPrevention(_sql: postgres.Sql, _adaptationId: string): Promise<void> {
  // no-op in OSS
}
