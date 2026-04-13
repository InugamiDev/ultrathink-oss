#!/usr/bin/env npx tsx
/**
 * context-tree.ts — Generates a hierarchical context tree JSON for UltraThink.
 * Shows what knowledge is available and how to access each branch.
 *
 * Usage: npx tsx context-tree.ts [scope]
 * Output: JSON ContextNode tree
 */

import { readFileSync, existsSync } from "fs";
import { resolve, join } from "path";
import { config } from "dotenv";
import { getClient } from "../src/client.js";

const projectRoot = resolve(import.meta.dirname, "../..");
config({ path: join(projectRoot, ".env") });

interface ContextNode {
  label: string;
  type: "branch" | "leaf";
  count?: number;
  access: string;
  children?: ContextNode[];
}

async function buildContextTree(scope?: string): Promise<ContextNode> {
  const sql = getClient();

  // 1. Memory categories + counts
  const memoryCats = await sql`
    SELECT category, COUNT(*) as count
    FROM memories WHERE is_archived = false
    GROUP BY category ORDER BY count DESC
  `;
  const [memTotal] = (await sql`
    SELECT COUNT(*) as count FROM memories WHERE is_archived = false
  `) as any[];

  const memoryChildren: ContextNode[] = (memoryCats as any[]).map((cat) => ({
    label: `${cat.category}/`,
    type: "leaf" as const,
    count: Number(cat.count),
    access: `/ut-recall [topic]`,
  }));

  // 2. Skill registry breakdown
  let skillChildren: ContextNode[] = [];
  let totalSkills = 0;
  const registryPath = join(projectRoot, ".claude/skills/_registry.json");
  if (existsSync(registryPath)) {
    try {
      const registry = JSON.parse(readFileSync(registryPath, "utf-8"));
      const skills = registry.skills || [];
      totalSkills = skills.length;
      const byLayer: Record<string, number> = {};
      for (const s of skills) {
        byLayer[s.layer] = (byLayer[s.layer] || 0) + 1;
      }
      skillChildren = Object.entries(byLayer)
        .sort((a, b) => b[1] - a[1])
        .map(([layer, count]) => ({
          label: `${layer}/`,
          type: "leaf" as const,
          count,
          access: `Skill() to activate`,
        }));
    } catch {
      // Registry parse error
    }
  }

  // 3. Active plans
  let activePlans = 0;
  try {
    const [planCount] = (await sql`
      SELECT COUNT(*) as count FROM plans WHERE status != 'completed'
    `) as any[];
    activePlans = Number(planCount.count);
  } catch {
    // plans table may not exist
  }

  // 4. Sessions
  let sessionCount = 0;
  try {
    const [sc] = (await sql`SELECT COUNT(*) as count FROM sessions`) as any[];
    sessionCount = Number(sc.count);
  } catch {
    // sessions table may not exist
  }

  // 5. Detect project stack
  const stackItems: string[] = [];
  const pkgPath = join(projectRoot, "package.json");
  if (existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(readFileSync(pkgPath, "utf-8"));
      const deps = { ...pkg.dependencies, ...pkg.devDependencies };
      if (deps.next) stackItems.push(`Next.js ${deps.next}`);
      if (deps.react) stackItems.push("React");
      if (deps.tailwindcss) stackItems.push("Tailwind CSS");
      if (deps["@neondatabase/serverless"]) stackItems.push("Neon Postgres");
      if (deps.typescript) stackItems.push("TypeScript");
    } catch {
      // parse error
    }
  }

  // 6. Reference files
  const refDir = join(projectRoot, ".claude/references");
  let refFiles: string[] = [];
  try {
    const { readdirSync } = await import("fs");
    refFiles = readdirSync(refDir).filter((f) => f.endsWith(".md"));
  } catch {
    // no refs dir
  }

  // Build tree
  const tree: ContextNode = {
    label: "ultrathink/",
    type: "branch",
    access: "/context-tree",
    children: [
      {
        label: "identity/",
        type: "branch",
        access: "npx tsx memory-runner.ts identity",
        children: [{ label: "preferences", type: "leaf", access: "category: preference (no decay)" }],
      },
      {
        label: "memory/",
        type: "branch",
        count: Number(memTotal.count),
        access: "/ut-recall [topic]",
        children: memoryChildren,
      },
      {
        label: "skills/",
        type: "branch",
        count: totalSkills,
        access: "Skill() to activate",
        children: skillChildren,
      },
      {
        label: "project/",
        type: "branch",
        access: "Read with Glob/LS",
        children: [
          {
            label: "stack/",
            type: "leaf",
            access: stackItems.join(", ") || "not detected",
          },
          {
            label: "active-plans/",
            type: "leaf",
            count: activePlans,
            access: "DB query",
          },
          {
            label: "sessions/",
            type: "leaf",
            count: sessionCount,
            access: "/usage",
          },
        ],
      },
      {
        label: "references/",
        type: "branch",
        count: refFiles.length,
        access: "Read .claude/references/*.md",
        children: refFiles.map((f) => ({
          label: f,
          type: "leaf" as const,
          access: `.claude/references/${f}`,
        })),
      },
    ],
  };

  return tree;
}

