export type Wing = "agent" | "user" | "knowledge" | "experience";
export type Layer = 0 | 1 | 2 | 3;
/** Zettelkasten relation types for inter-memory linking */
export type MemoryRelationType =
  | "learned-from"
  | "contradicts"
  | "supports"
  | "applies-to"
  | "caused-by"
  | "supersedes"
  | "related_to";
/**
 * Quality gate — reject garbage before it enters the system.
 * Returns null if valid, error string if rejected.
 */
/**
 * Layer-aware quality gate:
 *   L0-L1 (strict): <20 chars, >20 lines, pure code, raw errors → rejected
 *   L2 (medium):    <15 chars, >40 lines, pure code → rejected
 *   L3 (relaxed):   <10 chars, pure code → rejected (experience accumulates)
 */
export declare function passesQualityGate(content: string, layer?: Layer): string | null;
export interface Memory {
  id: string;
  title?: string;
  content: string;
  category: string;
  importance: number;
  confidence: number;
  scope?: string;
  source?: string;
  session_id?: string;
  plan_id?: string;
  file_path?: string;
  wing?: Wing;
  hall?: string;
  room?: string;
  layer?: Layer;
  token_estimate?: number;
  created_at: string;
  updated_at: string;
  accessed_at: string;
  access_count: number;
  is_archived: boolean;
  is_compacted: boolean;
  tags?: string[];
}
export interface CreateMemoryInput {
  title?: string;
  content: string;
  category: string;
  importance?: number;
  confidence?: number;
  scope?: string;
  source?: string;
  session_id?: string;
  plan_id?: string;
  file_path?: string;
  wing?: Wing;
  hall?: string;
  room?: string;
  layer?: Layer;
  tags?: string[];
}
export declare function createMemory(input: CreateMemoryInput): Promise<Memory>;
export declare function getMemory(id: string): Promise<Memory | null>;
export declare function searchMemories(opts: {
  category?: string;
  scope?: string;
  tags?: string[];
  query?: string;
  limit?: number;
  minImportance?: number;
  includeArchived?: boolean;
}): Promise<Memory[]>;
/**
 * Hybrid 3-tier search: tsvector (best) → pg_trgm (fuzzy) → ILIKE (fallback).
 * No external API needed — runs entirely in Postgres.
 */
export declare function semanticSearch(opts: {
  query: string;
  scope?: string;
  limit?: number;
  minImportance?: number;
  minSimilarity?: number;
}): Promise<
  (Memory & {
    similarity?: number;
  })[]
>;
/**
 * Check if a similar memory already exists (for dedup).
 * Uses tsvector for semantic matching + pg_trgm for fuzzy.
 */
export declare function findSimilar(content: string, threshold?: number): Promise<Memory | null>;
export declare function updateMemory(
  id: string,
  updates: Partial<Pick<Memory, "content" | "category" | "importance" | "confidence" | "scope" | "is_archived">>
): Promise<Memory | null>;
export declare function deleteMemory(id: string): Promise<boolean>;
export declare function addMemoryTags(memoryId: string, tags: string[]): Promise<void>;
export declare function removeMemoryTag(memoryId: string, tag: string): Promise<void>;
export interface MemoryRelation {
  source_id: string;
  target_id: string;
  relation_type: string;
  strength: number;
}
export declare function createRelation(
  sourceId: string,
  targetId: string,
  relationType?: string,
  strength?: number
): Promise<void>;
export declare function getRelations(
  memoryId: string,
  opts?: {
    includeHistory?: boolean;
  }
): Promise<MemoryRelation[]>;
export declare function getMemoryGraph(opts?: { scope?: string; limit?: number }): Promise<{
  nodes: Memory[];
  edges: MemoryRelation[];
}>;
/**
 * Calculate a memory's effective recall score using time-decay.
 *
 * Formula: score = importance * confidence * decay * accessBoost
 * - decay = 1 / (1 + ageDays / halfLife)  — hyperbolic decay, never reaches 0
 * - halfLife scales with importance: high-importance memories decay slower
 * - accessBoost: recently accessed memories get a small bump
 *
 * Categories exempt from decay: "decision", "preference", "identity"
 */
export declare function calculateRecallScore(memory: {
  importance: number;
  confidence: number;
  category: string;
  created_at: string;
  accessed_at: string;
  access_count: number;
}): number;
/**
 * Batch touch memories (update accessed_at + access_count) when recalled by search.
 * Non-blocking — failures don't affect search results.
 */
export declare function touchMemories(ids: string[]): Promise<void>;
export declare function getMemoryStats(): Promise<{
  total: number;
  byCategory: Record<string, number>;
  avgImportance: number;
  archived: number;
  relations: number;
}>;
