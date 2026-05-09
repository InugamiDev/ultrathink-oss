// intent: Deep clean — archive remaining junk, deactivate useless Tekiō
// status: one-time cleanup script, phase 2
import { neon } from "@neondatabase/serverless";
import * as dotenv from "dotenv";
import { resolve } from "path";

dotenv.config({ path: resolve(import.meta.dirname!, "../../.env") });
const sql = neon(process.env.DATABASE_URL!);

async function main() {
  // 1. Archive garbage identity-extract entries (extracted from Claude's own output, not user prefs)
  const identityExtractJunk = await sql`
    UPDATE memories SET is_archived = true, updated_at = NOW()
    WHERE is_archived = false AND source = 'identity-extract'
    AND (
      content ILIKE '%from the incoming%'
      OR content ILIKE '%webhook payload%'
      OR content ILIKE '%task-notification%'
      OR content ILIKE '%toolu_%'
      OR length(content) < 25
    )
    RETURNING id, LEFT(content, 60) as preview
  `;
  console.log("Archived identity-extract junk:", identityExtractJunk.length);

  // 2. Archive correction-detect entries that are raw XML/task notifications
  const correctionJunk = await sql`
    UPDATE memories SET is_archived = true, updated_at = NOW()
    WHERE is_archived = false AND source = 'correction-detect'
    AND (
      content LIKE '%<task-%'
      OR content LIKE '%<tool-use-id>%'
      OR content LIKE '%task-notification%'
    )
    RETURNING id
  `;
  console.log("Archived correction-detect junk:", correctionJunk.length);

  // 3. Archive test/verification memories
  const testJunk = await sql`
    UPDATE memories SET is_archived = true, updated_at = NOW()
    WHERE is_archived = false
    AND (
      content ILIKE '%test memory%'
      OR content ILIKE '%verification test%'
      OR content ILIKE '%end hook test%'
      OR content ILIKE '%flush pipeline%'
    )
    RETURNING id, LEFT(content, 60) as preview
  `;
  console.log("Archived test memories:", testJunk.length);

  // 4. Deduplicate "Working on X" entries — keep only one per project
  const projectDupes = await sql`
    WITH ranked AS (
      SELECT id, content,
        REGEXP_REPLACE(content, '^Working on ', '') as project_name,
        ROW_NUMBER() OVER (
          PARTITION BY REGEXP_REPLACE(content, '^Working on .*', REGEXP_REPLACE(content, '^Working on ([^:]+).*', '\\1'))
          ORDER BY importance DESC, created_at DESC
        ) as rn
      FROM memories
      WHERE is_archived = false
      AND content LIKE 'Working on %'
    )
    SELECT id, content FROM ranked WHERE rn > 1
  `;
  console.log("Project duplicates found:", projectDupes.length);

  // 5. Deactivate Tekiō adaptations that are generic "verify preconditions" copypasta
  const genericTekio = await sql`
    UPDATE adaptations SET is_active = false
    WHERE is_active = true
    AND adaptation_rule ILIKE '%verify preconditions before this operation%'
    AND times_prevented = 0
    RETURNING id, LEFT(trigger_pattern, 80) as trigger
  `;
  console.log("\nDeactivated generic Tekiō:", genericTekio.length);
  for (const t of genericTekio) console.log("  -", t.trigger);

  // 6. Deactivate Tekiō adaptations with 0 applications and 0 preventions (never useful)
  const deadTekio = await sql`
    UPDATE adaptations SET is_active = false
    WHERE is_active = true
    AND times_applied = 0
    AND times_prevented = 0
    AND created_at < NOW() - INTERVAL '7 days'
    RETURNING id, category, LEFT(trigger_pattern, 80) as trigger
  `;
  console.log("Deactivated dead Tekiō (0 applied, 0 prevented):", deadTekio.length);
  for (const t of deadTekio) console.log(`  [${t.category}] ${t.trigger}`);

  // 7. Final count
  const remaining = await sql`
    SELECT source, COUNT(*) as cnt FROM memories WHERE is_archived = false GROUP BY source ORDER BY cnt DESC
  `;
  console.log("\n=== FINAL CLEAN MEMORIES ===");
  let total = 0;
  for (const r of remaining) {
    console.log("  " + String(r.source).padEnd(25) + r.cnt);
    total += Number(r.cnt);
  }
  console.log("  TOTAL:", total);

  // 8. Show all remaining memories content
  const allRemaining = await sql`
    SELECT id, source, category, importance, confidence, content
    FROM memories WHERE is_archived = false ORDER BY source, importance DESC
  `;
  console.log("\n=== ALL SURVIVING MEMORIES ===");
  for (const m of allRemaining) {
    console.log(`\n  [${m.importance}/${m.confidence}] ${m.source}/${m.category}`);
    console.log(`  ${String(m.content).substring(0, 200)}`);
  }

  // 9. Show surviving Tekiō
  const tekio = await sql`
    SELECT category, trigger_pattern, adaptation_rule, times_applied, times_prevented
    FROM adaptations WHERE is_active = true ORDER BY times_applied DESC
  `;
  console.log("\n=== SURVIVING TEKIŌ (" + tekio.length + ") ===");
  for (const t of tekio) {
    console.log(`  [${t.category}] applied=${t.times_applied} prevented=${t.times_prevented}`);
    console.log(`    ${String(t.trigger_pattern).substring(0, 100)}`);
  }
}

main().catch(console.error);