/**
 * Generate a compact summary string for injection into additionalContext.
 */
export async function getContextTreeSummary(scope?: string): Promise<string> {
  const sql = getClient();

  // Quick counts only — no full tree build
  const [memTotal] = (await sql`
    SELECT COUNT(*) as count FROM memories WHERE is_archived = false
  `) as any[];
  const memoryCats = await sql`
    SELECT category, COUNT(*) as count
    FROM memories WHERE is_archived = false
    GROUP BY category ORDER BY count DESC
    LIMIT 8
  `;

  // Skill count from registry
  let totalSkills = 0;
  const layerCounts: Record<string, number> = {};
  const registryPath = join(projectRoot, ".claude/skills/_registry.json");
  if (existsSync(registryPath)) {
    try {
      const registry = JSON.parse(readFileSync(registryPath, "utf-8"));
      const skills = registry.skills || [];
      totalSkills = skills.length;
      for (const s of skills) {
        layerCounts[s.layer] = (layerCounts[s.layer] || 0) + 1;
      }
    } catch {
      // ignore
    }
  }

  // Active plans
  let activePlans = 0;
  try {
    const [pc] = (await sql`SELECT COUNT(*) as count FROM plans WHERE status != 'completed'`) as any[];
    activePlans = Number(pc.count);
  } catch {
    // ignore
  }

  // Stack detection
  const stackItems: string[] = [];
  const pkgPath = join(projectRoot, "package.json");
  if (existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(readFileSync(pkgPath, "utf-8"));
      const deps = { ...pkg.dependencies, ...pkg.devDependencies };
      if (deps.next) stackItems.push(`Next.js ${deps.next}`);
      if (deps.tailwindcss) stackItems.push("Tailwind v4");
      if (deps["@neondatabase/serverless"]) stackItems.push("Neon Postgres");
    } catch {
      // ignore
    }
  }

  const catSummary = (memoryCats as any[]).map((c) => `${c.count} ${c.category}`).join(", ");

  const layerSummary = Object.entries(layerCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([l, c]) => `${c} ${l}`)
    .join(", ");

  const lines = [
    "## Context Tree",
    `- Memory: ${memTotal.count} items (${catSummary})`,
    `- Skills: ${totalSkills} (${layerSummary})`,
    `- Active: ${activePlans} plans`,
  ];

  if (stackItems.length > 0) {
    lines.push(`- Stack: ${stackItems.join(", ")}`);
  }

  lines.push("Use /context-tree for full navigation. Use /ut-recall [topic] to query memory.");

  return lines.join("\n");
}

// CLI entrypoint
async function main() {
  const scope = process.argv[2] || undefined;
  const tree = await buildContextTree(scope);
  process.stdout.write(JSON.stringify(tree, null, 2));
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("context-tree error:", err.message || err);
    process.exit(1);
  });
