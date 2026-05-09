/**
 * LongMemEval Benchmark — Memory Retrieval Quality Tests
 *
 * Based on LongMemEval (ICLR 2025): 5 abilities tested across 50+ questions.
 * Seeds test memories in beforeAll(), queries via semanticSearch(), scores with keyword matching.
 * No external API needed — tests retrieval quality, not LLM reasoning.
 *
 * Pass thresholds:
 *   Information Extraction: ≥80%
 *   Multi-Session Reasoning: ≥60%
 *   Temporal Reasoning:      ≥60%
 *   Knowledge Updates:       ≥70%
 *   Abstention:              ≥80%
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { resolve, join } from "path";
import { config } from "dotenv";
import { readFileSync } from "fs";

const ROOT = resolve(__dirname, "..");
config({ path: join(ROOT, ".env") });

// Dynamic imports to allow config to load first
let createMemory: typeof import("../memory/src/memory.js").createMemory;
let semanticSearch: typeof import("../memory/src/memory.js").semanticSearch;
let getClient: typeof import("../memory/src/client.js").getClient;

const TEST_SCOPE = `longmemeval-test-${Date.now()}`;
const seededIds: string[] = [];

interface SeedMemory {
  id: string;
  content: string;
  category: string;
  importance: number;
  confidence: number;
  wing: string;
  hall: string;
  layer: number;
  tags: string[];
}

interface Question {
  id: string;
  question: string;
  expected_keywords: string[];
  expected_seed?: string;
  reject_keywords?: string[];
  should_abstain?: boolean;
  description?: string;
}

interface TestData {
  seeds: SeedMemory[];
  questions: {
    information_extraction: Question[];
    multi_session_reasoning: Question[];
    temporal_reasoning: Question[];
    knowledge_updates: Question[];
    abstention: Question[];
  };
}

let testData: TestData;

// Score a search result against expected keywords (70% overlap threshold)
function scoreResult(
  results: Array<{ content: string; similarity?: number }>,
  expectedKeywords: string[],
  rejectKeywords?: string[]
): { pass: boolean; matched: string[]; missed: string[] } {
  if (expectedKeywords.length === 0) return { pass: true, matched: [], missed: [] };

  const allContent = results
    .slice(0, 5) // top 5 results
    .map((r) => r.content.toLowerCase())
    .join(" ");

  const matched: string[] = [];
  const missed: string[] = [];

  for (const kw of expectedKeywords) {
    if (allContent.includes(kw.toLowerCase())) {
      matched.push(kw);
    } else {
      missed.push(kw);
    }
  }

  // Check reject keywords aren't in top result
  if (rejectKeywords && results.length > 0) {
    const topContent = results[0].content.toLowerCase();
    for (const rk of rejectKeywords) {
      if (topContent.includes(rk.toLowerCase())) {
        return { pass: false, matched, missed: [...missed, `REJECT:${rk}`] };
      }
    }
  }

  const overlapRatio = matched.length / expectedKeywords.length;
  return { pass: overlapRatio >= 0.7, matched, missed };
}

describe.skipIf(!process.env.DATABASE_URL)("LongMemEval Benchmark", () => {
  beforeAll(async () => {
    // Load test data
    testData = JSON.parse(readFileSync(join(__dirname, "fixtures/longmemeval-questions.json"), "utf-8"));

    // Dynamic imports
    const memoryModule = await import("../packages/memory/src/memory.js");
    createMemory = memoryModule.createMemory;
    semanticSearch = memoryModule.semanticSearch;
    const clientModule = await import("../packages/memory/src/client.js");
    getClient = clientModule.getClient;

    // Seed test memories
    for (const seed of testData.seeds) {
      try {
        const mem = await createMemory({
          content: seed.content,
          category: seed.category,
          importance: seed.importance,
          confidence: seed.confidence,
          scope: TEST_SCOPE,
          source: "longmemeval-seed",
          wing: seed.wing as any,
          hall: seed.hall,
          layer: seed.layer as any,
          tags: seed.tags,
        });
        seededIds.push(mem.id);
      } catch {
        // Quality gate may reject some — that's fine for testing
      }
    }
  }, 60000);

  afterAll(async () => {
    // Cleanup: archive test memories
    if (seededIds.length > 0) {
      try {
        const sql = getClient();
        await sql`
          UPDATE memories SET is_archived = true
          WHERE scope = ${TEST_SCOPE}
        `;
      } catch {
        // Non-critical cleanup
      }
    }
  }, 30000);

  // ─── Information Extraction (≥80%) ───────────────────────────────────

  describe("Information Extraction", () => {
    const results: boolean[] = [];

    afterAll(() => {
      const passRate = results.filter(Boolean).length / results.length;
      console.log(
        `\n  Information Extraction: ${results.filter(Boolean).length}/${results.length} (${(passRate * 100).toFixed(0)}%) — threshold ≥80%`
      );
    });

    it.each(
      // Load synchronously since testData is set in beforeAll
      Array.from({ length: 10 }, (_, i) => [`ie-${String(i + 1).padStart(2, "0")}`])
    )(
      "retrieves specific fact: %s",
      async (qId) => {
        const q = testData.questions.information_extraction.find((q) => q.id === qId)!;
        const searchResults = await semanticSearch({
          query: q.question,
          scope: TEST_SCOPE,
          limit: 5,
        });
        const score = scoreResult(searchResults, q.expected_keywords);
        results.push(score.pass);
        expect(score.pass).toBe(true);
      },
      15000
    );
  });

  // ─── Multi-Session Reasoning (≥60%) ──────────────────────────────────

  describe("Multi-Session Reasoning", () => {
    const results: boolean[] = [];

    afterAll(() => {
      const passRate = results.filter(Boolean).length / results.length;
      console.log(
        `\n  Multi-Session Reasoning: ${results.filter(Boolean).length}/${results.length} (${(passRate * 100).toFixed(0)}%) — threshold ≥60%`
      );
    });

    it.each(Array.from({ length: 10 }, (_, i) => [`ms-${String(i + 1).padStart(2, "0")}`]))(
      "synthesizes across memories: %s",
      async (qId) => {
        const q = testData.questions.multi_session_reasoning.find((q) => q.id === qId)!;
        const searchResults = await semanticSearch({
          query: q.question,
          scope: TEST_SCOPE,
          limit: 10,
        });
        const score = scoreResult(searchResults, q.expected_keywords);
        results.push(score.pass);
        expect(score.pass).toBe(true);
      },
      15000
    );
  });

  // ─── Temporal Reasoning (≥60%) ───────────────────────────────────────

  describe("Temporal Reasoning", () => {
    const results: boolean[] = [];

    afterAll(() => {
      const passRate = results.filter(Boolean).length / results.length;
      console.log(
        `\n  Temporal Reasoning: ${results.filter(Boolean).length}/${results.length} (${(passRate * 100).toFixed(0)}%) — threshold ≥60%`
      );
    });

    it.each(Array.from({ length: 10 }, (_, i) => [`tr-${String(i + 1).padStart(2, "0")}`]))(
      "handles time-based queries: %s",
      async (qId) => {
        const q = testData.questions.temporal_reasoning.find((q) => q.id === qId)!;
        const searchResults = await semanticSearch({
          query: q.question,
          scope: TEST_SCOPE,
          limit: 10,
        });
        const score = scoreResult(searchResults, q.expected_keywords);
        results.push(score.pass);
        expect(score.pass).toBe(true);
      },
      15000
    );
  });

  // ─── Knowledge Updates (≥70%) ────────────────────────────────────────

  describe("Knowledge Updates", () => {
    const results: boolean[] = [];

    afterAll(() => {
      const passRate = results.filter(Boolean).length / results.length;
      console.log(
        `\n  Knowledge Updates: ${results.filter(Boolean).length}/${results.length} (${(passRate * 100).toFixed(0)}%) — threshold ≥70%`
      );
    });

    it.each(Array.from({ length: 10 }, (_, i) => [`ku-${String(i + 1).padStart(2, "0")}`]))(
      "returns updated facts: %s",
      async (qId) => {
        const q = testData.questions.knowledge_updates.find((q) => q.id === qId)!;
        const searchResults = await semanticSearch({
          query: q.question,
          scope: TEST_SCOPE,
          limit: 5,
        });
        const score = scoreResult(searchResults, q.expected_keywords, q.reject_keywords);
        results.push(score.pass);
        expect(score.pass).toBe(true);
      },
      15000
    );
  });

  // ─── Abstention (≥80%) ───────────────────────────────────────────────

  describe("Abstention", () => {
    const results: boolean[] = [];

    afterAll(() => {
      const passRate = results.filter(Boolean).length / results.length;
      console.log(
        `\n  Abstention: ${results.filter(Boolean).length}/${results.length} (${(passRate * 100).toFixed(0)}%) — threshold ≥80%`
      );
    });

    it.each(Array.from({ length: 10 }, (_, i) => [`ab-${String(i + 1).padStart(2, "0")}`]))(
      "refuses when no evidence exists: %s",
      async (qId) => {
        const q = testData.questions.abstention.find((q) => q.id === qId)!;
        const searchResults = await semanticSearch({
          query: q.question,
          scope: TEST_SCOPE,
          limit: 5,
          minSimilarity: 0.15, // Higher threshold — should find nothing relevant
        });

        // For abstention: pass if no results have high similarity to the question
        // (i.e., the system correctly finds nothing relevant)
        const hasHighConfidenceMatch = searchResults.some((r) => (r.similarity ?? 0) > 0.3);
        const pass = !hasHighConfidenceMatch;
        results.push(pass);
        expect(pass).toBe(true);
      },
      15000
    );
  });
});
