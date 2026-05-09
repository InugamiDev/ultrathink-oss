// intent: Archive all junk memories and clean up Tekiō adaptations
// status: one-time cleanup script
import { neon } from "@neondatabase/serverless";
import * as dotenv from "dotenv";
import { resolve } from "path";

dotenv.config({ path: resolve(import.meta.dirname!, "../../.env") });
const sql = neon(process.env.DATABASE_URL!);

async function main() {
  // 1. Archive junk auto-memories
  const archived = await sql`
    UPDATE memories
    SET is_archived = true, updated_at = NOW()
    WHERE is_archived = false
    AND source IN (
      'auto-memory-edit',
      'auto-memory-bash',
      'auto-memory-write',
      'tool-failure-log'
    )
    RETURNING id
  `;
  console.log("Archived auto-junk:", archived.length);

  // 2. Archive duplicate/low-value identity-graph entries
  const identityJunk = await sql`
    UPDATE memories
    SET is_archived = true, updated_at = NOW()
    WHERE is_archived = false
    AND source = 'identity-graph'
    AND (
      content LIKE '%Modified %'
      OR content LIKE '%Ran command%'
      OR content LIKE '%file edit%'
      OR length(content) < 20
    )
    RETURNING id
  `;
  console.log("Archived identity junk:", identityJunk.length);

  // 3. Deduplicate identity-graph: keep highest importance per unique content prefix
  const identityDupes = await sql`
    WITH ranked AS (
      SELECT id, content,
        LEFT(LOWER(TRIM(content)), 80) as content_key,
        ROW_NUMBER() OVER (
          PARTITION BY LEFT(LOWER(TRIM(content)), 80)
          ORDER BY importance DESC, created_at DESC
        ) as rn
      FROM memories
      WHERE is_archived = false AND source IN ('identity-graph', 'identity-extract')
    )
    UPDATE memories SET is_archived = true, updated_at = NOW()
    WHERE id IN (SELECT id FROM ranked WHERE rn > 1)
    RETURNING id
  `;
  console.log("Archived identity duplicates:", identityDupes.length);

  // 4. Archive generic Tekiō adaptations (correct column names: trigger_pattern, adaptation_rule)
  const tekioJunk = await sql`
    UPDATE adaptations
    SET is_active = false
    WHERE is_active = true
    AND (
      trigger_pattern ILIKE '%verify preconditions%'
      OR trigger_pattern ILIKE '%check before%'
      OR trigger_pattern ILIKE '%always validate%'
      OR trigger_pattern ILIKE '%ensure%before%'
      OR (LENGTH(trigger_pattern) < 15 AND LENGTH(adaptation_rule) < 30)
    )
    RETURNING id, trigger_pattern
  `;
  console.log("\nDeactivated generic Tekiō:", tekioJunk.length);
  for (const t of tekioJunk) {
    console.log("  -", t.trigger_pattern?.substring(0, 60));
  }

  // 5. Show what's left
  const remaining = await sql`
    SELECT source, COUNT(*) as cnt
    FROM memories
    WHERE is_archived = false
    GROUP BY source
    ORDER BY cnt DESC
  `;
  console.log("\n=== REMAINING CLEAN MEMORIES ===");
  let total = 0;
  for (const r of remaining) {
    console.log("  " + String(r.source).padEnd(25) + r.cnt);
    total += Number(r.cnt);
  }
  console.log("  TOTAL:", total);

  // 6. Show remaining Tekiō
  const tekioLeft = await sql`
    SELECT category, COUNT(*) as cnt
    FROM adaptations
    WHERE is_active = true
    GROUP BY category
    ORDER BY cnt DESC
  `;
  console.log("\n=== REMAINING TEKIŌ ===");
  for (const t of tekioLeft) {
    console.log("  " + String(t.category).padEnd(15) + t.cnt);
  }

  // 6b. Show ALL Tekiō adaptations
  const allTekio = await sql`
    SELECT id, category, trigger_pattern, adaptation_rule, times_applied, times_prevented, scope
    FROM adaptations WHERE is_active = true ORDER BY category, times_applied DESC
  `;
  console.log("\n=== ALL ACTIVE TEKIŌ ADAPTATIONS ===");
  for (const t of allTekio) {
    console.log(
      `  [${t.category}] applied=${t.times_applied} prevented=${t.times_prevented} scope=${t.scope || "global"}`
    );
    console.log(`    trigger: ${String(t.trigger_pattern).substring(0, 100)}`);
    console.log(`    rule: ${String(t.adaptation_rule).substring(0, 100)}`);
  }

  // 7. Show sample of remaining memories
  const sample = await sql`
    SELECT id, source, category, importance, LEFT(content, 100) as preview
    FROM memories
    WHERE is_archived = false
    ORDER BY importance DESC
    LIMIT 20
  `;
  console.log("\n=== TOP 20 REMAINING (by importance) ===");
  for (const m of sample) {
    console.log(`  [${m.importance}] ${m.source}/${m.category}: ${m.preview}`);
  }
}

main().catch(console.error);
