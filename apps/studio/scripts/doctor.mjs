#!/usr/bin/env node
// intent: pre-flight check — validate Studio's environment without launching the GUI
// status: done — covers node/claude/codex/scrapling presence, sidecar resolution,
//          MCP config, ~/.claude/skills/ symlinks, ANTHROPIC_API_KEY, recent session logs
// next: actually call /v1/messages with the user's key for a 1-token sanity ping

import { spawnSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { homedir, platform } from "node:os";
import { resolve, join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(__dirname, "..", "..", "..");

let pass = 0;
let warn = 0;
let fail = 0;

function ok(msg) {
  console.log(`  \x1b[32m✓\x1b[0m ${msg}`);
  pass++;
}
function note(msg) {
  console.log(`  \x1b[33m⚠\x1b[0m ${msg}`);
  warn++;
}
function bad(msg) {
  console.log(`  \x1b[31m✗\x1b[0m ${msg}`);
  fail++;
}
function section(title) {
  console.log(`\n\x1b[1m${title}\x1b[0m`);
}

function which(bin) {
  const r = spawnSync("/usr/bin/which", [bin], { encoding: "utf8" });
  if (r.status === 0) return r.stdout.trim();
  return null;
}

function tryVersion(bin, arg = "--version") {
  const r = spawnSync(bin, [arg], { encoding: "utf8", timeout: 5000 });
  if (r.status === 0) return r.stdout.trim().split("\n")[0];
  return null;
}

console.log(`\x1b[1m\x1b[36m▸ UltraThink Studio doctor\x1b[0m`);
console.log(`  repo:      ${REPO}`);
console.log(`  platform:  ${platform()}`);
console.log(`  node:      ${process.version}`);

section("Required runtimes");
const nodeBin = which("node");
nodeBin ? ok(`node @ ${nodeBin}`) : bad("node not on PATH — Tauri's GUI env may also be missing it");

const claudeBin = which("claude");
if (claudeBin) {
  const v = tryVersion(claudeBin) ?? "(unknown)";
  ok(`claude @ ${claudeBin} (${v})`);
  // NVM trap: macOS GUI apps inherit a stripped PATH from launchd that does
  // NOT include ~/.nvm/versions/node/*/bin. Even though `claude` works in the
  // terminal, the Tauri spawn will fail with ENOENT. Warn loudly.
  if (claudeBin.includes("/.nvm/")) {
    bad(
      `claude is under NVM (${claudeBin}). macOS GUI apps DON'T see ~/.nvm/ — Tauri will ENOENT on it.\n` +
        `         Fix: \`sudo ln -s ${claudeBin} /usr/local/bin/claude\`  OR use the Anthropic API (direct) adapter.`
    );
  } else if (claudeBin.includes("/Library/Application Support") || claudeBin.includes("/Volumes/")) {
    note(`claude in unusual location (${claudeBin}); may not be on GUI app PATH.`);
  }
} else {
  note("claude CLI not on PATH — adapter='claude' won't work, use 'anthropic-direct'");
}

const codexBin = which("codex");
codexBin ? ok(`codex @ ${codexBin}`) : note("codex CLI not on PATH — optional");

const scraplingBin = which("scrapling");
if (scraplingBin) ok(`scrapling @ ${scraplingBin}`);
else note('scrapling not on PATH — optional, install via `pipx install "scrapling[all]"`');

section("Sidecar resolution");
const sidecar = resolve(REPO, "packages", "studio-engine", "dist", "sidecar.js");
if (existsSync(sidecar)) ok(`sidecar.js found at ${sidecar}`);
else bad(`sidecar.js missing — run \`pnpm --filter @inuverse/studio-engine build\``);

section("API keys (env → fallback for Settings)");
process.env.ANTHROPIC_API_KEY
  ? ok("ANTHROPIC_API_KEY set in env")
  : note("ANTHROPIC_API_KEY not in env (Settings stores its own copy in localStorage)");
process.env.OPENAI_API_KEY
  ? ok("OPENAI_API_KEY set in env")
  : note("OPENAI_API_KEY not in env (optional unless using openai-compat or codex)");

section("MCP servers (.mcp.json)");
const mcpPath = join(REPO, ".mcp.json");
if (existsSync(mcpPath)) {
  try {
    const cfg = JSON.parse(readFileSync(mcpPath, "utf8"));
    const servers = Object.keys(cfg.mcpServers ?? {});
    ok(`${servers.length} servers registered: ${servers.join(", ")}`);
    for (const [name, def] of Object.entries(cfg.mcpServers ?? {})) {
      if (def.command && !existsSync(def.command) && !which(def.command)) {
        bad(`  ${name}: command "${def.command}" not found`);
      }
    }
  } catch (e) {
    bad(`.mcp.json malformed: ${e.message}`);
  }
} else {
  note(".mcp.json not found at repo root");
}

section("UltraThink skill registry (~/.claude/skills/)");
const skillsDir = join(homedir(), ".claude", "skills");
if (existsSync(skillsDir)) {
  const entries = readdirSync(skillsDir, { withFileTypes: true });
  const skillCount = entries.filter((e) => (e.isDirectory() || e.isSymbolicLink()) && !e.name.startsWith("_")).length;
  if (skillCount > 0) ok(`${skillCount} skills available globally`);
  else
    note(
      `Directory exists but empty — run \`scrapling-style sync\` from Settings or \`node packages/studio-engine/dist/skill-sync.js sync\``
    );
} else {
  note("~/.claude/skills/ doesn't exist — Studio will run without skill mesh");
}

section("Recent session logs");
const sessionsDir = join(homedir(), ".ultrathink-studio", "sessions");
if (existsSync(sessionsDir)) {
  const logs = readdirSync(sessionsDir).filter((f) => f.endsWith(".jsonl"));
  if (logs.length === 0) note("Sessions dir exists but no logs yet — run a turn first");
  else {
    const newest = logs
      .map((f) => ({ f, m: statSync(join(sessionsDir, f)).mtime }))
      .sort((a, b) => b.m.getTime() - a.m.getTime())[0];
    const ageMin = Math.round((Date.now() - newest.m.getTime()) / 60000);
    ok(`${logs.length} session log(s); newest: ${newest.f} (${ageMin}m ago)`);
  }
} else {
  note("No session logs yet — first turn will create them");
}

section("Build artifacts");
const studioDist = resolve(REPO, "apps", "studio", "dist", "index.html");
existsSync(studioDist)
  ? ok(`Studio frontend built at apps/studio/dist/`)
  : note(`apps/studio/dist/ missing — run \`pnpm --filter @inuverse/studio build\``);

const tauriBin = resolve(REPO, "apps", "studio", "src-tauri", "target", "debug", "ultrathink-studio");
existsSync(tauriBin)
  ? ok(`Tauri debug binary present`)
  : note(`Tauri debug binary not built — run \`pnpm --filter @inuverse/studio tauri:dev\``);

console.log("");
console.log(
  `\x1b[1mResult:\x1b[0m \x1b[32m${pass} pass\x1b[0m  \x1b[33m${warn} warn\x1b[0m  \x1b[31m${fail} fail\x1b[0m`
);
if (fail > 0) {
  console.log(`\n\x1b[31mFix the failures above before launching Studio.\x1b[0m`);
  process.exit(1);
}
if (warn > 0 && !claudeBin && !process.env.ANTHROPIC_API_KEY) {
  console.log(
    `\n\x1b[33mTip:\x1b[0m no claude CLI and no ANTHROPIC_API_KEY in env. Open Settings → Defaults → Agent backend → "Anthropic API (direct)" and paste a sk-ant-… key. That's the only path that works without the CLI.`
  );
}
process.exit(0);
