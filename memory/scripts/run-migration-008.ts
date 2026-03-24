#!/usr/bin/env npx tsx
/**
 * Run migration 008: search enrichment
 */
import { config } from "dotenv";
import { resolve, join } from "path";

const root = resolve(import.meta.dirname || ".", "..", "..");
config({ path: join(root, ".env") });

import { getClient } from "../src/client.js";

const sql = getClient();

console.log("Migration 008: Search Enrichment");
console.log("=================================");

// 1. Add enrichment column
console.log("1. Adding search_enrichment column...");
await sql`ALTER TABLE memories ADD COLUMN IF NOT EXISTS search_enrichment TEXT DEFAULT ''`;

// 2. Update tsvector trigger with weighted components
console.log("2. Updating tsvector trigger (weighted A/B/C)...");
await sql`
  CREATE OR REPLACE FUNCTION memories_search_vector_update() RETURNS trigger AS $$
  BEGIN
    NEW.search_vector := (
      setweight(to_tsvector('english', COALESCE(NEW.content, '')), 'A') ||
      setweight(to_tsvector('english', COALESCE(NEW.search_enrichment, '')), 'B') ||
      setweight(to_tsvector('english', COALESCE(NEW.category, '')), 'C')
    );
    RETURN NEW;
  END;
  $$ LANGUAGE plpgsql
`;

// 3. Recreate trigger
console.log("3. Recreating trigger...");
await sql`DROP TRIGGER IF EXISTS trg_memories_search_vector ON memories`;
await sql`
  CREATE TRIGGER trg_memories_search_vector
    BEFORE INSERT OR UPDATE OF content, search_enrichment, category ON memories
    FOR EACH ROW EXECUTE FUNCTION memories_search_vector_update()
`;

// 4. Backfill
const [count] = await sql`SELECT COUNT(*) as c FROM memories`;
console.log(`4. Backfilling ${count.c} memories with weighted tsvector...`);
await sql`
  UPDATE memories SET search_vector = (
    setweight(to_tsvector('english', COALESCE(content, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(search_enrichment, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(category, '')), 'C')
  )
`;

// 5. Verify
const [col] = await sql`
  SELECT column_name FROM information_schema.columns
  WHERE table_name = 'memories' AND column_name = 'search_enrichment'
`;
console.log(`search_enrichment column: ${col ? "EXISTS" : "MISSING"}`);

console.log("\nMigration 008 complete.");
process.exit(0);
