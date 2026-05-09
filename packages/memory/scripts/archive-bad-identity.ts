#!/usr/bin/env npx tsx
import { config } from "dotenv";
import { resolve, join } from "path";
config({ path: join(resolve(import.meta.dirname || ".", ".."), "..", ".env") });
import { getClient } from "../src/client.js";
const sql = getClient();

// Archive all identity-extracted "preferences" that are actually Claude's own instructions
// These were mis-extracted from conversation context
const rows = await sql`
  SELECT id, content, importance FROM memories
  WHERE is_archived = false
    AND source = 'identity-extract'
    AND category = 'preference'
`;

console.log(`Found ${rows.length} identity-extracted preferences`);

// Keep only ones that look like real user preferences
// Real ones: short, about tools/style/workflow, not code instructions
const keepers: string[] = [];
const archived: string[] = [];

for (const r of rows) {
  const c = r.content as string;
  const isReal =
    c.length < 80 &&
    !c.includes("validate") &&
    !c.includes("verify") &&
    !c.includes("evaluate") &&
    !c.includes("recommend") &&
    !c.includes("merge") &&
    !c.includes("appear in") &&
    !c.includes("make it look") &&
    !c.includes("give vague") &&
    !c.includes("airdrop") &&
    !c.includes("pitch deck") &&
    !c.includes("request time") &&
    !c.includes("Server Component") &&
    !c.includes("assume perfect") &&
    !c.includes("setTimeout") &&
    !c.includes("import from") &&
    !c.includes("template") &&
    !c.includes("logging the full") &&
    !c.includes("frontend permissions") &&
    !c.includes("frontend UI plans") &&
    !c.includes("0000_grey") &&
    !c.includes("reduced-motion") &&
    // Keep actual preference-sounding ones
    (c.includes("stock photo") ||
      c.includes("paragraph") ||
      c.includes("dark mode") ||
      c.includes("snake_case") ||
      c.includes("camelCase") ||
      c.includes("server-side session") ||
      c.includes("structured") ||
      c.includes("concise") ||
      c.includes("short") ||
      c.includes("minimal"));

  if (isReal) {
    keepers.push(c.slice(0, 80));
  } else {
    archived.push(c.slice(0, 80));
    await sql`UPDATE memories SET is_archived = true WHERE id = ${r.id}`;
  }
}

console.log(`\nKept ${keepers.length}:`);
for (const k of keepers) console.log(`  ✓ ${k}`);

console.log(`\nArchived ${archived.length}:`);
for (const a of archived.slice(0, 10)) console.log(`  ✗ ${a}`);
if (archived.length > 10) console.log(`  ... and ${archived.length - 10} more`);

// Also archive "Avoids" identity-extracted that are clearly code context
const avoids = await sql`
  SELECT id, content FROM memories
  WHERE is_archived = false
    AND source = 'identity-extract'
    AND content LIKE 'Avoids %'
    AND (
      content LIKE '%import%'
      OR content LIKE '%Info%Expected%'
      OR content LIKE '%template%'
      OR content LIKE '%logging%'
      OR content LIKE '%docker%'
      OR content LIKE '%frontend%permission%'
    )
`;
for (const a of avoids) {
  console.log(`Archiving avoid: ${(a.content as string).slice(0, 80)}`);
  await sql`UPDATE memories SET is_archived = true WHERE id = ${a.id}`;
}

const [active] = await sql`SELECT COUNT(*) as c FROM memories WHERE is_archived = false`;
const [arch] = await sql`SELECT COUNT(*) as c FROM memories WHERE is_archived = true`;
console.log(`\nFinal: ${active.c} active, ${arch.c} archived`);
process.exit(0);
