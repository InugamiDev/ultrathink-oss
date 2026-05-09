import { execFileSync } from "child_process";
import type { VFSEntry, SymbolKind } from "./types.js";

const VFS_BIN = process.env.VFS_BIN || `${process.env.HOME}/go/bin/vfs`;

const KIND_MAP: Record<string, SymbolKind> = {
  function: "function",
  class: "class",
  interface: "interface",
  type: "type",
  enum: "enum",
  const: "variable",
  let: "variable",
  var: "variable",
  method: "method",
  property: "property",
  module: "module",
  namespace: "namespace",
};

function inferKind(declaration: string): SymbolKind {
  const match = declaration.match(
    /^(?:export\s+)?(?:default\s+)?(?:async\s+)?(?:abstract\s+)?(function|class|interface|type|enum|const|let|var|module|namespace)\b/
  );
  if (match) return KIND_MAP[match[1]] || "variable";
  if (/^(?:async\s+)?[a-zA-Z_$]\w*\s*\(/.test(declaration)) return "method";
  return "variable";
}

function parseName(declaration: string): string {
  const cleaned = declaration
    .replace(/^(?:export\s+)?(?:default\s+)?(?:async\s+)?(?:abstract\s+)?/, "")
    .replace(/^(function|class|interface|type|enum|const|let|var|module|namespace)\s+/, "");
  const match = cleaned.match(/^([a-zA-Z_$][\w$]*)/);
  return match ? match[1] : cleaned.split(/[\s(<:={]/)[0].trim();
}

export function parseVFSOutput(raw: string): VFSEntry[] {
  const entries: VFSEntry[] = [];

  for (const line of raw.split("\n")) {
    if (!line.trim()) continue;

    const match = line.match(/^(.+?):(\d+):\s+(.+)$/);
    if (!match) continue;

    const [, filePath, lineStr, declaration] = match;
    const lineNumber = parseInt(lineStr, 10);
    const isExported = declaration.startsWith("export ");
    const kind = inferKind(declaration);
    const name = parseName(declaration);
    const signature = declaration.replace(/\s*\{\s*\.\.\.\s*\}\s*$/, "").trim();

    entries.push({
      file_path: filePath,
      line_number: lineNumber,
      is_exported: isExported,
      kind,
      name,
      signature,
      raw: line,
    });
  }

  return entries;
}

// Note: uses execFileSync (not exec) — safe against shell injection
export function extractSymbols(paths: string[]): VFSEntry[] {
  try {
    const output = execFileSync(VFS_BIN, paths, {
      encoding: "utf-8",
      timeout: 30_000,
      maxBuffer: 10 * 1024 * 1024,
    });
    return parseVFSOutput(output);
  } catch (err) {
    console.error(`[code-intel] Failed to extract symbols from ${paths.join(", ")}:`, (err as Error).message);
    return [];
  }
}
