#!/usr/bin/env npx tsx
/**
 * intent: Obsidian Vault ↔ Neon DB sync — Second Brain for UltraThink
 * status: done
 * confidence: high
 *
 * Architecture:
 *   Vault = user's editing surface (Obsidian markdown files)
 *   DB    = cloud store (Neon Postgres)
 *
 * Vault structure mirrors MemPalace:
 *   ~/.ultrathink/vault/{wing}/{hall}/{slug}.md
 *
 * Flow:
 *   - User edits vault files in Obsidian → vault-to-db syncs changes to cloud
 *   - AI writes go to DB → db-to-vault exports as markdown for user review
 *   - On session-start: vault-to-db (user edits take priority)
 *   - On session-end: db-to-vault (export new AI-created memories)
 *
 * Frontmatter schema:
 *   id, wing, hall, room, category, importance, confidence, scope, source,
 *   layer, tags, created, updated, synced
 *
 * Conflict resolution: vault always wins for user-sourced edits.
 * AI-sourced memories: DB wins (vault is read-only mirror).
 *
 * Commands:
 *   vault-to-db              — Import vault edits to DB
 *   db-to-vault [session_id] — Export DB memories to vault
 *   init                     — Create vault directory structure
 *   status                   — Show sync status
 */

import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync, statSync } from "fs";
import { join, resolve, relative, basename, dirname } from "path";
import { config } from "dotenv";
import { createHash } from "crypto";

const projectRoot = resolve(import.meta.dirname, "..");
config({ path: join(projectRoot, ".env") });

import { createNeonCompat, type NeonCompatClient } from "../memory/src/neon-compat.js";

let _sql: NeonCompatClient | null = null;
function getDb() {
  if (!_sql) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("DATABASE_URL required");
    _sql = createNeonCompat(url);
  }
  return _sql;
}

const VAULT_ROOT = process.env.ULTRATHINK_VAULT ?? join(process.env.HOME ?? "~", ".ultrathink/vault");
const WINGS = ["agent", "user", "knowledge", "experience"] as const;

// ─── Frontmatter parsing ────────────────────────────────────────────────────

interface VaultFile {
  path: string;
  frontmatter: Record<string, unknown>;
  content: string;
  rawFrontmatter: string;
}

