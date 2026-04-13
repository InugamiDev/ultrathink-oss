// intent: project directory resolution — determines where the harness operates.
//         Supports --dir flag, interactive selection, and cwd fallback.
// status: done
// confidence: high

import { existsSync, readdirSync, statSync } from "node:fs";
import { resolve, basename } from "node:path";
import { homedir } from "node:os";

let projectDir: string = process.cwd();

export function getProjectDir(): string {
  return projectDir;
}

export function setProjectDir(dir: string): void {
  const resolved = resolve(dir);
  if (!existsSync(resolved)) {
    throw new Error(`Directory does not exist: ${resolved}`);
  }
  projectDir = resolved;
}

export function projectName(): string {
  return basename(projectDir);
}

/** Quick heuristic: does this look like a project root? */
export function isProjectRoot(dir: string): boolean {
  const markers = [
    "package.json",
    "Cargo.toml",
    "go.mod",
    "pyproject.toml",
    "requirements.txt",
    "Gemfile",
    "pom.xml",
    "build.gradle",
    ".git",
    "CLAUDE.md",
  ];
  return markers.some((m) => existsSync(resolve(dir, m)));
}

/** Scan common project directories for quick selection */
export function discoverProjects(): { path: string; name: string; hasGit: boolean }[] {
  const candidates: string[] = [];
  const home = homedir();

  // Common project directories
  const searchDirs = [
    resolve(home, "Documents"),
    resolve(home, "Projects"),
    resolve(home, "Developer"),
    resolve(home, "dev"),
    resolve(home, "code"),
    resolve(home, "src"),
    resolve(home, "workspace"),
    resolve(home, "repos"),
    resolve(home, "Documents", "GitHub"),
  ];

  for (const dir of searchDirs) {
    if (!existsSync(dir)) continue;
    try {
      const entries = readdirSync(dir);
      for (const entry of entries) {
        if (entry.startsWith(".")) continue;
        const full = resolve(dir, entry);
        try {
          if (statSync(full).isDirectory() && isProjectRoot(full)) {
            candidates.push(full);
          }
        } catch {
          // skip inaccessible
        }
      }
    } catch {
      // skip inaccessible directories
    }
  }

  // Deduplicate and sort by name
  const seen = new Set<string>();
  return candidates
    .filter((p) => {
      if (seen.has(p)) return false;
      seen.add(p);
      return true;
    })
    .map((p) => ({
      path: p,
      name: basename(p),
      hasGit: existsSync(resolve(p, ".git")),
    }))
    .sort((a, b) => a.name.localeCompare(b.name))
    .slice(0, 20); // cap at 20
}
