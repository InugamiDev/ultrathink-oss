#!/usr/bin/env npx tsx
import { config } from "dotenv";
import { resolve, join } from "path";

const root = resolve(import.meta.dirname || ".", "..", "..");
config({ path: join(root, ".env") });

import { getClient } from "../src/client.js";

const sql = getClient();

console.log("Migration 009: Tekiō — Cycle of Nova — Adaptations");
console.log("================================================\n");

// 1. Create table
console.log("1. Creating adaptations table...");
await sql`
  CREATE TABLE IF NOT EXISTS adaptations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trigger_pattern TEXT NOT NULL,
    adaptation_rule TEXT NOT NULL,
    source_failure TEXT,
    category VARCHAR(20) NOT NULL DEFAULT 'defensive'
      CHECK (category IN ('defensive', 'auxiliary', 'offensive')),
    severity SMALLINT NOT NULL DEFAULT 5,
    scope VARCHAR(100) DEFAULT NULL,
    times_applied INT NOT NULL DEFAULT 0,
    times_prevented INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_applied_at TIMESTAMPTZ,
    is_active BOOLEAN NOT NULL DEFAULT true,
    source_memory_id UUID,
    tags TEXT[] DEFAULT '{}'
  )
`;

// 2. Indexes
console.log("2. Creating indexes...");
await sql`CREATE INDEX IF NOT EXISTS idx_adaptations_trigger ON adaptations USING GIN (to_tsvector('english', trigger_pattern))`;
await sql`CREATE INDEX IF NOT EXISTS idx_adaptations_active_scope ON adaptations (is_active, scope) WHERE is_active = true`;
await sql`CREATE INDEX IF NOT EXISTS idx_adaptations_applied ON adaptations (times_applied DESC) WHERE is_active = true`;
await sql`CREATE INDEX IF NOT EXISTS idx_adaptations_trigger_trgm ON adaptations USING GIN (trigger_pattern gin_trgm_ops)`;

// 3. Verify
const [col] = (await sql`
  SELECT table_name FROM information_schema.tables
  WHERE table_name = 'adaptations'
`) as any[];
console.log(`\nadaptations table: ${col ? "EXISTS" : "MISSING"}`);

const [count] = (await sql`SELECT COUNT(*) as c FROM adaptations`) as any[];
console.log(`adaptations count: ${count.c}`);

console.log("\nMigration 009 complete.");
process.exit(0);
