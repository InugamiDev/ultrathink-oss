/**
 * Memory Search Enrichment — generates semantic keywords for better tsvector search.
 *
 * Instead of relying on an external embedding API, we expand memory content
 * with related terms, synonyms, and semantic context so Postgres tsvector
 * can find memories by meaning, not just exact words.
 *
 * This acts as "Claude Code as the embedding model" — the enrichment
 * happens at write time, making search-time fast and purely in Postgres.
 */
/**
 * Generate enrichment text for a memory.
 * Extracts key terms from content and expands with synonyms + category context.
 */
export declare function enrichMemory(content: string, category: string, tags?: string[]): string;
/**
 * Enrich a search query with expanded terms for better matching.
 * Adds date expansions, synonym expansions, and key concept terms.
 * Returns the original query + expanded terms as a single string.
 */
export declare function enrichQuery(query: string): string;
/**
 * Expand query words with ALL synonyms (no slicing).
 * Used for tag matching and ILIKE tiers where longer expansion helps
 * rather than hurting (unlike pg_trgm which penalizes long strings).
 */
export declare function expandQuerySynonyms(query: string): string[];
