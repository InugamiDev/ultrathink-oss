/*
intent: Wrap @google/design.md export and normalize Ultra UI format aliases.
status: authored for ultra-ui.
next: Track upstream export format additions.
confidence: high
*/

import { spawnSync } from "node:child_process";

export type UltraUiExportFormat =
  | "tailwind"
  | "json-tailwind"
  | "css-tailwind"
  | "tokens"
  | "dtcg";

export interface ExportResult {
  ok: boolean;
  status: number;
  stdout: string;
  stderr: string;
  upstreamFormat: string;
}

export function normalizeExportFormat(format: string): string {
  if (format === "tokens") {
    return "dtcg";
  }

  return format;
}

export function runDesignMdExport(
  file: string,
  format: UltraUiExportFormat,
): ExportResult {
  const upstreamFormat = normalizeExportFormat(format);
  const result = spawnSync(
    "npx",
    ["-y", "@google/design.md", "export", "--format", upstreamFormat, file],
    { encoding: "utf8" },
  );

  const status = result.status ?? 1;

  return {
    ok: status === 0,
    status,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
    upstreamFormat,
  };
}

export function printExportResult(result: ExportResult): void {
  if (result.stdout) {
    process.stdout.write(result.stdout);
  }

  if (result.stderr) {
    process.stderr.write(result.stderr);
  }
}
