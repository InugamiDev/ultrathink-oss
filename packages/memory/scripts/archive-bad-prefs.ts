#!/usr/bin/env npx tsx
import { config } from "dotenv";
import { resolve, join } from "path";
config({ path: join(resolve(import.meta.dirname || ".", ".."), "..", ".env") });
import { getClient } from "../src/client.js";
const sql = getClient();

// Archive clearly mis-extracted identity preferences
const badPatterns = [
  "oversell unrealistic",
  "overpromise",
  "claim exact body measurement",
  "matches `'system_admin'`",
  "be reached** through the normal",
  "used by any app",
  "Turbo's build caching",
];

let archived = 0;
for (const pattern of badPatterns) {
  const rows = await sql`
    SELECT id, content FROM memories
    WHERE is_archived = false
      AND content LIKE ${"%" + pattern + "%"}
  `;
  for (const r of rows) {
    console.log(`Archiving: ${r.content.slice(0, 80)}`);
    await sql`UPDATE memories SET is_archived = true WHERE id = ${r.id}`;
    archived++;
  }
}

// Also archive "Modified X" entries with auto-memory source that aren't architecture
const autoNoise = await sql`
  SELECT COUNT(*) as c FROM memories
  WHERE is_archived = false
    AND source = 'auto-memory-edit'
    AND importance <= 5
    AND category NOT IN ('architecture', 'decision')
`;
console.log(`\nAuto-edit noise (imp<=5, non-architecture): ${autoNoise[0].c}`);
if (Number(autoNoise[0].c) > 0) {
  await sql`
    UPDATE memories SET is_archived = true, updated_at = NOW()
    WHERE is_archived = false
      AND source = 'auto-memory-edit'
      AND importance <= 5
      AND category NOT IN ('architecture', 'decision')
  `;
  console.log(`  Archived`);
}

console.log(`\nArchived ${archived} bad preferences`);
const [a] = await sql`SELECT COUNT(*) as c FROM memories WHERE is_archived = false`;
const [ar] = await sql`SELECT COUNT(*) as c FROM memories WHERE is_archived = true`;
console.log(`Final: ${a.c} active, ${ar.c} archived`);
process.exit(0);
