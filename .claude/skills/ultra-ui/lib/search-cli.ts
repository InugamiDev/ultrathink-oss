/*
intent: Shell to the copied ui-ux-pro-max Python search CLI and parse top-row output.
status: authored for ultra-ui.
next: Prefer a JSON output mode if scripts/search.py adds one.
confidence: medium
*/

import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export type UltraUiSearchDomain =
  | "style"
  | "color"
  | "palette"
  | "font"
  | "typography"
  | "product";

export interface SearchResult {
  keyword: string;
  domain: UltraUiSearchDomain;
  upstreamDomain: string;
  row: Record<string, string>;
  stdout: string;
  stderr: string;
  status: number;
}

const DOMAIN_MAP: Record<UltraUiSearchDomain, string> = {
  style: "style",
  color: "color",
  palette: "color",
  font: "typography",
  typography: "typography",
  product: "product",
};

function skillRoot(): string {
  const here = dirname(fileURLToPath(import.meta.url));
  const candidates = [resolve(here, ".."), resolve(here, "../..")];

  for (const candidate of candidates) {
    if (existsSync(resolve(candidate, "scripts/search.py"))) {
      return candidate;
    }
  }

  throw new Error("Could not locate ../scripts/search.py from ultra-ui lib.");
}

export function parseSearchRow(stdout: string): Record<string, string> {
  const row: Record<string, string> = {};

  for (const line of stdout.split(/\r?\n/)) {
    const match = line.match(/^- \*\*(.+?):\*\*\s*(.*)$/);
    if (!match) {
      continue;
    }

    const [, key, value] = match;
    row[key.trim()] = value.trim();
  }

  return row;
}

export function searchTopRow(
  keyword: string,
  domain: UltraUiSearchDomain,
): SearchResult {
  const upstreamDomain = DOMAIN_MAP[domain];
  const script = resolve(skillRoot(), "scripts/search.py");
  const result = spawnSync(
    "python3",
    [script, keyword, "--domain", upstreamDomain, "-n", "1"],
    { encoding: "utf8" },
  );

  const status = result.status ?? 1;
  const stdout = result.stdout ?? "";
  const stderr = result.stderr ?? "";

  if (status !== 0) {
    throw new Error(
      `search.py failed for domain "${upstreamDomain}" and keyword "${keyword}".\n${stderr || stdout}`,
    );
  }

  const row = parseSearchRow(stdout);
  if (Object.keys(row).length === 0) {
    throw new Error(
      `search.py returned no parseable result for domain "${upstreamDomain}" and keyword "${keyword}".`,
    );
  }

  return {
    keyword,
    domain,
    upstreamDomain,
    row,
    stdout,
    stderr,
    status,
  };
}
