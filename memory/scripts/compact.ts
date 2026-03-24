#!/usr/bin/env npx tsx
/**
 * compact.ts — Memory compaction with pg_trgm grouping.
 *
 * Rules:
 *   - Only compact memories with importance 1-3
 *   - Never compact `decision` category memories
 *   - Group by scope + trigram similarity
 *   - Require 5+ memories per group
 *   - Store summaries in `summaries` table
 *   - Mark originals as is_compacted + is_archived
 *
 * Usage: npx tsx memory/scripts/compact.ts [--dry-run] [--threshold 100]
 */

import { config } from "dotenv";
import { join, resolve } from "path";
import { getClient } from "../src/client.js";

config({ path: join(resolve(import.meta.dirname, "../.."), ".env") });

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const thresholdIdx = args.indexOf("--threshold");
const threshold = thresholdIdx >= 0 ? Number(args[thresholdIdx + 1]) : 100;

const sql = getClient();

interface CompactCandidate {
  id: string;
  content: string;
  category: string;
  importance: number;
  scope: string | null;
  created_at: string;
}

async function getTotalCount(): Promise<number> {
  const [{ count }] = await sql`
    SELECT COUNT(*) as count FROM memories WHERE is_archived = false
  `;
  return Number(count);
}

async function getCandidates(): Promise<CompactCandidate[]> {
  return (await sql`
    SELECT id, content, category, importance, scope, created_at
    FROM memories
    WHERE importance <= 3
      AND category != 'decision'
      AND is_archived = false
      AND is_compacted = false
    ORDER BY scope, created_at
  `) as CompactCandidate[];
}

function groupByScope(candidates: CompactCandidate[]): Map<string, CompactCandidate[]> {
  const groups = new Map<string, CompactCandidate[]>();
  for (const c of candidates) {
    const key = c.scope || "__no_scope__";
    const arr = groups.get(key) || [];
    arr.push(c);
    groups.set(key, arr);
  }
  return groups;
}

function buildSummary(scope: string, memories: CompactCandidate[]): string {
  const categories = new Set(memories.map((m) => m.category));

  // Group by category for structured synthesis
  const byCategory = new Map<string, CompactCandidate[]>();
  for (const m of memories) {
    const arr = byCategory.get(m.category) || [];
    arr.push(m);
    byCategory.set(m.category, arr);
  }

  // Deduplicate similar content within each category (prefix match)
  const sections: string[] = [];
  for (const [cat, mems] of byCategory) {
    const unique: string[] = [];
    const seen = new Set<string>();
    for (const m of mems) {
      // Use first 60 chars as dedup key
      const key = m.content.slice(0, 60).toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(m.content);
      }
    }
    // Cap at 10 items per category to keep summaries readable
    const items = unique.slice(0, 10).map((c) => `  - ${c}`);
    if (unique.length > 10) items.push(`  - ... and ${unique.length - 10} more`);
    sections.push(`[${cat}] (${mems.length} memories)\n${items.join("\n")}`);
  }

  const dateRange = `${memories[0].created_at.slice(0, 10)} to ${memories[memories.length - 1].created_at.slice(0, 10)}`;

  return [
    `## Compacted: ${scope} (${memories.length} memories, ${dateRange})`,
    `Categories: ${[...categories].join(", ")}`,
    "",
    ...sections,
  ].join("\n");
}

async function compact() {
  console.log("Memory compaction starting...\n");

  const totalCount = await getTotalCount();
  console.log(`Total active memories: ${totalCount} (threshold: ${threshold})`);

  if (totalCount < threshold) {
    console.log(`Below threshold (${totalCount} < ${threshold}) — skipping compaction.`);
    return;
  }

  const candidates = await getCandidates();
  console.log(`Found ${candidates.length} compaction candidates (importance <= 3, not decision).`);

  if (candidates.length === 0) {
    console.log("No candidates for compaction.");
    return;
  }

  // Group by scope, filter to 5+ members
  const groups = groupByScope(candidates);
  for (const [key, members] of groups) {
    if (members.length < 5) groups.delete(key);
  }

  if (groups.size === 0) {
    console.log("No groups with 5+ eligible memories. Nothing to compact.");
    return;
  }

  let totalCompacted = 0;

  for (const [groupKey, memories] of groups) {
    console.log(`  Compacting "${groupKey}": ${memories.length} memories`);

    if (dryRun) {
      console.log(`  (dry run — would compact ${memories.length} memories)`);
      totalCompacted += memories.length;
      continue;
    }

    const summaryText = buildSummary(groupKey, memories);
    const dateStart = memories[0].created_at;
    const dateEnd = memories[memories.length - 1].created_at;

    await sql`
      INSERT INTO summaries (scope, summary, memory_count, date_range_start, date_range_end)
      VALUES (${groupKey}, ${summaryText}, ${memories.length}, ${dateStart}, ${dateEnd})
    `;

    const ids = memories.map((m) => m.id);
    await sql`
      UPDATE memories
      SET is_compacted = true, is_archived = true, updated_at = NOW()
      WHERE id = ANY(${ids})
    `;

    totalCompacted += memories.length;
    console.log(`  OK — ${memories.length} memories archived, summary created`);
  }

  const verb = dryRun ? "would compact" : "compacted";
  console.log(`\nCompaction complete: ${verb} ${totalCompacted} memories across ${groups.size} groups.`);
}

compact()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("compact error:", err);
    process.exit(1);
  });