function parseFrontmatter(raw: string): {
  frontmatter: Record<string, unknown>;
  content: string;
  rawFrontmatter: string;
} {
  const match = raw.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!match) return { frontmatter: {}, content: raw.trim(), rawFrontmatter: "" };

  const rawFm = match[1];
  const content = match[2].trim();
  const frontmatter: Record<string, unknown> = {};

  for (const line of rawFm.split("\n")) {
    const idx = line.indexOf(":");
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    let value: unknown = line.slice(idx + 1).trim();

    // Parse arrays: [a, b, c]
    if (typeof value === "string" && value.startsWith("[") && value.endsWith("]")) {
      value = value
        .slice(1, -1)
        .split(",")
        .map((s) => s.trim().replace(/^["']|["']$/g, ""))
        .filter(Boolean);
    }
    // Parse numbers
    else if (typeof value === "string" && /^\d+(\.\d+)?$/.test(value)) {
      value = parseFloat(value);
    }
    // Parse booleans
    else if (value === "true") value = true;
    else if (value === "false") value = false;
    // Strip quotes
    else if (typeof value === "string") {
      value = value.replace(/^["']|["']$/g, "");
    }

    frontmatter[key] = value;
  }

  return { frontmatter, content, rawFrontmatter: rawFm };
}

function serializeFrontmatter(fm: Record<string, unknown>): string {
  const lines: string[] = [];
  for (const [key, val] of Object.entries(fm)) {
    if (val === undefined || val === null) continue;
    if (Array.isArray(val)) {
      lines.push(`${key}: [${val.map((v) => `"${v}"`).join(", ")}]`);
    } else {
      lines.push(`${key}: ${val}`);
    }
  }
  return lines.join("\n");
}

function toMarkdown(memory: Record<string, unknown>, content: string): string {
  const fm: Record<string, unknown> = {
    id: memory.id,
    title: memory.title || undefined,
    wing: memory.wing,
    hall: memory.hall,
    room: memory.room || undefined,
    category: memory.category,
    importance: memory.importance,
    confidence: memory.confidence,
    scope: memory.scope || undefined,
    source: memory.source || undefined,
    layer: memory.layer,
    tags: (memory.tags as string[])?.length ? memory.tags : undefined,
    created: memory.created_at,
    updated: memory.updated_at,
    synced: new Date().toISOString(),
  };

  return `---\n${serializeFrontmatter(fm)}\n---\n\n${content}\n`;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .slice(0, 60)
    .replace(/-+$/, "");
}

function contentHash(content: string): string {
  return createHash("sha256").update(content.trim()).digest("hex").slice(0, 12);
}

// ─── Vault → DB sync ────────────────────────────────────────────────────────

function scanVault(): VaultFile[] {
  const files: VaultFile[] = [];
  if (!existsSync(VAULT_ROOT)) return files;

  function walk(dir: string) {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (entry.name.startsWith(".")) continue;
      const full = join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else if (entry.name.endsWith(".md")) {
        try {
          const raw = readFileSync(full, "utf-8");
          const { frontmatter, content, rawFrontmatter } = parseFrontmatter(raw);
          files.push({ path: full, frontmatter, content, rawFrontmatter });
        } catch {
          // Skip unreadable files
        }
      }
    }
  }

  walk(VAULT_ROOT);
  return files;
}

async function vaultToDb(): Promise<{ synced: number; created: number; updated: number; skipped: number }> {
  const sql = getDb();
  const files = scanVault();
  let synced = 0,
    created = 0,
    updated = 0,
    skipped = 0;

  for (const file of files) {
    const fm = file.frontmatter;
    const content = file.content;

    if (!content || content.length < 3) {
      skipped++;
      continue;
    }

    // Infer wing/hall from path if not in frontmatter
    const rel = relative(VAULT_ROOT, file.path);
    const parts = rel.split("/");
    const wing = (fm.wing as string) || (parts.length >= 2 ? parts[0] : "project");
    const hall = (fm.hall as string) || (parts.length >= 2 ? parts[1] : "note");
    const room = (fm.room as string) || undefined;
    const category = (fm.category as string) || hall;
    const importance = typeof fm.importance === "number" ? fm.importance : 5;
    const confidence = typeof fm.confidence === "number" ? fm.confidence : 0.8;
    const scope = (fm.scope as string) || undefined;
    const source = (fm.source as string) || "vault";
    const layer = typeof fm.layer === "number" ? fm.layer : wing === "identity" ? 0 : 2;
    const tags = Array.isArray(fm.tags) ? fm.tags : [];
    const tokenEstimate = Math.min(Math.round(content.length / 4), 32767);

    if (fm.id) {
      // Existing memory — check if vault version is newer
      const [existing] = (await sql`
        SELECT id, content, updated_at FROM memories WHERE id = ${fm.id as string}
      `) as any[];

      if (!existing) {
        // ID in frontmatter but not in DB — re-create
        await sql`
          INSERT INTO memories (id, content, category, importance, confidence, scope, source, wing, hall, room, layer, token_estimate)
          VALUES (${fm.id as string}, ${content}, ${category}, ${importance}, ${confidence}, ${scope ?? null}, ${source}, ${wing}, ${hall}, ${room ?? null}, ${layer}, ${tokenEstimate})
          ON CONFLICT (id) DO NOTHING
        `;
        created++;
      } else {
        // Compare content hash — only update if different
        const dbHash = contentHash(existing.content as string);
        const vaultHash = contentHash(content);

        if (dbHash !== vaultHash) {
          await sql`
            UPDATE memories SET
              content = ${content},
              category = ${category},
              importance = ${importance},
              confidence = ${confidence},
              scope = ${scope ?? null},
              wing = ${wing},
              hall = ${hall},
              room = ${room ?? null},
              layer = ${layer},
              token_estimate = ${tokenEstimate},
              updated_at = NOW()
            WHERE id = ${fm.id as string}
          `;
          updated++;
        } else {
          skipped++;
          continue;
        }
      }
    } else {
      // No ID — check for duplicate by content similarity before creating
      const [dup] = (await sql`
        SELECT id FROM memories
        WHERE is_archived = false AND similarity(content, ${content}) > 0.85
        LIMIT 1
      `) as any[];

      if (dup) {
        // Write the DB ID back to the vault file so future syncs track it
        const newFm = { ...fm, id: dup.id as string };
        const updatedMd = `---\n${serializeFrontmatter(newFm)}\n---\n\n${content}\n`;
        writeFileSync(file.path, updatedMd);
        skipped++;
        continue;
      }

      // Create new memory
      const [row] = (await sql`
        INSERT INTO memories (content, category, importance, confidence, scope, source, wing, hall, room, layer, token_estimate)
        VALUES (${content}, ${category}, ${importance}, ${confidence}, ${scope ?? null}, ${source}, ${wing}, ${hall}, ${room ?? null}, ${layer}, ${tokenEstimate})
        RETURNING id
      `) as any[];

      // Write ID back to vault file
      const newFm = {
        ...fm,
        id: row.id as string,
        wing,
        hall,
        room,
        category,
        importance,
        confidence,
        layer,
        synced: new Date().toISOString(),
      };
      const updatedMd = `---\n${serializeFrontmatter(newFm)}\n---\n\n${content}\n`;
      writeFileSync(file.path, updatedMd);
      created++;
    }

    synced++;
  }

  return { synced, created, updated, skipped };
}

// ─── DB → Vault export ──────────────────────────────────────────────────────

async function dbToVault(sessionId?: string, opts?: { all?: boolean }): Promise<{ exported: number; skipped: number }> {
  const sql = getDb();
  let exported = 0,
    skipped = 0;

  // Fetch memories to export — session-specific, all (rebuild), or recent unsynced
  let memories: any[];
  if (sessionId) {
    memories = (await sql`
      SELECT m.*, array_agg(mt.tag) FILTER (WHERE mt.tag IS NOT NULL) as tags
      FROM memories m
      LEFT JOIN memory_tags mt ON m.id = mt.memory_id
      WHERE m.session_id = ${sessionId} AND m.is_archived = false
      GROUP BY m.id
      ORDER BY m.created_at DESC
    `) as any[];
  } else if (opts?.all) {
    // Export ALL non-archived memories (used by rebuild)
    memories = (await sql`
      SELECT m.*, array_agg(mt.tag) FILTER (WHERE mt.tag IS NOT NULL) as tags
      FROM memories m
      LEFT JOIN memory_tags mt ON m.id = mt.memory_id
      WHERE m.is_archived = false
      GROUP BY m.id
      ORDER BY m.wing, m.hall, m.importance DESC
    `) as any[];
  } else {
    // Export recent memories not yet in vault (created in last 24h)
    memories = (await sql`
      SELECT m.*, array_agg(mt.tag) FILTER (WHERE mt.tag IS NOT NULL) as tags
      FROM memories m
      LEFT JOIN memory_tags mt ON m.id = mt.memory_id
      WHERE m.is_archived = false
        AND m.created_at > NOW() - INTERVAL '24 hours'
      GROUP BY m.id
      ORDER BY m.wing, m.hall, m.importance DESC
    `) as any[];
  }

  // Scan existing vault files to build ID → path map
  const existingFiles = scanVault();
  const idToPath = new Map<string, string>();
  for (const f of existingFiles) {
    if (f.frontmatter.id) {
      idToPath.set(f.frontmatter.id as string, f.path);
    }
  }

  for (const m of memories) {
    const wing = m.wing || "project";
    const hall = m.hall || m.category || "note";
    const id = m.id as string;

    // Skip if already in vault with same content
    if (idToPath.has(id)) {
      const existingPath = idToPath.get(id)!;
      try {
        const existing = readFileSync(existingPath, "utf-8");
        const { content: existingContent } = parseFrontmatter(existing);
        if (contentHash(existingContent) === contentHash(m.content as string)) {
          skipped++;
          continue;
        }
      } catch {
        // File unreadable — overwrite
      }
    }

    // Build path: vault/{wing}/{hall}/{slug}.md
    const dir = join(VAULT_ROOT, wing, hall);
    mkdirSync(dir, { recursive: true });

    const slug = slugify((m.title as string) || (m.content as string).slice(0, 60)) || id.slice(0, 8);
    const filename = `${slug}.md`;
    const filepath = join(dir, filename);

    const md = toMarkdown(m, m.content as string);
    writeFileSync(filepath, md);
    exported++;
  }

  return { exported, skipped };
}

// ─── Init vault structure ───────────────────────────────────────────────────

function initVault(): void {
  mkdirSync(VAULT_ROOT, { recursive: true });

  for (const wing of WINGS) {
    mkdirSync(join(VAULT_ROOT, wing), { recursive: true });
  }

  // Create default halls
  const defaultHalls: Record<string, string[]> = {
    agent: ["core", "rules", "skills"],
    user: ["profile", "preferences", "projects"],
    knowledge: ["decisions", "patterns", "insights", "reference"],
    experience: ["sessions", "outcomes", "errors"],
  };

  for (const [wing, halls] of Object.entries(defaultHalls)) {
    for (const hall of halls) {
      mkdirSync(join(VAULT_ROOT, wing, hall), { recursive: true });
    }
  }

  // Create README at vault root
  const readme = `# UltraThink Second Brain

Your personal knowledge vault. Edit files here — changes sync to the cloud DB.

## Structure

\`\`\`
vault/
├── agent/           ← WHO the agent IS
│   ├── core/        ← Identity, role, communication style (L0)
│   ├── rules/       ← Hard behavioral constraints (L1)
│   └── skills/      ← Skill performance history (L2)
├── user/            ← WHO the user IS
│   ├── profile/     ← Name, role, expertise (L0)
│   ├── preferences/ ← Tool, style, workflow prefs (L0)
│   └── projects/    ← Active projects (L2)
├── knowledge/       ← WHAT has been learned
│   ├── decisions/   ← Architectural decisions + rationale (L1)
│   ├── patterns/    ← Recurring solutions, code patterns (L1)
│   ├── insights/    ← Non-obvious findings (L2)
│   └── reference/   ← External links, docs pointers (L2)
└── experience/      ← WHAT happened
    ├── sessions/    ← Session summaries (L3)
    ├── outcomes/    ← What worked/didn't (L3)
    └── errors/      ← Failure patterns (L3)
\`\`\`

## File Format

Each file is markdown with YAML frontmatter:

\`\`\`markdown
---
id: uuid-from-db
wing: identity
hall: preference
category: preference
importance: 8
confidence: 0.9
tags: ["tailwind", "css"]
---

Your memory content here. Edit freely — changes sync to DB.
\`\`\`

## How It Works

- **You edit** files in Obsidian → synced to cloud DB on next session start
- **AI creates** memories → exported to vault on session end
- Vault always wins for user edits (source: "vault")
- Create new files in any wing/hall folder — they'll get an ID on first sync
`;

  const readmePath = join(VAULT_ROOT, "README.md");
  if (!existsSync(readmePath)) {
    writeFileSync(readmePath, readme);
  }

  console.log(`Vault initialized at ${VAULT_ROOT}`);
  console.log(`Wings: ${WINGS.join(", ")}`);
}

// ─── MOC Generation ─────────────────────────────────────────────────────────

/**
 * Generate Map of Content (MOC) files per wing: {wing}/_MOC.md
 * Lists all notes in the wing with [[wikilinks]] for Obsidian navigation.
 */
function generateMOCs(): void {
  for (const wing of WINGS) {
    const wingDir = join(VAULT_ROOT, wing);
    if (!existsSync(wingDir)) continue;

    const notes: { hall: string; name: string; path: string }[] = [];

    // Scan halls in this wing
    for (const entry of readdirSync(wingDir, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const hallDir = join(wingDir, entry.name);
      for (const file of readdirSync(hallDir, { withFileTypes: true })) {
        if (!file.name.endsWith(".md")) continue;
        const name = file.name.replace(/\.md$/, "");
        notes.push({ hall: entry.name, name, path: `${entry.name}/${name}` });
      }
    }

    if (notes.length === 0) continue;

    // Group by hall
    const byHall: Record<string, string[]> = {};
    for (const n of notes) {
      if (!byHall[n.hall]) byHall[n.hall] = [];
      byHall[n.hall].push(`- [[${n.path}|${n.name}]]`);
    }

    const sections = Object.entries(byHall)
      .map(([hall, links]) => `## ${hall}\n\n${links.join("\n")}`)
      .join("\n\n");

    const moc = `# ${wing} — Map of Content\n\n${sections}\n`;
    writeFileSync(join(wingDir, "_MOC.md"), moc);
  }
}

/**
 * Inject backlinks into vault files — "## Referenced by" section.
 */
async function injectBacklinks(): Promise<void> {
  const sql = getDb();
  const files = scanVault();
  const idToPath = new Map<string, string>();
  const idToSlug = new Map<string, string>();

  for (const f of files) {
    if (f.frontmatter.id) {
      idToPath.set(f.frontmatter.id as string, f.path);
      idToSlug.set(f.frontmatter.id as string, basename(f.path, ".md"));
    }
  }

  // Fetch all relations
  const relations = (await sql`
    SELECT source_id, target_id, relation_type FROM memory_relations
    WHERE valid_to IS NULL
  `) as any[];

  // Build backlink map: target → [{source, type}]
  const backlinks = new Map<string, { sourceId: string; type: string }[]>();
  for (const r of relations) {
    const target = r.target_id as string;
    if (!backlinks.has(target)) backlinks.set(target, []);
    backlinks.get(target)!.push({ sourceId: r.source_id as string, type: r.relation_type as string });
  }

  // Inject into files
  for (const f of files) {
    const id = f.frontmatter.id as string;
    if (!id) continue;
    const refs = backlinks.get(id);
    if (!refs || refs.length === 0) continue;

    // Build backlink section
    const refLines = refs
      .filter((ref) => idToSlug.has(ref.sourceId))
      .map((ref) => {
        const slug = idToSlug.get(ref.sourceId)!;
        const relPath = relative(dirname(f.path), dirname(idToPath.get(ref.sourceId)!));
        return `- [[${relPath ? relPath + "/" : ""}${slug}]] (${ref.type})`;
      });

    if (refLines.length === 0) continue;

    // Remove existing backlink section and append new one
    let content = f.content.replace(/\n## Referenced by\n[\s\S]*$/, "").trimEnd();
    content += `\n\n## Referenced by\n\n${refLines.join("\n")}\n`;

    const md = `---\n${f.rawFrontmatter}\n---\n\n${content}\n`;
    writeFileSync(f.path, md);
  }
}

// ─── Status ─────────────────────────────────────────────────────────────────

async function status(): Promise<void> {
  const files = scanVault();
  const withId = files.filter((f) => f.frontmatter.id);
  const withoutId = files.filter((f) => !f.frontmatter.id);

  const byWing: Record<string, number> = {};
  for (const f of files) {
    const rel = relative(VAULT_ROOT, f.path);
    const wing = rel.split("/")[0] || "unknown";
    byWing[wing] = (byWing[wing] || 0) + 1;
  }

  console.log(`\nVault: ${VAULT_ROOT}`);
  console.log(`Total files: ${files.length} (${withId.length} synced, ${withoutId.length} unsynced)`);
  console.log(`\nBy wing:`);
  for (const [wing, count] of Object.entries(byWing)) {
    console.log(`  ${wing}: ${count}`);
  }

  if (process.env.DATABASE_URL) {
    const sql = getDb();
    const [dbStats] = (await sql`
      SELECT COUNT(*) as total,
             COUNT(*) FILTER (WHERE wing IS NOT NULL) as structured
      FROM memories WHERE is_archived = false
    `) as any[];
    console.log(`\nDB: ${dbStats.total} memories (${dbStats.structured} with MemPalace structure)`);
  }
}

// ─── CLI ────────────────────────────────────────────────────────────────────

const command = process.argv[2];
const args = process.argv.slice(3);

async function main() {
  switch (command) {
    case "vault-to-db": {
      const result = await vaultToDb();
      console.log(
        `Vault → DB: ${result.synced} synced (${result.created} created, ${result.updated} updated, ${result.skipped} skipped)`
      );
      break;
    }
    case "db-to-vault": {
      const sessionId = args[0] || undefined;
      const result = await dbToVault(sessionId);
      console.log(`DB → Vault: ${result.exported} exported, ${result.skipped} skipped`);
      break;
    }
    case "init": {
      initVault();
      break;
    }
    case "status": {
      await status();
      break;
    }
    case "full-sync": {
      // Import vault edits first, then export DB memories
      const importResult = await vaultToDb();
      console.log(
        `Vault → DB: ${importResult.synced} synced (${importResult.created} new, ${importResult.updated} updated)`
      );
      const exportResult = await dbToVault();
      console.log(`DB → Vault: ${exportResult.exported} exported, ${exportResult.skipped} skipped`);
      // Generate MOCs after sync
      generateMOCs();
      console.log("MOCs generated");
      break;
    }
    case "rebuild": {
      // Wipe vault, re-init with new structure, export all, generate MOCs + backlinks
      const { rmSync } = await import("fs");
      if (existsSync(VAULT_ROOT)) {
        rmSync(VAULT_ROOT, { recursive: true, force: true });
        console.log(`Wiped ${VAULT_ROOT}`);
      }
      initVault();
      const rebuildExport = await dbToVault(undefined, { all: true });
      console.log(`DB → Vault: ${rebuildExport.exported} exported`);
      generateMOCs();
      console.log("MOCs generated");
      await injectBacklinks();
      console.log("Backlinks injected");
      break;
    }
    default:
      console.error(`Usage: vault-sync.ts <vault-to-db|db-to-vault|init|status|full-sync|rebuild> [session_id]`);
      process.exit(1);
  }
}

main().catch((err) => {
  console.error("Vault sync error:", err.message);
  process.exit(1);
});
