// intent: Full vault rebuild — export ALL surviving memories (no time filter)
import { neon } from "@neondatabase/serverless";
import * as dotenv from "dotenv";
import { resolve, join } from "path";
import { writeFileSync, mkdirSync } from "fs";
import { createHash } from "crypto";

dotenv.config({ path: resolve(import.meta.dirname!, "../../.env") });
const sql = neon(process.env.DATABASE_URL!);

const VAULT_ROOT = resolve(process.env.HOME!, ".ultrathink/vault");

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
}

async function main() {
  const memories = await sql`
    SELECT m.*, array_agg(mt.tag) FILTER (WHERE mt.tag IS NOT NULL) as tags
    FROM memories m
    LEFT JOIN memory_tags mt ON m.id = mt.memory_id
    WHERE m.is_archived = false
    GROUP BY m.id
    ORDER BY m.wing, m.hall, m.importance DESC
  `;

  console.log(`Found ${memories.length} memories to export`);

  for (const m of memories) {
    const wing = m.wing || "project";
    const hall = m.hall || m.category || "note";
    const content = m.content as string;
    const id = m.id as string;

    const dir = join(VAULT_ROOT, wing, hall);
    mkdirSync(dir, { recursive: true });

    const slug = slugify(content.slice(0, 60)) || id.slice(0, 8);
    const filepath = join(dir, `${slug}.md`);

    const tags = Array.isArray(m.tags) ? m.tags.filter(Boolean) : [];
    const frontmatter = [
      "---",
      `id: "${id}"`,
      `wing: ${wing}`,
      `hall: ${hall}`,
      m.room ? `room: ${m.room}` : null,
      `category: ${m.category}`,
      `importance: ${m.importance}`,
      `confidence: ${m.confidence}`,
      `scope: ${m.scope || "global"}`,
      `source: ${m.source}`,
      `layer: ${m.layer ?? 2}`,
      tags.length > 0 ? `tags: [${tags.map((t: string) => `"${t}"`).join(", ")}]` : null,
      `created: ${new Date(m.created_at as string).toISOString()}`,
      `updated: ${new Date(m.updated_at as string).toISOString()}`,
      `synced: ${new Date().toISOString()}`,
      "---",
    ]
      .filter(Boolean)
      .join("\n");

    writeFileSync(filepath, `${frontmatter}\n\n${content}\n`);
    console.log(`  ${wing}/${hall}: ${slug}`);
  }

  console.log(`\nExported ${memories.length} memories to vault`);
}

main().catch(console.error);
