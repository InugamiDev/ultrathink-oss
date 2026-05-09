// intent: seed the Second Brain with real knowledge from the project's history.
//         These are architectural decisions, patterns, insights, and rules that
//         were learned through actual work but never persisted because auto-save
//         was disabled and quality gates were strict.
// status: done
// confidence: high

import { getPool } from "../src/db.js";
import { createMemory } from "../src/memory.js";

const SEED_MEMORIES = [
  // ── agent/rules ──
  {
    content:
      "Never leak Tekio, Code-Intel, or Identity Graph into OSS-tier files. These are Core-tier only. The tier boundary is enforced at the file level — OSS repo must not contain any implementation code, imports, CLI commands, dashboard pages, migrations, or test fixtures for these systems.",
    category: "rule",
    importance: 10,
    confidence: 1.0,
    scope: "ultrathink",
    source: "explicit",
    tags: ["tier-boundary", "oss", "core"],
  },
  {
    content:
      "Only ultrathink-oss has git. The private ultrathink directory is NOT a git repo. Never run git commands in the core repo. All commits happen in ultrathink-oss after syncing files.",
    category: "rule",
    importance: 10,
    confidence: 1.0,
    scope: "ultrathink",
    source: "explicit",
    tags: ["git", "oss", "workflow"],
  },
  {
    content:
      "Template skill hints must be orchestrators or hubs that drive multi-step work (forge, cook, bootstrap, saas-bootstrap, landing-gen). Domain skills (recharts, expo, api-toolkit) get matched automatically by the intent keyword scorer from prompt text — they should never be the anchor.",
    category: "rule",
    importance: 8,
    confidence: 1.0,
    scope: "ultrathink",
    source: "explicit",
    tags: ["harness", "skills", "templates"],
  },
  {
    content:
      "No AI attribution in commits. Never add Co-Authored-By: Claude or any Claude/Anthropic co-author lines to git commits. All commits are authored solely by the user.",
    category: "rule",
    importance: 9,
    confidence: 1.0,
    scope: "ultrathink",
    source: "explicit",
    tags: ["git", "commits"],
  },

  // ── knowledge/decisions ──
  {
    content:
      "Memory system uses 3-tier hybrid search: (1) tsvector full-text search for precision, (2) pg_trgm trigram fuzzy matching for typo tolerance, (3) ILIKE substring fallback. Write-time synonym enrichment expands terms before indexing. Two-pass ranking with temporal decay and frequency protection.",
    category: "decision",
    importance: 9,
    confidence: 1.0,
    scope: "ultrathink",
    source: "explicit",
    tags: ["memory", "search", "architecture"],
  },
  {
    content:
      "Skill mesh uses 4 layers: orchestrators (gsd, forge, cook, landing-gen, saas-bootstrap) drive multi-step workflows, hubs (react, debug, test, fix, refactor) coordinate domains, utilities (audit, docs-kit) are focused tools, domain specialists (nextjs, stripe, drizzle) handle specific tech. Auto-trigger via prompt-analyzer scores top 5 per prompt with intent detection + 1-hop graph traversal.",
    category: "decision",
    importance: 9,
    confidence: 1.0,
    scope: "ultrathink",
    source: "explicit",
    tags: ["skills", "architecture", "mesh"],
  },
  {
    content:
      "Harness provider system is pluggable: Provider interface with available() + spawn(). Five backends: claude (claude -p stream-json), codex (codex --quiet --full-auto), local (Ollama HTTP /api/generate), cloud (OpenAI-compatible SSE), stub (fake delays). Config persisted at ~/.ultrathink/harness/config.json. Active provider switchable at runtime via [p] key or --provider flag.",
    category: "decision",
    importance: 8,
    confidence: 1.0,
    scope: "ultrathink",
    source: "explicit",
    tags: ["harness", "providers", "architecture"],
  },
  {
    content:
      "Second Brain vault at ~/.ultrathink/vault/ uses 4-wing structure: agent (WHO I am), user (WHO you are), knowledge (WHAT learned), experience (WHAT happened). Each wing has halls. Obsidian MOC files (_MOC.md) per wing with [[wikilinks]]. Backlinks injected as '## Referenced by' sections. Vault wins for user edits, DB wins for AI-created memories.",
    category: "decision",
    importance: 9,
    confidence: 1.0,
    scope: "ultrathink",
    source: "explicit",
    tags: ["memory", "vault", "obsidian", "architecture"],
  },
  {
    content:
      "ink@5 bundles react-reconciler for React 18 internals (ReactSharedInternals.ReactCurrentOwner). React 19 removed this, causing crash. Solution: upgrade to ink@7.0.0 which requires react >= 19.2.0. ink-text-input@6.0.0 has peerDeps ink>=5, react>=18 — compatible with ink@7.",
    category: "decision",
    importance: 7,
    confidence: 1.0,
    scope: "ultrathink",
    source: "explicit",
    tags: ["ink", "react", "harness", "compatibility"],
  },
  {
    content:
      "OSS install.sh supports: --uninstall (full revert of symlinks + settings.json hooks + CLAUDE.md section), --dry-run (preview without modifying), --no-identity (skip CLAUDE.md), --yes/-y (auto-approve). Playwright MCP kill guarded by marker file ~/.ultrathink/.playwright-mcp-active to avoid killing user's Playwright processes.",
    category: "decision",
    importance: 7,
    confidence: 1.0,
    scope: "ultrathink",
    source: "explicit",
    tags: ["install", "oss", "safety"],
  },

  // ── knowledge/patterns ──
  {
    content:
      "When merging skills into hub skills, the pattern is: (1) identify domain skills that overlap, (2) create/update hub SKILL.md with merged triggers and combined knowledge, (3) update _registry.json with expanded triggers, (4) delete old standalone skills, (5) sync registry between core and OSS. Example: 66 brand DESIGN.md files merged into design-kit hub.",
    category: "pattern",
    importance: 7,
    confidence: 0.9,
    scope: "ultrathink",
    source: "explicit",
    tags: ["skills", "merge", "workflow"],
  },
  {
    content:
      "Tier boundary cleanup pattern: (1) grep -ri for leaked terms across entire OSS repo, (2) categorize by file type (migrations, CLI, dashboard, hooks, tests, docs), (3) surgical removal — delete full files for dedicated features, edit shared files to strip references, (4) rebuild imports/types, (5) full build+lint+test verification, (6) sync to OSS and push.",
    category: "pattern",
    importance: 8,
    confidence: 1.0,
    scope: "ultrathink",
    source: "explicit",
    tags: ["tier-boundary", "cleanup", "workflow"],
  },
  {
    content:
      "Harness phase flow: clarify (awaiting-input after questions) → plan (approve/reject) → build (waves) → validate (must-haves check) → ship (changelog + confirm). Feedback loop at any phase: redo (restart), modify (revise with feedback), improve (polish), give_feedback (general). FSM in machine.ts, loopFor() adds self-loops to every live phase.",
    category: "pattern",
    importance: 7,
    confidence: 1.0,
    scope: "ultrathink",
    source: "explicit",
    tags: ["harness", "pipeline", "fsm"],
  },

  // ── knowledge/insights ──
  {
    content:
      "Quality gates and disabled auto-save hooks prevent garbage memories, but they also prevent ANY memories from being saved during normal work. The brain ends up with perfect structure but empty halls. Need to actively seed knowledge after major work sessions — the system won't populate itself.",
    category: "insight",
    importance: 8,
    confidence: 1.0,
    scope: "ultrathink",
    source: "explicit",
    tags: ["memory", "quality-gates", "gap"],
  },
  {
    content:
      "awesome-design-md provides 66 brand DESIGN.md files with exact CSS values (colors, typography, spacing, shadows). Fetch via npx getdesign@latest add <brand>. These are real brand specs, not approximations — useful for design-kit skill to reference exact brand guidelines. Catalog: Apple, Google, Stripe, Vercel, Linear, Notion, Discord, Spotify, etc.",
    category: "insight",
    importance: 6,
    confidence: 0.9,
    scope: "ultrathink",
    source: "explicit",
    tags: ["design", "brands", "css"],
  },
  {
    content:
      "The prompt-analyzer context format uses ACTIVATE (not MANDATORY) for primary skill, 'Also relevant: X, Y — use Skill() to load' for secondary skills, and appends VFS REQUIRED directive. After skill merges, old skill names (animation, stripe, api-versioning, etc.) resolve to their parent hubs (css-foundations, commerce-kit, api-toolkit).",
    category: "insight",
    importance: 6,
    confidence: 1.0,
    scope: "ultrathink",
    source: "explicit",
    tags: ["prompt-analyzer", "skills", "context"],
  },
];

async function main() {
  const pool = getPool();
  let created = 0;
  let skipped = 0;

  for (const mem of SEED_MEMORIES) {
    try {
      await createMemory(pool, mem);
      created++;
      console.log(`  + [${mem.category}] ${mem.content.slice(0, 60)}...`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes("duplicate") || msg.includes("similar")) {
        skipped++;
        console.log(`  ~ [skip] ${mem.content.slice(0, 60)}...`);
      } else {
        console.error(`  ! [fail] ${msg.slice(0, 80)}`);
      }
    }
  }

  console.log(`\nSeeded: ${created} created, ${skipped} skipped (duplicate)`);

  // Now export to vault
  console.log("\nExporting to vault...");
  const { execFileSync } = await import("child_process");
  const { resolve } = await import("path");
  try {
    execFileSync("npx", ["tsx", resolve(import.meta.dirname, "../../scripts/vault-sync.ts"), "db-to-vault"], {
      stdio: "inherit",
      timeout: 30000,
    });
  } catch {
    console.log("Vault export skipped (may need manual run: npx tsx scripts/vault-sync.ts db-to-vault)");
  }

  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
