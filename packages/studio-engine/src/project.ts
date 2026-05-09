// intent: project lifecycle helpers — resolve, init, list
// status: done (basic surface; framework-detection in next iteration)
// next: framework auto-detection (next, vite, remix, astro) for preview integration
// confidence: high
//
// Studio projects live under ~/Studio/projects/<slug>/ by default. The first
// time a user invokes `ut studio "<prompt>"` we slug-name the project from the
// prompt and create the directory; subsequent prompts in the same dir resume.

import { mkdir, readdir, stat } from "node:fs/promises";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { join, resolve, basename } from "node:path";

export interface ProjectInfo {
  /** Absolute path on disk. */
  dir: string;
  /** Display name (the directory's basename). */
  name: string;
  /** Last-modified time (used for "recent" sorting). */
  lastModified: Date;
}

export interface ResolveOptions {
  /** Plain-English prompt — used to slug a new project name when needed. */
  prompt: string;
  /** Override Studio root. Defaults to ~/Studio. */
  studioRoot?: string;
  /** If passed and exists, resume that project; otherwise create a new one. */
  projectDir?: string;
}

export function studioRoot(): string {
  return process.env.ULTRATHINK_STUDIO_ROOT || join(homedir(), "Studio");
}

/**
 * Resolve a project directory for a given prompt invocation.
 * - explicit projectDir that exists → use it
 * - explicit projectDir that doesn't exist → create it
 * - no projectDir → slug from prompt, create under studioRoot()/projects/<slug>
 */
export async function resolveProject(opts: ResolveOptions): Promise<ProjectInfo> {
  const root = opts.studioRoot ?? studioRoot();
  const projectsDir = join(root, "projects");
  await mkdir(projectsDir, { recursive: true });

  let dir: string;
  if (opts.projectDir) {
    dir = resolve(opts.projectDir);
  } else {
    const slug = slugifyPrompt(opts.prompt);
    dir = await uniqueDir(projectsDir, slug);
  }
  await mkdir(dir, { recursive: true });

  const s = await stat(dir);
  return {
    dir,
    name: basename(dir),
    lastModified: s.mtime,
  };
}

export async function listProjects(root = studioRoot()): Promise<ProjectInfo[]> {
  const projectsDir = join(root, "projects");
  if (!existsSync(projectsDir)) return [];
  const entries = await readdir(projectsDir, { withFileTypes: true });
  const out: ProjectInfo[] = [];
  for (const e of entries) {
    if (!e.isDirectory()) continue;
    const dir = join(projectsDir, e.name);
    const s = await stat(dir).catch(() => null);
    if (!s) continue;
    out.push({ dir, name: e.name, lastModified: s.mtime });
  }
  return out.sort((a, b) => b.lastModified.getTime() - a.lastModified.getTime());
}

function slugifyPrompt(prompt: string): string {
  const trimmed = prompt
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  return trimmed || "untitled";
}

async function uniqueDir(parent: string, slug: string): Promise<string> {
  const base = join(parent, slug);
  if (!existsSync(base)) return base;
  let i = 2;
  while (existsSync(join(parent, `${slug}-${i}`))) i++;
  return join(parent, `${slug}-${i}`);
}
