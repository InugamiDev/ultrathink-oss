// intent: Create Zettelkasten relations between clean memories
// status: done
// confidence: high

import { config } from "dotenv";
import { resolve } from "path";
config({
  path: resolve(import.meta.dirname || ".", "..", "..", ".env"),
});

async function main() {
  const { getClient } = await import("../src/client.js");
  const sql = getClient();

  const mems =
    (await sql`SELECT id, title, wing, hall FROM memories WHERE is_archived = false AND title IS NOT NULL`) as {
      id: string;
      title: string;
      wing: string;
      hall: string;
    }[];
  const byTitle = new Map<string, string>();
  for (const m of mems) byTitle.set(m.title, m.id);

  const relations: { src: string; tgt: string; type: string }[] = [];

  // Agent identity → user profile
  relations.push({
    src: "UltraThink Agent Identity",
    tgt: "User Identity",
    type: "applies-to",
  });

  // Stack preferences → Project ultrathink
  for (const s of ["Stack: React + Next.js", "Stack: TypeScript Strict", "Stack: Node.js", "Stack: Shell Scripting"]) {
    relations.push({ src: s, tgt: "Project: ultrathink", type: "supports" });
  }

  // Tailwind supports ultrathink
  relations.push({
    src: "Pref: Tailwind CSS v4",
    tgt: "Project: ultrathink",
    type: "supports",
  });

  // App Router applies to Next.js projects
  for (const p of [
    "Project: ultrathink",
    "Project: @ultrathink/dashboard",
    "Project: inugami-portfolio",
    "Project: museink-landingpage",
    "Project: privacy1st",
    "Project: convoaiclub",
    "Project: mirrorsociety",
  ]) {
    relations.push({
      src: "Pref: Next.js App Router",
      tgt: p,
      type: "applies-to",
    });
  }

  // Design pref applies to user
  relations.push({
    src: "Pref: Minimal Design",
    tgt: "User Identity",
    type: "applies-to",
  });

  // Vault guide supports agent identity
  relations.push({
    src: "Second Brain Vault Guide",
    tgt: "UltraThink Agent Identity",
    type: "supports",
  });

  let created = 0;
  for (const r of relations) {
    const srcId = byTitle.get(r.src);
    const tgtId = byTitle.get(r.tgt);
    if (srcId === undefined || tgtId === undefined) {
      console.log(`SKIP: "${r.src}" → "${r.tgt}" (missing)`);
      continue;
    }
    await sql`
      INSERT INTO memory_relations (source_id, target_id, relation_type, strength)
      VALUES (${srcId}, ${tgtId}, ${r.type}, 0.8)
      ON CONFLICT DO NOTHING
    `;
    created++;
  }
  console.log("Created", created, "relations");

  // Show
  const summary = await sql`
    SELECT mr.relation_type, ms.title as src, mt.title as tgt
    FROM memory_relations mr
    JOIN memories ms ON ms.id = mr.source_id AND ms.is_archived = false
    JOIN memories mt ON mt.id = mr.target_id AND mt.is_archived = false
    ORDER BY mr.relation_type, ms.title
  `;
  console.log("\nRelation map:");
  for (const r of summary as { src: string; relation_type: string; tgt: string }[]) {
    console.log("  " + r.src + " --[" + r.relation_type + "]--> " + r.tgt);
  }

  process.exit(0);
}
main();
