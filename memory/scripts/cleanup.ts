#!/usr/bin/env npx tsx
/**
 * cleanup.ts — One-time DB cleanup for garbage memories.
 * Removes: duplicates, garbled preferences, bare exit codes, useless short memories.
 *
 * Usage: npx tsx memory/scripts/cleanup.ts
 */

import { config } from "dotenv";
import { resolve } from "path";

const projectRoot = resolve(import.meta.dirname, "../..");
config({ path: resolve(projectRoot, ".env") });

import { getClient } from "../src/client.js";

async function main() {
  const sql = getClient();
  let totalDeleted = 0;

  // 1. Delete exact duplicates (keep newest per content+scope)
  const dupeResult = await sql`
    DELETE FROM memories WHERE id IN (
      SELECT id FROM (
        SELECT id, ROW_NUMBER() OVER (PARTITION BY content, scope ORDER BY created_at DESC) as rn
        FROM memories
      ) ranked WHERE rn > 1
    )
  `;
  console.log("1. Exact duplicates deleted:", (dupeResult as any).count);
  totalDeleted += (dupeResult as any).count;

  // 2. Delete garbage "Avoids" preferences (code fragments, not user preferences)
  // These have pipe chars, markdown bold, backticks, or look like code
  const garbagePatterns = [
    "content LIKE 'Avoids %' AND content LIKE '%|%'",
    "content LIKE 'Avoids %' AND content LIKE '%**%'",
    "content LIKE 'Avoids %' AND content LIKE '%`%'",
    "content LIKE 'Avoids %' AND content LIKE '%(Confidence:%'",
    "content LIKE 'Avoids %' AND content LIKE '%tokenService%'",
    "content LIKE 'Avoids %' AND content LIKE '%initializes%'",
    "content LIKE 'Avoids %' AND content LIKE '%forwarded%'",
    "content LIKE 'Avoids %' AND content LIKE '%triggered by%'",
    "content LIKE 'Avoids %' AND content LIKE '%detected as%'",
    "content LIKE 'Avoids %' AND content LIKE '%existed in%'",
    "content LIKE 'Avoids %' AND content LIKE '%JwtGuard%'",
    "content LIKE 'Avoids %' AND content LIKE '%GalaxyCanvas%'",
    "content LIKE 'Avoids %' AND content LIKE '%viewportRef%'",
    "content LIKE 'Avoids %' AND content LIKE '%connects and never%'",
    "content LIKE 'Avoids %' AND content LIKE '%x-vorld%'",
    "content LIKE 'Avoids %' AND content LIKE '%HTTP call%'",
    "content LIKE 'Avoids %' AND content LIKE '%RSA keys%'",
    "content LIKE 'Avoids %' AND content LIKE '%issuance time%'",
    "content LIKE 'Avoids %' AND content LIKE '%CORS%'",
    "content LIKE 'Avoids %' AND content LIKE '%device ID%'",
    "content LIKE 'Avoids %' AND content LIKE '%the approach that%'",
    "content LIKE 'Avoids %' AND content LIKE '%repeat the same%'",
  ];

  // Kill ALL garbage preferences in one pass
  // Real preferences have clear structure: "Prefers X over Y", "Avoids doing X"
  // Garbage ones have: pipe chars, backticks, code keywords, sentence fragments
  const garbResult = await sql`
    DELETE FROM memories WHERE category = 'preference' AND (
      content LIKE '%|%' OR
      content LIKE '%**%' OR
      content LIKE '%tokenService%' OR
      content LIKE '%viewportRef%' OR
      content LIKE '%GalaxyCanvas%' OR
      content LIKE '%JwtGuard%' OR
      content LIKE '%RSA keys%' OR
      content LIKE '%CORS%' OR
      content LIKE '%Confidence:%' OR
      content LIKE 'Avoids existed%' OR
      content LIKE 'Avoids repeat the%' OR
      content LIKE 'Avoids the approach%' OR
      content LIKE 'Avoids triggered%' OR
      content LIKE 'Avoids detected%' OR
      content LIKE 'Avoids connects%' OR
      content LIKE 'Avoids initializes%' OR
      content LIKE 'Avoids an HTTP%' OR
      content LIKE 'Avoids be %' OR
      content LIKE 'Avoids sets %' OR
      content LIKE 'Avoids calls %' OR
      content LIKE 'Avoids forwarded%' OR
      content LIKE 'Avoids used by%' OR
      content LIKE 'Prefers you to have%' OR
      content LIKE 'Prefers oversell%' OR
      content LIKE 'Prefers overpromise%' OR
      content LIKE 'Prefers claim exact%' OR
      (content LIKE 'Avoids %' AND length(content) < 18)
    )
  `;
  console.log("2. Garbage 'Avoids' preferences deleted:", (garbResult as any).count);
  totalDeleted += (garbResult as any).count;

  // 3. Delete bare exit code solutions (no useful context)
  const exitResult = await sql`
    DELETE FROM memories WHERE content ~ '^\[solution\] Tool .+ failed: Exit code \d+$'
  `;
  console.log("3. Bare exit code solutions deleted:", (exitResult as any).count);
  totalDeleted += (exitResult as any).count;

  // 4. Delete useless short memories (just filenames, no context)
  const shortResult = await sql`
    DELETE FROM memories
    WHERE length(content) < 40
    AND category IN ('architecture', 'pattern')
    AND content NOT LIKE '%migration%'
    AND content NOT LIKE '%schema%'
    AND content NOT LIKE '%config%'
  `;
  console.log("4. Short architecture/pattern memories deleted:", (shortResult as any).count);
  totalDeleted += (shortResult as any).count;

  // 5. Delete bare git command memories
  const gitResult = await sql`
    DELETE FROM memories
    WHERE content IN ('Ran command: git push', 'Ran command: git pull', 'Ran command: git status')
    OR (content LIKE 'Ran command: git add%' AND length(content) < 50)
    OR (content LIKE 'Ran command: git commit%' AND length(content) < 60)
  `;
  console.log("5. Bare git command memories deleted:", (gitResult as any).count);
  totalDeleted += (gitResult as any).count;

  // 6. Delete Playwright/MCP failure noise
  const mcpResult = await sql`
    DELETE FROM memories
    WHERE content LIKE '%mcp__plugin_playwright%' AND category = 'solution'
  `;
  console.log("6. Playwright MCP noise deleted:", (mcpResult as any).count);
  totalDeleted += (mcpResult as any).count;

  // 7. Delete pencil MCP noise
  const pencilResult = await sql`
    DELETE FROM memories
    WHERE content LIKE '%mcp__pencil%' AND category = 'solution'
  `;
  console.log("7. Pencil MCP noise deleted:", (pencilResult as any).count);
  totalDeleted += (pencilResult as any).count;

  // 8. Clean up orphaned tags and relations
  const tagResult = await sql`
    DELETE FROM memory_tags WHERE memory_id NOT IN (SELECT id FROM memories)
  `;
  console.log("8. Orphaned tags deleted:", (tagResult as any).count);

  const relResult = await sql`
    DELETE FROM memory_relations
    WHERE source_id NOT IN (SELECT id FROM memories) OR target_id NOT IN (SELECT id FROM memories)
  `;
  console.log("9. Orphaned relations deleted:", (relResult as any).count);

  // Final stats
  const [mc] = (await sql`SELECT count(*) as c FROM memories`) as any[];
  console.log("\n=== RESULTS ===");
  console.log("Total deleted:", totalDeleted);
  console.log("Remaining memories:", mc.c);

  const cats = await sql`SELECT category, count(*) as c FROM memories GROUP BY category ORDER BY c DESC`;
  console.log("\nCategory distribution:");
  for (const c of cats as any[]) console.log(`  ${c.category}: ${c.c}`);

  // Sample remaining preferences
  const prefs = await sql`SELECT content FROM memories WHERE category = 'preference' ORDER BY importance DESC LIMIT 10`;
  console.log("\nTop preferences (sample):");
  for (const p of prefs as any[]) console.log(`  - ${p.content}`);
}

main().catch((e) => {
  console.error("Cleanup failed:", e.message);
  process.exit(1);
});
