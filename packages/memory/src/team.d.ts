/**
 * Team memory primitives — Phase 2 cross-agent memory for bipartite agents.
 *
 * Goals
 *   - Memories stay first-class (live in `memories` table) but are tagged as
 *     team-visible via the `wing/hall` taxonomy so existing recall layers do
 *     not accidentally surface them.
 *   - All inserts auto-detect `agent_id` from `process.env.PAPERCLIP_AGENT_ID`
 *     (mirrors `analytics.logSkillUsage`).
 *   - Direct SQL — does not modify `createMemory()` signature so the existing
 *     6 memory tools keep their contract.
 *
 * Scope convention
 *   - `wing = 'knowledge'`, `hall = 'shared'`   → memory_share output
 *   - `wing = 'knowledge'`, `hall = 'handoff'`  → memory_handoff output
 *   Both halls are intentionally outside the L0–L2 recall budget, so they
 *   only appear via explicit team queries (`memory_team_recall`).
 *
 * Neon note: every table reference is schema-qualified (`public.<table>`)
 * because the Neon HTTP driver does not preserve `SET search_path` across
 * tagged-template invocations.
 */
import type { Memory } from "./memory.js";
export interface ShareMemoryInput {
  title?: string;
  content: string;
  category?: string;
  importance?: number;
  confidence?: number;
  tags?: string[];
  scope?: string;
  agentId?: string | null;
  paperclipRunId?: string | null;
}
export interface HandoffMemoryInput {
  fromAgentId?: string | null;
  toAgentId: string;
  context: string;
  issueId?: string | null;
  importance?: number;
  scope?: string;
  paperclipRunId?: string | null;
}
export interface TeamRecallOptions {
  query?: string;
  agentId?: string;
  limit?: number;
  scope?: string;
  hall?: "shared" | "handoff" | "all";
}
/**
 * Save a memory tagged with agent_id and visible to the rest of the team.
 * Stored in `wing=knowledge`, `hall=shared`.
 */
export declare function shareMemory(input: ShareMemoryInput): Promise<Memory>;
/**
 * Structured handoff between agents. Stored in `wing=knowledge`, `hall=handoff`,
 * with `agent_id = toAgentId` so the target agent picks it up via agent-scoped
 * recall as well as team-recall.
 */
export declare function handoffMemory(input: HandoffMemoryInput): Promise<Memory>;
/**
 * Recall team-visible memories across agents and sessions.
 * Differs from `recall()` (layered L0–L3 for the current session) —
 * this is cross-agent, cross-session, on demand.
 */
export declare function teamRecall(opts?: TeamRecallOptions): Promise<Memory[]>;
export { tekioTeamStats } from "./team-tekio.js";
export type { TekioTeamStats } from "./team-tekio.js";
