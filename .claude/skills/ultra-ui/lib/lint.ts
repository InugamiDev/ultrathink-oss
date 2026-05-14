/*
intent: Wrap the official @google/design.md lint command and normalize JSON output.
status: authored for ultra-ui.
next: Update argument order if upstream CLI changes.
confidence: high
*/

import { spawnSync } from "node:child_process";

export interface LintFinding {
  rule?: string;
  severity: "error" | "warning" | "info" | string;
  path?: string;
  message: string;
}

export interface LintReport {
  findings: LintFinding[];
  summary: {
    errors: number;
    warnings: number;
    info?: number;
    infos?: number;
  };
  [key: string]: unknown;
}

export interface LintResult {
  ok: boolean;
  status: number;
  stdout: string;
  stderr: string;
  report: LintReport | null;
}

function parseReport(stdout: string): LintReport | null {
  if (!stdout.trim()) {
    return null;
  }

  try {
    return JSON.parse(stdout) as LintReport;
  } catch {
    return null;
  }
}

export function runDesignMdLint(file: string): LintResult {
  const result = spawnSync(
    "npx",
    ["-y", "@google/design.md", "lint", "--format", "json", file],
    { encoding: "utf8" },
  );

  const status = result.status ?? 1;
  const stdout = result.stdout ?? "";
  const stderr = result.stderr ?? "";
  const report = parseReport(stdout);

  return {
    ok: status === 0 && (report?.summary.errors ?? 0) === 0,
    status,
    stdout,
    stderr,
    report,
  };
}

export function printLintResult(result: LintResult): void {
  if (result.report) {
    process.stdout.write(`${JSON.stringify(result.report, null, 2)}\n`);
  } else if (result.stdout) {
    process.stdout.write(result.stdout);
  }

  if (result.stderr) {
    process.stderr.write(result.stderr);
  }
}

export function formatFindings(report: LintReport): string[] {
  return report.findings.map((finding) => {
    const path = finding.path ? `${finding.path}: ` : "";
    const rule = finding.rule ? `[${finding.rule}] ` : "";
    return `${finding.severity.toUpperCase()} ${rule}${path}${finding.message}`;
  });
}
