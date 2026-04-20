#!/usr/bin/env node

// intent: OSS MCP memory server — 4 tools (no Tekio), token-efficient responses
// status: done
// next: install deps, test via claude code
// confidence: high

/**
 * UltraThink Memory MCP Server (OSS)
 *
 * 4 tools for memory operations:
 * - memory_save: Create memories with required title + metadata
 * - memory_search: Hybrid search (tsvector + trigram + ILIKE)
 * - memory_recall: 4-layer brain recall (L0 core -> L3 experience)
 * - memory_link: Zettelkasten relation between memories
 *
 * Required env: DATABASE_URL
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { config } from "dotenv";
import { join } from "path";

// Load .env from project root
config({ path: join(import.meta.dirname, "../../../.env") });

// Import memory functions — relative paths to memory workspace source
import { createMemory, semanticSearch, createRelation } from "../../../memory/src/memory.js";
import { recall } from "../../../memory/src/recall.js";

import type { Wing } from "../../../memory/src/memory.js";

const server = new McpServer({
  name: "memory",
  version: "1.0.0",
});

/* --- Tool: memory_save -------------------------------------------------- */

server.tool(
  "memory_save",
  "Save a memory to UltraThink's Second Brain. Every memory gets a title, wing/hall placement, and importance score.",
  {
    title: z.string().min(5).max(80).describe("Short descriptive title (5-80 chars)"),
    content: z.string().min(20).max(4000).describe("Memory content — what to remember"),
    category: z
      .enum([
        "identity",
        "preference",
        "style-preference",
        "tool-preference",
        "workflow-pattern",
        "decision",
        "solution",
        "architecture",
        "pattern",
        "insight",
        "project-context",
        "session-summary",
        "correction-log",
        "learning",
      ])
      .describe("Memory category — determines wing/hall placement"),
    tags: z.array(z.string()).optional().describe("Optional tags for search enrichment"),
    importance: z
      .number()
      .min(1)
      .max(10)
      .optional()
      .default(5)
      .describe("1-10 importance (10=core identity, 1=ephemeral)"),
    confidence: z.number().min(0).max(1).optional().default(0.8).describe("0-1 confidence"),
    wing: z.enum(["agent", "user", "knowledge", "experience"]).optional().describe("Override auto-inferred wing"),
    hall: z.string().optional().describe("Override auto-inferred hall"),
    scope: z.string().optional().describe("Project scope (e.g. 'ai-agents/ultrathink')"),
  },
  async ({ title, content, category, tags, importance, confidence, wing, hall, scope }) => {
    try {
      const memory = await createMemory({
        title,
        content,
        category,
        tags,
        importance,
        confidence,
        wing: wing as Wing | undefined,
        hall,
        scope,
        source: "mcp",
      });

      const idShort = memory.id.slice(0, 8);
      return {
        content: [
          {
            type: "text" as const,
            text: `Saved: ${idShort} | ${memory.wing}/${memory.hall} L${memory.layer} imp=${memory.importance}`,
          },
        ],
      };
    } catch (err) {
      return {
        content: [{ type: "text" as const, text: `Failed to save: ${(err as Error).message}` }],
        isError: true,
      };
    }
  }
);

/* --- Tool: memory_search ------------------------------------------------ */

server.tool(
  "memory_search",
  "Search UltraThink's memory — hybrid tsvector + trigram + ILIKE. Returns ranked results.",
  {
    query: z.string().min(2).describe("Search query — natural language or keywords"),
    scope: z.string().optional().describe("Filter by project scope"),
    limit: z.number().min(1).max(30).optional().default(10).describe("Max results (default 10)"),
    min_importance: z.number().min(1).max(10).optional().default(1).describe("Min importance filter"),
  },
  async ({ query, scope, limit, min_importance }) => {
    try {
      const results = await semanticSearch({
        query,
        scope,
        limit,
        minImportance: min_importance,
      });

      if (results.length === 0) {
        return { content: [{ type: "text" as const, text: `No memories found for "${query}"` }] };
      }

      const lines = results.map((m, i) => {
        const sim = m.similarity !== undefined ? `sim=${(m.similarity * 100).toFixed(0)}%` : "";
        const title = m.title || m.content.slice(0, 50);
        const snippet = m.content.length > 80 ? m.content.slice(0, 77) + "..." : m.content;
        return `[${i + 1}] ${title} (${m.wing}/${m.hall}) ${sim} imp=${m.importance}\n  ${snippet}\n  id=${m.id}`;
      });

      return {
        content: [{ type: "text" as const, text: lines.join("\n") }],
      };
    } catch (err) {
      return {
        content: [{ type: "text" as const, text: `Search failed: ${(err as Error).message}` }],
        isError: true,
      };
    }
  }
);

/* --- Tool: memory_recall ------------------------------------------------ */

server.tool(
  "memory_recall",
  "4-layer brain recall — L0 core identity (~100tok), L1 essential decisions (~300tok), L2 context (~500tok). AAAK compression on by default.",
  {
    scope: z.string().optional().describe("Project scope to filter context-layer memories"),
    compact: z.boolean().optional().default(false).describe("Tighter budget, no headers"),
    aaak: z.boolean().optional().default(true).describe("AAAK lossless compression (~1.5x smaller)"),
    max_tokens: z.number().optional().default(900).describe("Total token budget for L0+L1+L2"),
  },
  async ({ scope, compact, aaak, max_tokens }) => {
    try {
      const result = await recall(scope, {
        compact,
        aaak,
        maxTokens: max_tokens,
        includeAdaptations: false,
      });

      return {
        content: [{ type: "text" as const, text: result || "No memories found." }],
      };
    } catch (err) {
      return {
        content: [{ type: "text" as const, text: `Recall failed: ${(err as Error).message}` }],
        isError: true,
      };
    }
  }
);

/* --- Tool: memory_link -------------------------------------------------- */

server.tool(
  "memory_link",
  "Zettelkasten link between two memories. Typed, directional (source -> target).",
  {
    source_id: z.string().uuid().describe("Source memory UUID"),
    target_id: z.string().uuid().describe("Target memory UUID"),
    relation: z
      .enum(["learned-from", "contradicts", "supports", "applies-to", "caused-by", "supersedes", "related_to"])
      .describe("Relation type — how source relates to target"),
    strength: z.number().min(0).max(1).optional().default(0.5).describe("Link strength 0-1"),
  },
  async ({ source_id, target_id, relation, strength }) => {
    try {
      await createRelation(source_id, target_id, relation, strength);
      return {
        content: [
          {
            type: "text" as const,
            text: `Linked: ${source_id.slice(0, 8)} —[${relation}]→ ${target_id.slice(0, 8)}`,
          },
        ],
      };
    } catch (err) {
      return {
        content: [{ type: "text" as const, text: `Link failed: ${(err as Error).message}` }],
        isError: true,
      };
    }
  }
);

/* --- Start server ------------------------------------------------------- */

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  console.error("Memory MCP server failed:", err);
  process.exit(1);
});
