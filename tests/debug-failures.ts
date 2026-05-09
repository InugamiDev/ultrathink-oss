import { config } from "dotenv";
import { resolve, join, dirname } from "path";
import { fileURLToPath } from "url";
import { readFileSync } from "fs";

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: join(resolve(__dirname, ".."), ".env") });

async function main() {
  const { createMemory, semanticSearch } = await import("../memory/src/memory.js");
  const { getClient } = await import("../memory/src/client.js");
  const { enrichMemory } = await import("../memory/src/enrich.js");

  const testData = JSON.parse(readFileSync(join(__dirname, "fixtures/longmemeval-questions.json"), "utf-8"));
  const SCOPE = "debug-fail-" + Date.now();

  for (const seed of testData.seeds) {
    try {
      await createMemory({
        content: seed.content,
        category: seed.category,
        importance: seed.importance,
        confidence: seed.confidence,
        scope: SCOPE,
        source: "debug",
        wing: seed.wing,
        hall: seed.hall,
        layer: seed.layer,
        tags: seed.tags,
      });
    } catch (e: any) {
      console.log("SKIP:", seed.id, e.message);
    }
  }

  // Show enrichment for key seeds
  for (const seedId of ["seed-018", "seed-008", "seed-007", "seed-013"]) {
    const seed = testData.seeds.find((s: any) => s.id === seedId);
    if (!seed) continue;
    const enrich = enrichMemory(seed.content, seed.category, seed.tags);
    console.log(`\n[${seedId}] enrichment: ${enrich.slice(0, 150)}`);
  }

  const failIds = ["tr-07"];
  const allQs = [
    ...testData.questions.multi_session_reasoning,
    ...testData.questions.temporal_reasoning,
    ...testData.questions.knowledge_updates,
  ];

  for (const id of failIds) {
    const q = allQs.find((x: any) => x.id === id);
    if (!q) continue;

    const limit = id.startsWith("ku") ? 5 : 10;
    const results = await semanticSearch({ query: q.question, scope: SCOPE, limit });
    const top5 = results.slice(0, 5);
    const allContent = top5.map((r: any) => r.content.toLowerCase()).join(" ");

    const matched: string[] = [];
    const missed: string[] = [];
    for (const kw of q.expected_keywords) {
      if (allContent.includes(kw.toLowerCase())) matched.push(kw);
      else missed.push(kw);
    }
    if (q.reject_keywords && results.length > 0) {
      for (const rk of q.reject_keywords) {
        if (results[0].content.toLowerCase().includes(rk.toLowerCase())) missed.push("REJECT:" + rk);
      }
    }

    console.log(`\n--- ${id}: "${q.question}"`);
    console.log(`  expects: [${q.expected_keywords.join(", ")}]`);
    console.log(`  matched: [${matched.join(", ")}] missed: [${missed.join(", ")}]`);
    for (let i = 0; i < Math.min(results.length, 8); i++) {
      const r = results[i] as any;
      const marker = i < 5 ? ">>>" : "   ";
      console.log(
        `  ${marker} #${i + 1} sim=${(r.similarity ?? 0).toFixed(3)} rel=${(r._relevance ?? 0).toFixed(3)} | ${r.content.slice(0, 110)}`
      );
    }
  }

  const sql = getClient();
  await sql`UPDATE memories SET is_archived = true WHERE scope = ${SCOPE}`;
  process.exit(0);
}
main();
