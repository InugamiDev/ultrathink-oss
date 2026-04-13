import { describe, it, expect } from "vitest";
import { encodeAAAK, encodeMemoryAAAK, compressionStats } from "../memory/src/aaak.js";

describe("AAAK — Lossless Shorthand Dialect", () => {
  describe("encodeAAAK", () => {
    it("compresses verbose natural language", () => {
      const input =
        "Priya manages the Driftwood team: Kai works on backend and has 3 years experience, Soren handles frontend, Maya does infrastructure, and Leo is a junior who started last month. They are building a SaaS analytics platform. Current sprint is authentication migration to Clerk.";
      const result = encodeAAAK(input);
      expect(result.length).toBeLessThan(input.length);
      // Key information preserved
      expect(result).toContain("Driftwood");
      expect(result).toContain("Kai");
      expect(result).toContain("SaaS");
      expect(result).toContain("auth");
    });

    it("preserves short content as-is", () => {
      const input = "Uses TypeScript";
      const result = encodeAAAK(input);
      expect(result).toBe(input);
    });

    it("does not expand content beyond original length", () => {
      const input = "Modified memory/src/decisions.ts";
      const result = encodeAAAK(input);
      expect(result.length).toBeLessThanOrEqual(input.length);
    });

    it("abbreviates common dev terms in verbose text", () => {
      const input =
        "User prefers TypeScript strict mode with the recommended ESLint configuration and Prettier for code formatting in all JavaScript projects";
      const result = encodeAAAK(input);
      expect(result).toContain("ts");
      expect(result).toContain("rec");
      expect(result.length).toBeLessThan(input.length);
    });

    it("applies structural compression", () => {
      const input =
        "Decided to use Clerk for authentication instead of Auth0 because of better developer experience and pricing";
      const result = encodeAAAK(input);
      // "instead of" → ">"
      expect(result).toContain(">");
      // "because" → "∵"
      expect(result).toContain("∵");
      expect(result.length).toBeLessThan(input.length);
    });

    it("adds category prefix for verbose content with options", () => {
      const input =
        "We decided to migrate from Auth0 to Clerk for authentication because the developer experience is significantly better and pricing is more reasonable";
      const result = encodeAAAK(input, { category: "decision", wing: "knowledge", hall: "decisions" });
      expect(result).toMatch(/^DEC\[KN\.dec\]:/);
    });

    it("truncates very long content to 200 chars", () => {
      const input = "This is a very long verbose text. ".repeat(20);
      const result = encodeAAAK(input);
      expect(result.length).toBeLessThanOrEqual(203); // 200 + "..."
    });
  });

  describe("encodeMemoryAAAK", () => {
    it("handles full memory object", () => {
      const result = encodeMemoryAAAK({
        content:
          "User prefers using Tailwind CSS with the new theme directive for all styling in React components instead of plain CSS modules",
        category: "preference",
        wing: "user",
        hall: "preferences",
        importance: 8,
        tags: ["#tailwind", "#css"],
      });
      expect(result).toContain("tw");
      expect(result.length).toBeLessThan(120);
    });

    it("does not add metadata to short memories", () => {
      const result = encodeMemoryAAAK({
        content: "Uses React and Next.js",
        category: "preference",
        wing: "user",
        hall: "preferences",
        importance: 10,
      });
      // Short content should stay short
      expect(result.length).toBeLessThanOrEqual(22);
    });
  });

  describe("compressionStats", () => {
    it("calculates correct stats", () => {
      const stats = compressionStats(
        "This is a very long original text with many words that takes up space",
        "SHORT: compressed"
      );
      expect(stats.ratio).toBeGreaterThan(1);
      expect(stats.savedPct).toBeGreaterThan(0);
      expect(stats.savedTokens).toBeGreaterThan(0);
    });
  });

  describe("real-world compression ratios", () => {
    it("achieves meaningful compression on verbose paragraphs", () => {
      const verbose = [
        "The team decided to migrate from PostgreSQL connection pooling with PgBouncer to using Neon's built-in connection pooling because it reduces operational overhead and the performance characteristics are comparable for our workload patterns.",
        "We are currently working on implementing a comprehensive authentication system using Clerk instead of building custom authentication with NextAuth because Clerk provides better developer experience, built-in multi-factor authentication, and reasonable pricing for our user scale.",
        "During the last sprint retrospective, we identified that the main bottleneck in our deployment pipeline is the Docker image build step which takes approximately 12 minutes because we are not properly utilizing Docker layer caching and our node_modules are being rebuilt from scratch every time.",
      ];

      let totalOrig = 0;
      let totalComp = 0;

      for (const text of verbose) {
        const compressed = encodeAAAK(text, { category: "insight" });
        totalOrig += text.length;
        totalComp += compressed.length;
      }

      const ratio = totalOrig / totalComp;
      // Should achieve at least 1.3x on verbose text (limited by 200-char truncation)
      expect(ratio).toBeGreaterThan(1.3);
    });
  });
});
