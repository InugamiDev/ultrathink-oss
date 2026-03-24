#!/usr/bin/env npx tsx
/**
 * Archive noise memories — "Modified X", "Edited X", etc.
 * These were created before auto-save noise reduction was added.
 */
import { config } from "dotenv";
import { resolve, join } from "path";

const root = resolve(import.meta.dirname || ".", "..", "..");
config({ path: join(root, ".env") });

import { getClient } from "../src/client.js";

const sql = getClient();

console.log("Memory Quality Pass — Archive Noise");
console.log("====================================\n");

// Count noise patterns
const patterns = [
  "Modified %",
  "Edited %",
  "Updated %",
  "Changed %",
  "Created %",
  "Added %",
  "Removed %",
  "Deleted %",
  "Fixed %",
  "Moved %",
  "Renamed %",
];

// Find memories that are just "Modified Button.tsx" style — short, no useful context
const [totalCount] = await sql`
  SELECT COUNT(*) as c FROM memories
  WHERE is_archived = false
    AND LENGTH(content) < 80
    AND (
      content LIKE 'Modified %'
      OR content LIKE 'Edited %'
      OR content LIKE 'Updated %'
      OR content LIKE 'Changed %'
      OR content LIKE 'Created %'
      OR content LIKE 'Added %'
      OR content LIKE 'Removed %'
      OR content LIKE 'Deleted %'
      OR content LIKE 'Fixed %'
      OR content LIKE 'Moved %'
      OR content LIKE 'Renamed %'
    )
`;

console.log(`Found ${totalCount.c} noise memories to archive.\n`);

// Show some examples
const examples = await sql`
  SELECT id, content, importance, category FROM memories
  WHERE is_archived = false
    AND LENGTH(content) < 80
    AND (
      content LIKE 'Modified %'
      OR content LIKE 'Edited %'
      OR content LIKE 'Updated %'
      OR content LIKE 'Changed %'
      OR content LIKE 'Created %'
      OR content LIKE 'Added %'
      OR content LIKE 'Removed %'
      OR content LIKE 'Deleted %'
      OR content LIKE 'Fixed %'
      OR content LIKE 'Moved %'
      OR content LIKE 'Renamed %'
    )
  LIMIT 10
`;

console.log("Sample entries:");
for (const e of examples) {
  console.log(`  [${e.importance}] ${e.content}`);
}
console.log();

// Archive them
const result = await sql`
  UPDATE memories SET is_archived = true, updated_at = NOW()
  WHERE is_archived = false
    AND LENGTH(content) < 80
    AND (
      content LIKE 'Modified %'
      OR content LIKE 'Edited %'
      OR content LIKE 'Updated %'
      OR content LIKE 'Changed %'
      OR content LIKE 'Created %'
      OR content LIKE 'Added %'
      OR content LIKE 'Removed %'
      OR content LIKE 'Deleted %'
      OR content LIKE 'Fixed %'
      OR content LIKE 'Moved %'
      OR content LIKE 'Renamed %'
    )
`;

console.log(`Archived ${result.count} noise memories.`);

// Also archive very low importance memories with no useful content
const [lowCount] = await sql`
  SELECT COUNT(*) as c FROM memories
  WHERE is_archived = false
    AND importance <= 2
    AND LENGTH(content) < 60
    AND access_count = 0
`;

console.log(`\nFound ${lowCount.c} low-importance (<= 2), short, never-accessed memories.`);

if (Number(lowCount.c) > 0) {
  const lowResult = await sql`
    UPDATE memories SET is_archived = true, updated_at = NOW()
    WHERE is_archived = false
      AND importance <= 2
      AND LENGTH(content) < 60
      AND access_count = 0
  `;
  console.log(`Archived ${lowResult.count} low-quality memories.`);
}

// Final stats
const [active] = await sql`SELECT COUNT(*) as c FROM memories WHERE is_archived = false`;
const [archived] = await sql`SELECT COUNT(*) as c FROM memories WHERE is_archived = true`;

console.log(`\nFinal: ${active.c} active, ${archived.c} archived.`);
process.exit(0);
