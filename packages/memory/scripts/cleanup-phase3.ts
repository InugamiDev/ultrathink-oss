// intent: Final cleanup — nuke remaining garbage, keep only genuinely useful memories
import { neon } from "@neondatabase/serverless";
import * as dotenv from "dotenv";
import { resolve } from "path";

dotenv.config({ path: resolve(import.meta.dirname!, "../../.env") });
const sql = neon(process.env.DATABASE_URL!);

async function main() {
  // 1. Archive ALL identity-extract — these are regex false positives from Claude's own output
  const ie = await sql`
    UPDATE memories SET is_archived = true, updated_at = NOW()
    WHERE is_archived = false AND source = 'identity-extract'
    RETURNING id
  `;
  console.log("Archived identity-extract (all false positives):", ie.length);

  // 2. Archive ALL session-end summaries — these are just auto-memory dumps, not real insights
  const se = await sql`
    UPDATE memories SET is_archived = true, updated_at = NOW()
    WHERE is_archived = false AND source = 'session-end'
    RETURNING id
  `;
  console.log("Archived session-end summaries:", se.length);

  // 3. Archive remaining benchmark test memories
  const bm = await sql`
    UPDATE memories SET is_archived = true, updated_at = NOW()
    WHERE is_archived = false
    AND (content ILIKE '%benchmark%' OR content ILIKE '%duplicate detection test%')
    RETURNING id
  `;
  console.log("Archived benchmark leftovers:", bm.length);

  // 4. Deactivate module-not-found Tekiō (stale, project-specific, not useful globally)
  const moduleTekio = await sql`
    UPDATE adaptations SET is_active = false
    WHERE is_active = true
    AND trigger_pattern ILIKE '%module not found%'
    RETURNING id, trigger_pattern
  `;
  console.log("Deactivated module-not-found Tekiō:", moduleTekio.length);

  // 5. Final state
  const remaining = await sql`
    SELECT id, source, category, importance, confidence, content
    FROM memories WHERE is_archived = false ORDER BY importance DESC
  `;
  console.log("\n=== FINAL SURVIVING MEMORIES (" + remaining.length + ") ===");
  for (const m of remaining) {
    console.log(`  [${m.importance}] ${m.source}/${m.category}: ${String(m.content).substring(0, 150)}`);
  }

  const tekio = await sql`
    SELECT category, trigger_pattern, adaptation_rule, times_applied
    FROM adaptations WHERE is_active = true ORDER BY times_applied DESC
  `;
  console.log("\n=== FINAL SURVIVING TEKIŌ (" + tekio.length + ") ===");
  for (const t of tekio) {
    console.log(`  [${t.category}] applied=${t.times_applied}: ${String(t.trigger_pattern).substring(0, 80)}`);
    console.log(`    → ${String(t.adaptation_rule).substring(0, 120)}`);
  }
}

main().catch(console.error);
