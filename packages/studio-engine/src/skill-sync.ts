#!/usr/bin/env node
// intent: sync the local UltraThink skill registry from a curated Git source
// status: scaffolded (clone-then-symlink works; stricter integrity checks later)
// next: signed manifest, atomic swap with rollback, version pinning per skill
// confidence: medium — relies on `git` being on PATH; falls back to tarball if not
//
// CLI:
//   node skill-sync.js status        → {installed, lastSync, source}
//   node skill-sync.js install <repo> → clone into ~/.ultrathink-studio/skills-<sha>
//   node skill-sync.js update         → re-pull current source, swap symlink atomically
//   node skill-sync.js list           → list locally available skills

import { spawn as spawnProcess } from "node:child_process";
import { mkdir, readdir, readFile, rm, stat, symlink, unlink, writeFile } from "node:fs/promises";
import { existsSync, readdirSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const STUDIO_HOME = process.env.ULTRATHINK_STUDIO_HOME || join(homedir(), ".ultrathink-studio");
const SKILLS_LINK = join(STUDIO_HOME, "skills");
const META_FILE = join(STUDIO_HOME, "skill-source.json");
// No canonical remote registry yet — UltraThink skills live in the main repo
// at <repo>/.claude/skills/. Set ULTRATHINK_SKILL_SOURCE=<git-url> to point at
// a curated remote once one exists.
const DEFAULT_SOURCE = process.env.ULTRATHINK_SKILL_SOURCE || null;

/**
 * Discover skills already on disk in priority order:
 *  1. Explicit linked dir at ~/.ultrathink-studio/skills (set by `install`)
 *  2. The user's repo at <cwd>/.claude/skills/ — walks up to find it
 *  3. ~/.claude/skills/ — the global Claude Code config dir
 * Returns the directory + how it was found, or null.
 */
function discoverLocalSkills(): { path: string; origin: "linked" | "repo" | "claude-config" } | null {
  if (existsSync(SKILLS_LINK)) {
    return { path: SKILLS_LINK, origin: "linked" };
  }
  // Walk up looking for .claude/skills
  let dir = process.cwd();
  while (true) {
    const candidate = join(dir, ".claude", "skills");
    if (existsSync(candidate)) {
      return { path: candidate, origin: "repo" };
    }
    const parent = join(dir, "..");
    if (parent === dir) break;
    dir = parent;
  }
  const claudeGlobal = join(homedir(), ".claude", "skills");
  if (existsSync(claudeGlobal)) {
    return { path: claudeGlobal, origin: "claude-config" };
  }
  return null;
}

function countSkillsAt(path: string): number {
  try {
    return readdirSync(path, { withFileTypes: true }).filter(
      (e) => (e.isDirectory() || e.isSymbolicLink()) && !e.name.startsWith("_")
    ).length;
  } catch {
    return 0;
  }
}

interface Meta {
  source: string;
  installedAt: string;
  installedAtPath: string;
}

async function ensureHome(): Promise<void> {
  await mkdir(STUDIO_HOME, { recursive: true });
}

async function readMeta(): Promise<Meta | null> {
  try {
    return JSON.parse(await readFile(META_FILE, "utf8")) as Meta;
  } catch {
    return null;
  }
}

async function writeMeta(meta: Meta): Promise<void> {
  await writeFile(META_FILE, JSON.stringify(meta, null, 2));
}

function emit(payload: Record<string, unknown>): void {
  process.stdout.write(JSON.stringify(payload) + "\n");
}

function run(cmd: string, args: string[]): Promise<number> {
  return new Promise((res) => {
    const proc = spawnProcess(cmd, args, { stdio: "inherit" });
    proc.on("close", (code) => res(code ?? 0));
    proc.on("error", () => res(-1));
  });
}

async function status(): Promise<void> {
  await ensureHome();
  const meta = await readMeta();
  const discovered = discoverLocalSkills();
  emit({
    installed: discovered !== null,
    skillCount: discovered ? countSkillsAt(discovered.path) : 0,
    source: meta?.source ?? DEFAULT_SOURCE ?? null,
    installedAt: meta?.installedAt ?? null,
    installedAtPath: meta?.installedAtPath ?? null,
    discoveredOrigin: discovered?.origin ?? null,
    discoveredPath: discovered?.path ?? null,
  });
}

async function install(source: string): Promise<void> {
  await ensureHome();
  emit({ kind: "install-start", source });
  const stamp = new Date()
    .toISOString()
    .replace(/[^0-9]/g, "")
    .slice(0, 14);
  const dst = join(STUDIO_HOME, `skills-${stamp}`);
  const code = await run("git", ["clone", "--depth", "1", source, dst]);
  if (code !== 0) {
    emit({ kind: "install-error", message: `git clone exited ${code}` });
    process.exit(1);
  }
  // Atomically swap the symlink: write to a temp link, rename over the existing one
  const tmpLink = `${SKILLS_LINK}.tmp`;
  if (existsSync(tmpLink)) await unlink(tmpLink);
  await symlink(dst, tmpLink, "dir");
  if (existsSync(SKILLS_LINK)) {
    // best-effort: read existing target so we can clean it up after swap
    const oldTarget = await readLink(SKILLS_LINK);
    await unlink(SKILLS_LINK);
    if (oldTarget) {
      // schedule old target for removal but only if it's under STUDIO_HOME (safety)
      if (oldTarget.startsWith(STUDIO_HOME)) {
        // eslint-disable-next-line @typescript-eslint/no-floating-promises
        rm(oldTarget, { recursive: true, force: true }).catch(() => undefined);
      }
    }
  }
  await symlink(dst, SKILLS_LINK, "dir");
  await unlink(tmpLink).catch(() => undefined);
  await writeMeta({
    source,
    installedAt: new Date().toISOString(),
    installedAtPath: dst,
  });
  emit({ kind: "install-done", path: dst });
}

async function update(): Promise<void> {
  const meta = await readMeta();
  const src = meta?.source ?? DEFAULT_SOURCE;
  if (!src) {
    emit({
      kind: "update-error",
      message:
        "No remote source configured. Set ULTRATHINK_SKILL_SOURCE or run `skill-sync sync` to symlink local skills.",
    });
    process.exit(2);
  }
  await install(src);
}

async function list(): Promise<void> {
  // Resolve the skills dir in priority order: studio-link → repo → ~/.claude/skills.
  // Most users have ~/.claude/skills/ populated by install.sh — relying solely on
  // SKILLS_LINK (~/.ultrathink-studio/skills) returned an empty list for everyone
  // who never opened Studio's "Install skill kit" flow.
  const discovered = discoverLocalSkills();
  const root = discovered?.path;
  if (!root || !existsSync(root)) {
    emit({ skills: [], origin: "none" });
    return;
  }
  const entries = await readdir(root, { withFileTypes: true });
  const skills: Array<{ name: string; layer?: string; description?: string }> = [];
  for (const e of entries) {
    if (!e.isDirectory() || e.name.startsWith("_")) continue;
    const skillFile = join(root, e.name, "SKILL.md");
    if (!existsSync(skillFile)) continue;
    const head = await readFile(skillFile, "utf8")
      .then((s) => s.slice(0, 1500))
      .catch(() => "");
    const fm = parseFrontmatter(head);
    skills.push({
      name: fm.name ?? e.name,
      layer: fm.layer,
      description: fm.description,
    });
  }
  emit({ skills, origin: discovered?.origin ?? "claude-config" });
}

/**
 * Symlink every skill from a source registry (UltraThink's <repo>/.claude/skills/)
 * into the global ~/.claude/skills/ so any Claude Code session anywhere picks
 * them up. This is the right answer for the "no skills found" problem when
 * Studio runs from ~/Studio/projects/<foo>/ — the walk-up never reaches the
 * UltraThink repo, but ~/.claude/skills/ is always probed.
 *
 * Strategy: per-skill symlinks (not a whole-dir symlink) so user-installed
 * skills in ~/.claude/skills/ aren't shadowed wholesale.
 */
async function syncToGlobal(): Promise<void> {
  // Find the source registry: explicit linked dir, or repo .claude/skills, or env override
  const envSrc = process.env.ULTRATHINK_SKILL_REPO;
  let source: string | null = null;

  if (envSrc && existsSync(envSrc)) {
    source = envSrc;
  } else if (existsSync(SKILLS_LINK)) {
    source = SKILLS_LINK;
  } else {
    // Walk up looking for .claude/skills (we may run from /tmp or anywhere)
    let dir = process.cwd();
    while (true) {
      const candidate = join(dir, ".claude", "skills");
      if (existsSync(candidate)) {
        source = candidate;
        break;
      }
      const parent = join(dir, "..");
      if (parent === dir) break;
      dir = parent;
    }
  }

  if (!source) {
    emit({
      kind: "sync-error",
      message:
        "No source registry found. Set ULTRATHINK_SKILL_REPO=<path> or run `skill-sync install <git-url>` first.",
    });
    process.exit(1);
  }

  const globalDir = join(homedir(), ".claude", "skills");
  await mkdir(globalDir, { recursive: true });

  emit({ kind: "sync-start", source, target: globalDir });

  const fs = await import("node:fs/promises");
  const entries = await readdir(source, { withFileTypes: true });
  let linked = 0;
  let skipped = 0;
  let failed = 0;

  for (const entry of entries) {
    if (!entry.isDirectory() || entry.name.startsWith("_")) continue;
    const src = join(source, entry.name);
    const dst = join(globalDir, entry.name);

    // If the target already points at this exact source, skip (idempotent re-run)
    try {
      const existing = await fs.readlink(dst);
      if (existing === src) {
        skipped++;
        continue;
      }
      // Target exists but points elsewhere — overwrite (UltraThink wins)
      await fs.unlink(dst);
    } catch {
      // didn't exist OR not a symlink (real dir); if real dir, leave user's content alone
      try {
        const meta = await fs.stat(dst);
        if (meta.isDirectory()) {
          // back it up then symlink
          await fs.rename(dst, `${dst}.user-backup-${Date.now()}`);
        }
      } catch {
        // didn't exist — clean slate
      }
    }

    try {
      await fs.symlink(src, dst, "dir");
      linked++;
    } catch (err) {
      failed++;
      emit({ kind: "sync-skill-failed", name: entry.name, error: String(err) });
    }
  }

  emit({ kind: "sync-done", linked, skipped, failed, source, target: globalDir });
}

/**
 * Install or update the UltraThink OSS skill kit.
 * Clones (or pulls) https://github.com/InugamiDev/ultrathink-core into ~/.ultrathink-core,
 * then symlinks every skill from there into ~/.claude/skills/ for global pickup.
 *
 * Idempotent: if the dir exists, runs `git pull` instead of clone.
 */
async function installOssKit(source: string): Promise<void> {
  const target = join(homedir(), ".ultrathink-core");
  emit({ kind: "oss-install-start", source, target });

  if (existsSync(target)) {
    const code = await run("git", ["-C", target, "pull", "--ff-only"]);
    if (code !== 0) {
      emit({
        kind: "oss-install-error",
        message: `git pull exited ${code} (target=${target}). Try removing the dir and reinstalling.`,
      });
      process.exit(1);
    }
    emit({ kind: "oss-install-pull", target });
  } else {
    const code = await run("git", ["clone", "--depth", "1", source, target]);
    if (code !== 0) {
      emit({ kind: "oss-install-error", message: `git clone exited ${code}` });
      process.exit(1);
    }
    emit({ kind: "oss-install-clone", target });
  }

  const skillsDir = join(target, ".claude", "skills");
  if (!existsSync(skillsDir)) {
    emit({
      kind: "oss-install-error",
      message: `Cloned but no .claude/skills/ found inside ${target}. The repo may have moved skills elsewhere.`,
    });
    process.exit(1);
  }

  process.env.ULTRATHINK_SKILL_REPO = skillsDir;
  await syncToGlobal();
  emit({ kind: "oss-install-done", target, skillsDir });
}

async function ossStatus(): Promise<void> {
  const target = join(homedir(), ".ultrathink-core");
  const skillsDir = join(target, ".claude", "skills");
  const installed = existsSync(skillsDir);
  emit({
    kind: "oss-status",
    installed,
    path: target,
    skillsDir: installed ? skillsDir : null,
    skillCount: installed ? countSkillsAt(skillsDir) : 0,
  });
}

async function readLink(path: string): Promise<string | null> {
  try {
    const fs = await import("node:fs/promises");
    return await fs.readlink(path);
  } catch {
    return null;
  }
}

function parseFrontmatter(content: string): Record<string, string> {
  const m = content.match(/^---\n([\s\S]*?)\n---/);
  if (!m) return {};
  const out: Record<string, string> = {};
  for (const line of m[1].split("\n")) {
    const sep = line.indexOf(":");
    if (sep < 0) continue;
    const k = line.slice(0, sep).trim();
    const v = line.slice(sep + 1).trim();
    if (k && v) out[k] = v;
  }
  return out;
}

async function main(): Promise<void> {
  // touch unused imports to avoid TS6133 if a linter prunes them later
  void stat;
  const op = process.argv[2] ?? "status";
  switch (op) {
    case "status":
      await status();
      break;
    case "install": {
      const src = process.argv[3] ?? DEFAULT_SOURCE;
      if (!src) {
        emit({ kind: "install-error", message: "No source provided and no remote configured." });
        process.exit(2);
      }
      await install(src);
      break;
    }
    case "update":
      await update();
      break;
    case "list":
      await list();
      break;
    case "sync":
      await syncToGlobal();
      break;
    case "install-oss": {
      const src =
        process.argv[3] ?? process.env.ULTRATHINK_OSS_REPO ?? "https://github.com/InugamiDev/ultrathink-core.git";
      await installOssKit(src);
      break;
    }
    case "oss-status":
      await ossStatus();
      break;
    default:
      process.stderr.write(`unknown op: ${op}\n`);
      process.exit(2);
  }
}

main().catch((err) => {
  emit({ kind: "error", message: err instanceof Error ? err.message : String(err) });
  process.exit(1);
});
