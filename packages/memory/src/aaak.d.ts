export interface EncodeOptions {
  /** Memory category (preference, decision, etc.) */
  category?: string;
  /** Wing (agent, user, knowledge, experience) */
  wing?: string;
  /** Hall (core, decisions, patterns, etc.) */
  hall?: string;
  /** Importance 1-10 */
  importance?: number;
  /** Tags to append */
  tags?: string[];
}
/**
 * Encode natural language content to AAAK shorthand.
 * Achieves 2-8x compression depending on content verbosity.
 * Short content (<60 chars) bypasses text compression to avoid expansion.
 */
export declare function encodeAAAK(content: string, opts?: EncodeOptions): string;
/**
 * Encode a memory object to AAAK shorthand.
 * Omits tags and importance for short memories (they add more than they save).
 */
export declare function encodeMemoryAAAK(memory: {
  content: string;
  category?: string;
  wing?: string;
  hall?: string;
  importance?: number;
  tags?: string[];
}): string;
/**
 * Format Tekiō adaptations in AAAK shorthand.
 * Replaces the verbose formatAdaptations() output.
 */
export declare function formatAdaptationsAAAK(
  adaptations: {
    category: string;
    adaptation_rule: string;
    times_applied?: number;
    times_prevented?: number;
  }[]
): string;
/**
 * Format recalled memories in AAAK for context injection.
 * Replaces the markdown format in recall.ts.
 */
export declare function formatRecallAAAK(
  memories: {
    content: string;
    category?: string;
    wing?: string;
    hall?: string;
    importance?: number;
    tags?: string[];
  }[]
): string;
/**
 * Get the compression ratio for a given input → AAAK output.
 * Returns { original, compressed, ratio, savedTokens }
 */
export declare function compressionStats(
  original: string,
  compressed: string
): {
  originalTokens: number;
  compressedTokens: number;
  ratio: number;
  savedTokens: number;
  savedPct: number;
};
