#!/usr/bin/env node

/**
 * UltraThink Code Intelligence MCP Server
 *
 * 5 tools for cross-file dependency analysis:
 * - code-symbols: Search symbol definitions by name/pattern/kind
 * - code-deps: What does this symbol import/call? (outgoing edges)
 * - code-dependents: What calls/imports this symbol? (incoming edges)
 * - code-impact: Transitive dependents up to N hops
 * - code-modules: List semantic clusters in a project
 *
 * Required env: DATABASE_URL
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { config } from "dotenv";
import { join } from "path";
import { searchSymbols, getDeps, getDependents, getImpact, getModules, findSymbolByName } from "./query.js";
import { clusterProject } from "./clusterer.js";
import { getClient, rows } from "./client.js";

config({ path: join(import.meta.dirname, "../../.env") });

const server = new McpServer({
  name: "code-intel",
  version: "1.0.0",
});

/* ─── Tool: code-symbols ──────────────────────────────────────────── */

server.tool(
  "code-symbols",
  "Search symbol definitions (functions, classes, types, interfaces) by name, pattern, or kind. Uses full-text + fuzzy matching.",
  {
    query: z.string().describe("Symbol name or pattern to search for"),
    kind: z
      .enum(["function", "class", "interface", "type", "enum", "variable", "method", "property", "module", "namespace"])
      .optional()
      .describe("Filter by symbol kind"),
    project: z.string().optional().describe("Filter by project name"),
    exported_only: z.boolean().optional().default(false).describe("Only show exported symbols"),
    limit: z.number().optional().default(20).describe("Max results"),
  },
  async ({ query, kind, project, exported_only, limit }) => {
    const results = await searchSymbols({ query, kind, project, exported_only, limit });

    if (results.length === 0) {
      return { content: [{ type: "text" as const, text: `No symbols found matching "${query}"` }] };
    }

    const lines = results.map(
      (s) =>
        `${s.file_path}:${s.line_number} ${s.is_exported ? "export " : ""}${s.kind} ${s.name}${s.signature ? ` — ${s.signature}` : ""}`
    );

    return {
      content: [{ type: "text" as const, text: `Found ${results.length} symbols:\n\n${lines.join("\n")}` }],
    };
  }
);

/* ─── Tool: code-deps ─────────────────────────────────────────────── */

server.tool(
  "code-deps",
  "Show what a symbol depends on — imports, calls, extends, implements (outgoing edges).",
  {
    symbol: z.string().describe("Symbol name to look up"),
    project: z.string().optional().describe("Filter by project name"),
  },
  async ({ symbol, project }) => {
    const sym = await findSymbolByName(symbol, project);
    if (!sym) {
      return { content: [{ type: "text" as const, text: `Symbol "${symbol}" not found` }], isError: true };
    }

    const deps = await getDeps(sym.id);
    if (deps.length === 0) {
      return { content: [{ type: "text" as const, text: `"${symbol}" has no outgoing dependencies.` }] };
    }

    const lines = deps.map((d) => {
      const loc = d.file_path ? `${d.file_path}:${d.line_number}` : d.target_module || "unresolved";
      return `  [${d.edge_type}] ${d.symbol_name || d.target_name} (${loc})`;
    });

    return {
      content: [
        {
          type: "text" as const,
          text: `Dependencies of ${symbol} (${sym.file_path}:${sym.line_number}):\n\n${lines.join("\n")}`,
        },
      ],
    };
  }
);

/* ─── Tool: code-dependents ───────────────────────────────────────── */

server.tool(
  "code-dependents",
  "Show what depends on this symbol — what imports/calls/extends it (incoming edges).",
  {
    symbol: z.string().describe("Symbol name to look up"),
    project: z.string().optional().describe("Filter by project name"),
  },
  async ({ symbol, project }) => {
    const sym = await findSymbolByName(symbol, project);
    if (!sym) {
      return { content: [{ type: "text" as const, text: `Symbol "${symbol}" not found` }], isError: true };
    }

    const deps = await getDependents(sym.id);
    if (deps.length === 0) {
      return { content: [{ type: "text" as const, text: `Nothing depends on "${symbol}".` }] };
    }

    const lines = deps.map((d) => `  [${d.edge_type}] ${d.symbol_name} (${d.file_path}:${d.line_number})`);

    return {
      content: [
        {
          type: "text" as const,
          text: `Dependents of ${symbol} (${sym.file_path}:${sym.line_number}):\n\n${lines.join("\n")}`,
        },
      ],
    };
  }
);

/* ─── Tool: code-impact ───────────────────────────────────────────── */

server.tool(
  "code-impact",
  "Transitive impact analysis — what breaks if this symbol changes? Walks the dependency graph up to N hops.",
  {
    symbol: z.string().describe("Symbol name to analyze"),
    project: z.string().optional().describe("Filter by project name"),
    max_hops: z.number().optional().default(3).describe("Max traversal depth (1-5)"),
  },
  async ({ symbol, project, max_hops }) => {
    const sym = await findSymbolByName(symbol, project);
    if (!sym) {
      return { content: [{ type: "text" as const, text: `Symbol "${symbol}" not found` }], isError: true };
    }

    const hops = Math.min(Math.max(max_hops, 1), 5);
    const impact = await getImpact(sym.id, hops);

    if (impact.length === 0) {
      return { content: [{ type: "text" as const, text: `No transitive dependents found for "${symbol}".` }] };
    }

    // Group by hop level
    const byHop = new Map<number, typeof impact>();
    for (const item of impact) {
      const group = byHop.get(item.hop) || [];
      group.push(item);
      byHop.set(item.hop, group);
    }

    const sections: string[] = [];
    for (const [hop, items] of [...byHop.entries()].sort((a, b) => a[0] - b[0])) {
      const lines = items.map((i) => `  ${i.symbol_name} (${i.file_path}) [${i.edge_type}]`);
      sections.push(`Hop ${hop} (${items.length}):\n${lines.join("\n")}`);
    }

    return {
      content: [
        {
          type: "text" as const,
          text: `Impact analysis for ${symbol} (${sym.file_path}:${sym.line_number}):\n${impact.length} symbols affected across ${byHop.size} hops\n\n${sections.join("\n\n")}`,
        },
      ],
    };
  }
);

/* ─── Tool: code-modules ──────────────────────────────────────────── */

server.tool(
  "code-modules",
  "List semantic clusters (modules) in a project — groups of related files based on directory structure and edge density.",
  {
    project: z.string().optional().describe("Filter by project name"),
    recompute: z.boolean().optional().default(false).describe("Recompute clusters before listing"),
  },
  async ({ project, recompute }) => {
    if (recompute && project) {
      const sql = getClient();
      const projects = rows<{ id: string }>(await sql`SELECT id FROM ci_projects WHERE name = ${project}`);
      if (projects.length > 0) {
        await clusterProject(projects[0].id);
      }
    }

    const modules = await getModules(project);

    if (modules.length === 0) {
      return {
        content: [{ type: "text" as const, text: "No modules found. Run indexing first, then use recompute=true." }],
      };
    }

    const lines = modules.map(
      (m) =>
        `  ${m.name} — ${m.file_count} files, ${m.symbol_count} symbols${m.description ? ` (${m.description})` : ""}${m.directory_pattern ? ` [${m.directory_pattern}]` : ""}`
    );

    return {
      content: [{ type: "text" as const, text: `Modules:\n\n${lines.join("\n")}` }],
    };
  }
);

/* ─── Start ───────────────────────────────────────────────────────── */

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  console.error("Code-Intel MCP server error:", err);
  process.exit(1);
});
