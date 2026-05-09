export interface RecallOptions {
  scope?: string;
  projectName?: string;
  /** Max total tokens for L0+L1+L2 combined */
  maxTokens?: number;
  /** Include adaptations (Tekiō wheel) */
  includeAdaptations?: boolean;
  /** Compact mode — tighter budget, no headers */
  compact?: boolean;
  /** AAAK mode — lossless shorthand dialect (~3-8x token compression) */
  aaak?: boolean;
}
/**
 * Unified recall: 4-layer memory loading with token budgets.
 *
 * | Layer | Budget    | What                                              |
 * |-------|-----------|---------------------------------------------------|
 * | L0    | ~100 tok  | Core (agent identity + user profile/preferences)  |
 * | L1    | ~300 tok  | Essential (decisions, patterns, agent rules)       |
 * | L2    | ~500 tok  | Context (insights, references, projects)           |
 * | L3    | On-demand | Deep search (sessions, outcomes, errors)           |
 *
 * Adaptations appended after brain section.
 */
export declare function recall(scope?: string, options?: RecallOptions): Promise<string>;
