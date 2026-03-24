#!/usr/bin/env npx tsx
/**
 * Run migration 007 using raw pg connection (neon HTTP client can't run DDL with functions).
 * Falls back to running individual tagged-template statements.
 */
import { resolve, join } from "path";
import { config } from "dotenv";

const projectRoot = resolve(import.meta.dirname, "../..");
config({ path: join(projectRoot, ".env") });

import postgres from "postgres";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("DATABASE_URL not set");
  process.exit(1);
}

// Use postgres.js (not neon HTTP) for DDL operations
const sql = postgres(DATABASE_URL, { ssl: "require" });

try {
  // 1. Add tsvector column
  console.log("1. Adding search_vector column...");
  await sql`ALTER TABLE memories ADD COLUMN IF NOT EXISTS search_vector TSVECTOR`;
  console.log("   OK");

  // 2. Create trigger function
  console.log("2. Creating trigger function...");
  await sql`
    CREATE OR REPLACE FUNCTION memories_search_vector_update() RETURNS trigger AS $$
    BEGIN
      NEW.search_vector := to_tsvector('english', COALESCE(NEW.content, ''));
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql
  `;
  console.log("   OK");

  // 3. Create trigger
  console.log("3. Creating trigger...");
  await sql`DROP TRIGGER IF EXISTS trg_memories_search_vector ON memories`;
  await sql`
    CREATE TRIGGER trg_memories_search_vector
      BEFORE INSERT OR UPDATE OF content ON memories
      FOR EACH ROW EXECUTE FUNCTION memories_search_vector_update()
  `;
  console.log("   OK");

  // 4. GIN index for tsvector
  console.log("4. Creating tsvector GIN index...");
  await sql`CREATE INDEX IF NOT EXISTS idx_memories_search_vector ON memories USING GIN(search_vector)`;
  console.log("   OK");

  // 5. pg_trgm extension + index
  console.log("5. Ensuring pg_trgm extension + index...");
  await sql`CREATE EXTENSION IF NOT EXISTS pg_trgm`;
  await sql`CREATE INDEX IF NOT EXISTS idx_memories_content_trgm ON memories USING GIN(content gin_trgm_ops)`;
  console.log("   OK");

  // 6. Backfill
  console.log("6. Backfilling search_vector...");
  const result = await sql`
    UPDATE memories SET search_vector = to_tsvector('english', COALESCE(content, ''))
    WHERE search_vector IS NULL
  `;
  console.log(`   OK — ${result.count} rows backfilled`);

  // === Verification ===
  console.log("\n=== Verification ===");
  const [col] = await sql`
    SELECT column_name FROM information_schema.columns
    WHERE table_name = 'memories' AND column_name = 'search_vector'
  `;
  console.log("search_vector column:", col ? "EXISTS" : "MISSING");

  const [backfill] = await sql`SELECT COUNT(*) as filled FROM memories WHERE search_vector IS NOT NULL`;
  const [total] = await sql`SELECT COUNT(*) as total FROM memories`;
  console.log("Populated:", backfill.filled, "/", total.total, "rows");

  // === Benchmark: tsvector vs trgm vs ILIKE ===
  const query = "authentication";
  console.log(`\n=== Search benchmark: "${query}" ===`);

  const t1 = performance.now();
  const tsResults = await sql`
    SELECT id, LEFT(content, 80) as preview, ts_rank(search_vector, plainto_tsquery('english', ${query})) as rank
    FROM memories WHERE search_vector @@ plainto_tsquery('english', ${query})
    ORDER BY rank DESC LIMIT 5
  `;
  const t1End = performance.now();
  console.log(`\nTier 1 — tsvector: ${tsResults.length} results in ${(t1End - t1).toFixed(1)}ms`);
  for (const r of tsResults) {
    console.log(`  rank: ${Number(r.rank).toFixed(4)} | ${r.preview}`);
  }

  const t2 = performance.now();
  const trgmResults = await sql`
    SELECT id, LEFT(content, 80) as preview, similarity(content, ${query}) as sim
    FROM memories WHERE similarity(content, ${query}) > 0.05
    ORDER BY sim DESC LIMIT 5
  `;
  const t2End = performance.now();
  console.log(`\nTier 2 — pg_trgm: ${trgmResults.length} results in ${(t2End - t2).toFixed(1)}ms`);
  for (const r of trgmResults) {
    console.log(`  sim: ${Number(r.sim).toFixed(4)} | ${r.preview}`);
  }

  const t3 = performance.now();
  const ilikeResults = await sql`
    SELECT id, LEFT(content, 80) as preview
    FROM memories WHERE content ILIKE ${"%" + query + "%"}
    ORDER BY importance DESC LIMIT 5
  `;
  const t3End = performance.now();
  console.log(`\nTier 3 — ILIKE: ${ilikeResults.length} results in ${(t3End - t3).toFixed(1)}ms`);
  for (const r of ilikeResults) {
    console.log(`  | ${r.preview}`);
  }

  // Stemming advantage test
  const stemQuery = "authenticating";
  const stemTs = await sql`
    SELECT COUNT(*) as count FROM memories
    WHERE search_vector @@ plainto_tsquery('english', ${stemQuery})
  `;
  const stemIlike = await sql`
    SELECT COUNT(*) as count FROM memories
    WHERE content ILIKE ${"%" + stemQuery + "%"}
  `;
  console.log(`\n=== Stemming: "${stemQuery}" ===`);
  console.log(`tsvector: ${stemTs[0].count} results (matches "authentication" via stemming)`);
  console.log(`ILIKE: ${stemIlike[0].count} results (exact substring only)`);
} finally {
  await sql.end();
}

process.exit(0);
