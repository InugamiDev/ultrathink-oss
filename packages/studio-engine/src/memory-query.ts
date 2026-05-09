#!/usr/bin/env node
// intent: one-shot Postgres query that returns a memory knowledge graph as JSON
// status: done
// next: paginate beyond 500 nodes; add wing/hall filters via CLI args
// confidence: high
//
// Invoked as `node memory-query.js graph --limit=500`.
// Reads DATABASE_URL from env (caller is responsible for sourcing .env).
//
// Output shape (printed as one-line JSON to stdout):
//   { nodes: [{id, title, category, wing, hall, importance, accessCount}],
//     edges: [{source, target, type, strength}] }

import { config as loadDotenv } from "dotenv";
import { resolve } from "node:path";

// best-effort .env discovery so the user doesn't have to pass DATABASE_URL explicitly
try {
  loadDotenv({ path: resolve(process.cwd(), ".env") });
  loadDotenv({ path: resolve(process.env.HOME ?? "", ".ultrathink/.env") });
} catch {
  /* ignore */
}

const op = process.argv[2] ?? "graph";
const args = Object.fromEntries(
  process.argv.slice(3).map((a) => {
    const [k, v] = a.replace(/^--/, "").split("=");
    return [k, v ?? "true"];
  })
);

async function main(): Promise<void> {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    process.stderr.write("memory-query: DATABASE_URL not set\n");
    process.stdout.write(JSON.stringify({ nodes: [], edges: [] }) + "\n");
    process.exit(2);
  }

  // Use @neondatabase/serverless if available (already in workspace), else fall back to a CLI psql shell-out
  try {
    const mod = await import("@neondatabase/serverless");
    const { neon } = mod as unknown as {
      neon: (url: string) => (s: TemplateStringsArray, ...vals: unknown[]) => Promise<unknown[]>;
    };
    const sql = neon(dbUrl);

    if (op === "graph") {
      await graph(sql, args);
    } else if (op === "node") {
      await node(sql, args);
    } else if (op === "highlight") {
      await highlight(sql, args);
    } else {
      process.stderr.write(`unknown op: ${op}\n`);
      process.exit(2);
    }
  } catch (err) {
    process.stderr.write(`memory-query failed: ${err instanceof Error ? err.message : String(err)}\n`);
    process.stdout.write(JSON.stringify({ nodes: [], edges: [], error: String(err) }) + "\n");
    process.exit(1);
  }
}

type SqlFn = (s: TemplateStringsArray, ...vals: unknown[]) => Promise<unknown[]>;

async function graph(sql: SqlFn, args: Record<string, string>): Promise<void> {
  const limit = Math.min(parseInt(args.limit ?? "500", 10) || 500, 2000);
  // Optional: filter by scope (project). Accepts an exact match or trailing
  // wildcard via "ends-in-this" semantics so callers can pass either the full
  // scope ("Studio/projects/acomo") or just the basename ("acomo").
  const scope = (args.scope ?? "").trim();

  const memories = scope
    ? ((await sql`
        SELECT id::text AS id,
               COALESCE(title, LEFT(content, 80)) AS title,
               category,
               wing,
               hall,
               importance,
               access_count,
               created_at
        FROM memories
        WHERE is_archived = false
          AND (scope = ${scope} OR scope ILIKE ${"%" + scope})
        ORDER BY importance DESC NULLS LAST, access_count DESC
        LIMIT ${limit}
      `) as Array<{
        id: string;
        title: string;
        category: string;
        wing: string | null;
        hall: string | null;
        importance: number | null;
        access_count: number | null;
        created_at: string;
      }>)
    : ((await sql`
    SELECT id::text AS id,
           COALESCE(title, LEFT(content, 80)) AS title,
           category,
           wing,
           hall,
           importance,
           access_count,
           created_at
    FROM memories
    WHERE is_archived = false
    ORDER BY importance DESC NULLS LAST, access_count DESC
    LIMIT ${limit}
  `) as Array<{
        id: string;
        title: string;
        category: string;
        wing: string | null;
        hall: string | null;
        importance: number | null;
        access_count: number | null;
        created_at: string;
      }>);

  const ids = memories.map((m) => m.id);
  const idSet = new Set(ids);

  // Pull edges where both endpoints are in our node set, prefer not-yet-superseded edges
  const edges =
    ids.length === 0
      ? []
      : ((await sql`
          SELECT source_id::text AS source,
                 target_id::text AS target,
                 relation_type AS type,
                 strength
          FROM memory_relations
          WHERE valid_to IS NULL
            AND source_id::text = ANY(${ids})
            AND target_id::text = ANY(${ids})
        `) as Array<{ source: string; target: string; type: string; strength: number | null }>);

  const filteredEdges = edges.filter((e) => idSet.has(e.source) && idSet.has(e.target));

  process.stdout.write(
    JSON.stringify({
      nodes: memories.map((m) => ({
        id: m.id,
        title: m.title,
        category: m.category,
        wing: m.wing,
        hall: m.hall,
        importance: m.importance ?? 5,
        accessCount: m.access_count ?? 0,
      })),
      edges: filteredEdges.map((e) => ({
        source: e.source,
        target: e.target,
        type: e.type,
        strength: e.strength ?? 0.5,
      })),
    }) + "\n"
  );
}

async function node(sql: SqlFn, args: Record<string, string>): Promise<void> {
  const id = args.id;
  if (!id) {
    process.stderr.write("memory-query node: --id required\n");
    process.exit(2);
  }
  const rows = (await sql`
    SELECT id::text AS id, title, content, category, wing, hall, room,
           importance, confidence, access_count, source, scope,
           created_at, updated_at, accessed_at
    FROM memories WHERE id = ${id}::uuid LIMIT 1
  `) as Array<Record<string, unknown>>;
  process.stdout.write(JSON.stringify(rows[0] ?? null) + "\n");
}

async function highlight(sql: SqlFn, args: Record<string, string>): Promise<void> {
  // Recently-accessed memories — used by UI to glow the graph in real time
  const since = args.since ?? new Date(Date.now() - 5 * 60_000).toISOString();
  const rows = (await sql`
    SELECT id::text AS id, accessed_at
    FROM memories
    WHERE accessed_at > ${since}::timestamptz
    ORDER BY accessed_at DESC
    LIMIT 100
  `) as Array<{ id: string; accessed_at: string }>;
  process.stdout.write(JSON.stringify(rows) + "\n");
}

main();
