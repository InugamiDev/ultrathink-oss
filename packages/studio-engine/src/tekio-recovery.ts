#!/usr/bin/env node
// intent: capture build-error → fix patterns into Tekiō adaptations so they decay over usage
// status: scaffolded (saves errors+fixes to memories.adaptations; recall on next session)
// next: pattern-match on signature substrings rather than exact match; weighted decay schedule
// confidence: medium — depends on Tekiō table shape staying stable
//
// Wraps the existing memory MCP / Tekiō plumbing. Callers (the engine, the CLI,
// or downstream Claude Code agents via the memory MCP tools) can:
//
//   tekio-recovery record  --error "<error text>"  --fix "<one-line fix>"  --tags build,npm
//   tekio-recovery match   --error "<error text>"  → returns prior adaptations matching this signature
//
// This is the same surface the agent's `mcp__memory__tekio_turn` tool exposes;
// providing it as a CLI lets non-MCP callers (the dev-server runner, the deploy
// script) record fixes too.

import { neon } from "@neondatabase/serverless";
import { config as loadDotenv } from "dotenv";
import { resolve } from "node:path";
import { homedir } from "node:os";

try {
  loadDotenv({ path: resolve(process.cwd(), ".env") });
  loadDotenv({ path: resolve(homedir(), ".ultrathink/.env") });
} catch {
  /* ignore */
}

interface Args {
  op: "record" | "match" | "list";
  error?: string;
  fix?: string;
  tags?: string;
  limit?: number;
}

function parseArgs(): Args {
  const args: Args = { op: (process.argv[2] as Args["op"]) ?? "list" };
  for (let i = 3; i < process.argv.length; i += 2) {
    const k = process.argv[i].replace(/^--/, "");
    const v = process.argv[i + 1];
    if (k === "error") args.error = v;
    else if (k === "fix") args.fix = v;
    else if (k === "tags") args.tags = v;
    else if (k === "limit") args.limit = parseInt(v, 10);
  }
  return args;
}

function emit(payload: Record<string, unknown>): void {
  process.stdout.write(JSON.stringify(payload) + "\n");
}

/** Crude signature: lowercase the error, strip paths/numbers, hash to ~96 chars. */
function signatureFor(error: string): string {
  return error
    .toLowerCase()
    .replace(/[a-z0-9_\-./]+\.(?:ts|tsx|js|jsx|json|css|html|md)/g, "<file>")
    .replace(/\b\d+\b/g, "<n>")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 240);
}

async function main(): Promise<void> {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    emit({ kind: "error", message: "DATABASE_URL not set" });
    process.exit(2);
  }
  const sql = neon(dbUrl);
  const args = parseArgs();

  if (args.op === "record") {
    if (!args.error || !args.fix) {
      emit({ kind: "error", message: "record requires --error and --fix" });
      process.exit(2);
    }
    const sig = signatureFor(args.error);
    // Save as a memory tagged adaptation, importance 7, in experience/outcomes wing
    const content = `Build-error recovery [${args.tags ?? "build"}]\nError: ${args.error.slice(0, 600)}\nFix: ${args.fix.slice(0, 600)}\nSignature: ${sig}`;
    const rows = (await sql`
      INSERT INTO memories (content, category, importance, confidence, source, wing, hall, layer, token_estimate)
      VALUES (
        ${content},
        'adaptation',
        7,
        0.85,
        'studio',
        'experience',
        'outcomes',
        2,
        ${Math.min(Math.round(content.length / 4), 32767)}
      )
      RETURNING id::text AS id
    `) as Array<{ id: string }>;
    emit({ kind: "recorded", id: rows[0]?.id, signature: sig });
  } else if (args.op === "match") {
    if (!args.error) {
      emit({ kind: "error", message: "match requires --error" });
      process.exit(2);
    }
    const sig = signatureFor(args.error);
    // Use trigram similarity if pg_trgm is available; fall back to ILIKE on signature substring
    const rows = (await sql`
      SELECT id::text AS id, content, importance, confidence, created_at
      FROM memories
      WHERE category = 'adaptation'
        AND wing = 'experience'
        AND content ILIKE ${"%" + sig.slice(0, 120) + "%"}
        AND is_archived = false
      ORDER BY importance DESC, confidence DESC, created_at DESC
      LIMIT ${args.limit ?? 5}
    `) as Array<Record<string, unknown>>;
    emit({ kind: "matches", signature: sig, results: rows });
  } else if (args.op === "list") {
    const rows = (await sql`
      SELECT id::text AS id,
             SUBSTRING(content FROM 1 FOR 240) AS preview,
             importance, confidence, created_at
      FROM memories
      WHERE category = 'adaptation' AND wing = 'experience' AND is_archived = false
      ORDER BY created_at DESC
      LIMIT ${args.limit ?? 50}
    `) as unknown[];
    emit({ kind: "list", results: rows });
  } else {
    emit({ kind: "error", message: `unknown op: ${args.op}` });
    process.exit(2);
  }
}

main().catch((err) => {
  emit({ kind: "error", message: err instanceof Error ? err.message : String(err) });
  process.exit(1);
});
