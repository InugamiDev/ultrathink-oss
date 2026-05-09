#!/usr/bin/env npx tsx
/**
 * audit-quality.ts — Data quality audit for UltraThink memory database.
 * Run: npx tsx memory/scripts/audit-quality.ts
 */

import { config } from "dotenv";
import { resolve } from "path";
import { getClient } from "../src/client.js";

// Load .env from project root
config({ path: resolve(import.meta.dirname, "../../.env") });

async function main() {
  const sql = getClient();

  const divider = "═".repeat(70);
  const header = (title: string) => console.log(`\n${divider}\n  ${title}\n${divider}`);

  // ──────────────────────────────────────────────────────────────────
  // 1. Active memories by category
  // ──────────────────────────────────────────────────────────────────
  header("1. ACTIVE MEMORIES BY CATEGORY");
  const byCat = await sql`
    SELECT category, count(*) as cnt
    FROM memories
    WHERE is_archived = false
    GROUP BY category
    ORDER BY cnt DESC
  `;
  for (const r of byCat) console.log(`  ${r.category.padEnd(30)} ${r.cnt}`);
  const totalActive = byCat.reduce((s, r) => s + Number(r.cnt), 0);
  console.log(`  ${"TOTAL".padEnd(30)} ${totalActive}`);

  // ──────────────────────────────────────────────────────────────────
  // 2. Short memories (< 30 chars) — likely junk
  // ──────────────────────────────────────────────────────────────────
  header("2. SHORT MEMORIES (content < 30 chars)");
  const short = await sql`
    SELECT id, content, category, wing, importance, created_at
    FROM memories
    WHERE is_archived = false AND length(content) < 30
    ORDER BY length(content) ASC
  `;
  if (short.length === 0) {
    console.log("  None found — good!");
  } else {
    console.log(`  Found ${short.length} short memories:`);
    for (const r of short) {
      console.log(`  [${r.category}] "${r.content}" (wing=${r.wing}, imp=${r.importance})`);
    }
  }

  // ──────────────────────────────────────────────────────────────────
  // 3. Duplicate / near-duplicate (same first 50 chars)
  // ──────────────────────────────────────────────────────────────────
  header("3. DUPLICATE MEMORIES (same first 50 chars)");
  const dupes = await sql`
    SELECT left(content, 50) as prefix, count(*) as cnt,
           array_agg(id::text) as ids
    FROM memories
    WHERE is_archived = false
    GROUP BY left(content, 50)
    HAVING count(*) > 1
    ORDER BY cnt DESC
    LIMIT 20
  `;
  if (dupes.length === 0) {
    console.log("  No duplicates found — good!");
  } else {
    console.log(`  Found ${dupes.length} duplicate groups:`);
    for (const r of dupes) {
      console.log(`  [${r.cnt}x] "${r.prefix}..." (ids: ${r.ids.slice(0, 3).join(", ")})`);
    }
  }

  // ──────────────────────────────────────────────────────────────────
  // 4. Memories with null wing/hall (unmigrated)
  // ──────────────────────────────────────────────────────────────────
  header("4. UNMIGRATED MEMORIES (null wing or hall)");
  const nullWing = await sql`
    SELECT count(*) as cnt FROM memories
    WHERE is_archived = false AND (wing IS NULL OR hall IS NULL)
  `;
  console.log(`  Null wing/hall: ${nullWing[0].cnt}`);
  if (Number(nullWing[0].cnt) > 0) {
    const samples = await sql`
      SELECT id, category, content, wing, hall FROM memories
      WHERE is_archived = false AND (wing IS NULL OR hall IS NULL)
      LIMIT 5
    `;
    for (const r of samples) {
      console.log(`  [${r.category}] wing=${r.wing} hall=${r.hall} — "${r.content.slice(0, 60)}..."`);
    }
  }

  // ──────────────────────────────────────────────────────────────────
  // 5. Memories by source
  // ──────────────────────────────────────────────────────────────────
  header("5. MEMORIES BY SOURCE");
  const bySource = await sql`
    SELECT coalesce(source, '(null)') as src, count(*) as cnt
    FROM memories
    WHERE is_archived = false
    GROUP BY source
    ORDER BY cnt DESC
  `;
  for (const r of bySource) console.log(`  ${String(r.src).padEnd(35)} ${r.cnt}`);

  // ──────────────────────────────────────────────────────────────────
  // 6. 10 random memories — quality check
  // ──────────────────────────────────────────────────────────────────
  header("6. RANDOM SAMPLE (10 memories)");
  const sample = await sql`
    SELECT content, category, wing, hall, importance, source, created_at
    FROM memories
    WHERE is_archived = false
    ORDER BY random()
    LIMIT 10
  `;
  for (let i = 0; i < sample.length; i++) {
    const r = sample[i];
    console.log(
      `\n  [${i + 1}] category=${r.category} wing=${r.wing} hall=${r.hall} imp=${r.importance} source=${r.source}`
    );
    console.log(`      created=${r.created_at}`);
    console.log(`      "${r.content.slice(0, 200)}${r.content.length > 200 ? "..." : ""}"`);
  }

  // ──────────────────────────────────────────────────────────────────
  // 7. Sessions table health
  // ──────────────────────────────────────────────────────────────────
  header("7. SESSIONS TABLE");
  const sess = await sql`
    SELECT count(*) as cnt, max(started_at) as last_session FROM sessions
  `;
  console.log(`  Total sessions: ${sess[0].cnt}`);
  console.log(`  Last session:   ${sess[0].last_session}`);

  // ──────────────────────────────────────────────────────────────────
  // 8. Adaptations / Tekiō state
  // ──────────────────────────────────────────────────────────────────
  header("8. ADAPTATIONS (Tekiō)");
  const adapt = await sql`
    SELECT category, count(*) as cnt
    FROM adaptations
    WHERE is_active = true
    GROUP BY category
    ORDER BY cnt DESC
  `;
  if (adapt.length === 0) {
    console.log("  No active adaptations found.");
  } else {
    for (const r of adapt) console.log(`  ${r.category.padEnd(20)} ${r.cnt}`);
  }
  const adaptTotal = await sql`
    SELECT
      count(*) FILTER (WHERE is_active = true) as active,
      count(*) FILTER (WHERE is_active = false) as inactive,
      count(*) as total
    FROM adaptations
  `;
  console.log(
    `  Active: ${adaptTotal[0].active} | Inactive: ${adaptTotal[0].inactive} | Total: ${adaptTotal[0].total}`
  );

  // ──────────────────────────────────────────────────────────────────
  // 9. Auto-generated junk patterns
  // ──────────────────────────────────────────────────────────────────
  header("9. POTENTIAL AUTO-GENERATED JUNK");
  const patterns = [
    { label: 'Starts with "Modified"', pat: "Modified%" },
    { label: 'Starts with "Working on"', pat: "Working on%" },
    { label: 'Starts with "Uses"', pat: "Uses%" },
    { label: 'Starts with "Updated"', pat: "Updated%" },
    { label: 'Starts with "Added"', pat: "Added%" },
    { label: 'Starts with "Created"', pat: "Created%" },
    { label: 'Starts with "Fixed"', pat: "Fixed%" },
    { label: 'Starts with "The "', pat: "The %" },
    { label: 'Starts with "This "', pat: "This %" },
  ];
  for (const p of patterns) {
    const res = await sql`
      SELECT count(*) as cnt FROM memories
      WHERE is_archived = false AND content LIKE ${p.pat}
    `;
    console.log(`  ${p.label.padEnd(35)} ${res[0].cnt}`);
  }

  // ──────────────────────────────────────────────────────────────────
  // 10. DB size: active vs archived vs total
  // ──────────────────────────────────────────────────────────────────
  header("10. DATABASE SIZE");
  const sizes = await sql`
    SELECT
      count(*) FILTER (WHERE is_archived = false) as active,
      count(*) FILTER (WHERE is_archived = true) as archived,
      count(*) FILTER (WHERE is_compacted = true) as compacted,
      count(*) as total
    FROM memories
  `;
  console.log(`  Active:    ${sizes[0].active}`);
  console.log(`  Archived:  ${sizes[0].archived}`);
  console.log(`  Compacted: ${sizes[0].compacted}`);
  console.log(`  Total:     ${sizes[0].total}`);

  // Wing distribution for active
  const byWing = await sql`
    SELECT coalesce(wing, '(null)') as wing, count(*) as cnt
    FROM memories
    WHERE is_archived = false
    GROUP BY wing
    ORDER BY cnt DESC
  `;
  console.log("\n  Active by wing:");
  for (const r of byWing) console.log(`    ${String(r.wing).padEnd(20)} ${r.cnt}`);

  // Layer distribution for active
  const byLayer = await sql`
    SELECT coalesce(layer::text, '(null)') as layer, count(*) as cnt
    FROM memories
    WHERE is_archived = false
    GROUP BY layer
    ORDER BY layer
  `;
  console.log("\n  Active by layer:");
  for (const r of byLayer) console.log(`    L${r.layer}  ${r.cnt}`);

  console.log(`\n${divider}\n  AUDIT COMPLETE\n${divider}\n`);
}

main().catch((err) => {
  console.error("Audit failed:", err);
  process.exit(1);
});
