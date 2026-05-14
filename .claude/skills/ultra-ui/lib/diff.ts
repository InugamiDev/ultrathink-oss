/*
intent: Wrap the official @google/design.md diff command for version-over-version review.
status: authored for ultra-ui.
next: Add typed diff report fields after upstream schema stabilizes.
confidence: high
*/

import { spawnSync } from "node:child_process";

export interface DiffResult {
  ok: boolean;
  status: number;
  stdout: string;
  stderr: string;
  report: unknown | null;
}

function parseJson(stdout: string): unknown | null {
  if (!stdout.trim()) {
    return null;
  }

  try {
    return JSON.parse(stdout) as unknown;
  } catch {
    return null;
  }
}

export function runDesignMdDiff(before: string, after: string): DiffResult {
  const result = spawnSync(
    "npx",
    ["-y", "@google/design.md", "diff", "--format", "json", before, after],
    { encoding: "utf8" },
  );

  const status = result.status ?? 1;
  const stdout = result.stdout ?? "";
  const stderr = result.stderr ?? "";

  return {
    ok: status === 0,
    status,
    stdout,
    stderr,
    report: parseJson(stdout),
  };
}

export function printDiffResult(result: DiffResult): void {
  if (result.report) {
    process.stdout.write(`${JSON.stringify(result.report, null, 2)}\n`);
  } else if (result.stdout) {
    process.stdout.write(result.stdout);
  }

  if (result.stderr) {
    process.stderr.write(result.stderr);
  }
}
