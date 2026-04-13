// intent: persist RunState to ~/.ultrathink/harness/runs/<id>.json. Canonical
//         location so both the harness and the existing forge skill can find runs.
// status: done
// next: bridge to the forge skill's schema at ~/.ultrathink/forge/projects/<hash>.json
//       so a forge run resumes inside the harness and vice-versa.
// confidence: high

import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import type { RunState } from "../store/types.js";

const BASE = join(homedir(), ".ultrathink", "harness", "runs");

export function runIdFor(seed: string): string {
  return createHash("sha256").update(seed).digest("hex").slice(0, 12);
}

export function runPath(id: string): string {
  return join(BASE, `${id}.json`);
}

export function saveRun(run: RunState): void {
  mkdirSync(BASE, { recursive: true });
  writeFileSync(runPath(run.id), JSON.stringify(run, null, 2), "utf8");
}

export function loadRun(id: string): RunState | null {
  const p = runPath(id);
  if (!existsSync(p)) return null;
  try {
    return JSON.parse(readFileSync(p, "utf8")) as RunState;
  } catch {
    return null;
  }
}

export function listRuns(): RunState[] {
  if (!existsSync(BASE)) return [];
  const files = readdirSync(BASE).filter((f) => f.endsWith(".json"));
  const runs: RunState[] = [];
  for (const f of files) {
    try {
      runs.push(JSON.parse(readFileSync(join(BASE, f), "utf8")));
    } catch {
      // skip corrupt files
    }
  }
  return runs.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}
