// intent: Backfill wing/hall/layer on surviving memories that are missing them
import { neon } from "@neondatabase/serverless";
import * as dotenv from "dotenv";
import { resolve } from "path";

dotenv.config({ path: resolve(import.meta.dirname!, "../../.env") });
const sql = neon(process.env.DATABASE_URL!);

async function main() {
  // Backfill identity-graph memories
  const identity = await sql`
    UPDATE memories SET
      wing = CASE
        WHEN category IN ('identity') THEN 'identity'
        WHEN category IN ('tool-preference', 'style-preference', 'preference', 'workflow-pattern') THEN 'identity'
        WHEN category IN ('project-context') THEN 'project'
        ELSE 'identity'
      END,
      hall = CASE
        WHEN category = 'identity' THEN 'core'
        WHEN category = 'tool-preference' THEN 'tools'
        WHEN category = 'style-preference' THEN 'style'
        WHEN category = 'preference' THEN 'preference'
        WHEN category = 'project-context' THEN 'context'
        ELSE category
      END,
      layer = CASE
        WHEN category = 'identity' THEN 0
        WHEN category IN ('tool-preference', 'style-preference', 'preference') THEN 0
        WHEN category = 'project-context' THEN 2
        ELSE 1
      END,
      token_estimate = GREATEST(1, LENGTH(content) / 4)
    WHERE is_archived = false AND wing IS NULL
    RETURNING id, wing, hall, layer, LEFT(content, 50) as preview
  `;
  console.log("Backfilled:", identity.length);
  for (const m of identity) {
    console.log(`  ${m.wing}/${m.hall} L${m.layer}: ${m.preview}`);
  }

  // Show final state
  const all = await sql`
    SELECT wing, hall, layer, COUNT(*) as cnt
    FROM memories WHERE is_archived = false
    GROUP BY wing, hall, layer ORDER BY wing, hall, layer
  `;
  console.log("\n=== FINAL WING/HALL/LAYER DISTRIBUTION ===");
  for (const r of all) {
    console.log(`  ${r.wing}/${r.hall} L${r.layer}: ${r.cnt}`);
  }
}

main().catch(console.error);
