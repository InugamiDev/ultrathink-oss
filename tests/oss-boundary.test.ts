import { execFileSync } from "child_process";
import { mkdtempSync, readFileSync, readdirSync, rmSync, statSync } from "fs";
import { tmpdir } from "os";
import { join, relative, resolve } from "path";
import { describe, expect, it } from "vitest";

const ROOT = resolve(__dirname, "..");
const TEXT_EXTENSIONS = new Set([
  "",
  ".cjs",
  ".css",
  ".env",
  ".example",
  ".gitignore",
  ".html",
  ".js",
  ".json",
  ".jsx",
  ".md",
  ".mjs",
  ".ps1",
  ".sh",
  ".sql",
  ".toml",
  ".ts",
  ".tsx",
  ".txt",
  ".yaml",
  ".yml",
]);

const FORBIDDEN_PATHS = [
  ".claude/hooks/decision-engine.ts",
  ".claude/hooks/dist/decision-engine.js",
  ".claude/hooks/post-edit-codeintel.sh",
  ".claude/hooks/codeintel-session-check.sh",
  ".claude/skills/agora",
  ".claude/skills/_affiliate-references",
  "dashboard/app/api/agora",
  "dashboard/app/api/ai",
  "dashboard/app/api/analytics",
  "dashboard/app/api/cmo",
  "dashboard/app/api/kanban",
  "dashboard/app/api/notify",
  "dashboard/app/api/ops",
  "dashboard/app/api/testing",
  "dashboard/lib/agora",
  "dashboard/app/cmo",
  "dashboard/app/kanban",
  "dashboard/app/ops",
  "dashboard/app/testing",
  "dashboard/app/voice",
  "mcp/agora",
  "packages/code-intel",
  "packages/memory/src/adaptation.d.ts",
  "packages/memory/src/adaptation.ts",
  "packages/memory/src/team-tekio.d.ts",
  "packages/memory/src/team-tekio.ts",
  "packages/memory/scripts/archive-bad-identity.ts",
  "packages/memory/scripts/archive-bad-prefs.ts",
  "packages/memory/scripts/archive-failures.ts",
  "packages/memory/scripts/cache-adaptations.ts",
  "packages/memory/scripts/re-enrich-all.ts",
  "packages/memory/scripts/seed-adaptations.ts",
  "packages/memory/scripts/wheel-count.ts",
];

const FORBIDDEN_CONTENT = [
  { label: "local absolute user path", pattern: /\/Users\/inugami\b/ },
  {
    label: "provider secret token",
    pattern:
      /\b(?:sk-ant-[A-Za-z0-9_-]{20,}|sk-proj-[A-Za-z0-9_-]{20,}|xox[baprs]-[A-Za-z0-9-]{20,}|ghp_[A-Za-z0-9_]{20,}|github_pat_[A-Za-z0-9_]{20,}|AIza[A-Za-z0-9_-]{35})\b/,
  },
];

function listFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);
    const stat = statSync(path);
    if (stat.isDirectory()) {
      return listFiles(path);
    }
    return [path];
  });
}

function hasPath(root: string, path: string): boolean {
  try {
    statSync(join(root, path));
    return true;
  } catch {
    return false;
  }
}

function isTextFile(path: string): boolean {
  const name = path.split("/").pop() ?? "";
  const ext = name.includes(".") ? name.slice(name.lastIndexOf(".")) : "";
  return TEXT_EXTENSIONS.has(ext);
}

describe("OSS export boundary", () => {
  it("excludes Core-only files, secrets, paid endpoints, and local paths", () => {
    const outDir = mkdtempSync(join(tmpdir(), "ultrathink-oss-"));

    try {
      execFileSync("bash", [resolve(ROOT, "scripts/build-oss.sh")], {
        cwd: ROOT,
        env: { ...process.env, OSS_OUT_DIR: outDir },
        encoding: "utf-8",
        stdio: ["ignore", "pipe", "pipe"],
        timeout: 30000,
      });

      const leakedPaths = FORBIDDEN_PATHS.filter((path) => hasPath(outDir, path));
      expect(leakedPaths).toEqual([]);

      const scannedFiles = listFiles(outDir)
        .map((path) => ({ path, relativePath: relative(outDir, path) }))
        .filter(({ path }) => isTextFile(path));

      const leakedContent = scannedFiles.flatMap(({ path, relativePath }) => {
        const content = readFileSync(path, "utf-8");
        return FORBIDDEN_CONTENT.flatMap(({ label, pattern }) =>
          pattern.test(content) ? [`${relativePath}: ${label}`] : []
        );
      });

      expect(leakedContent).toEqual([]);
    } finally {
      rmSync(outDir, { recursive: true, force: true });
    }
  });
});
