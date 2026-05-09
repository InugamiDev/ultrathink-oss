import { readFileSync, existsSync } from "fs";
import { resolve, dirname, join, relative } from "path";
import type { ImportInfo } from "./types.js";

const IMPORT_RE =
  /(?:import\s+(?:type\s+)?(?:\{([^}]+)\}|(\w+)(?:\s*,\s*\{([^}]+)\})?)\s+from\s+['"]([^'"]+)['"])|(?:export\s+(?:type\s+)?\{([^}]+)\}\s+from\s+['"]([^'"]+)['"])|(?:export\s+\*\s+(?:as\s+\w+\s+)?from\s+['"]([^'"]+)['"])/g;

const TS_EXTENSIONS = [".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"];

function resolveModulePath(specifier: string, fromFile: string, projectRoot: string): string | null {
  if (!specifier.startsWith(".") && !specifier.startsWith("/")) return null;

  const baseDir = dirname(fromFile);
  const candidate = resolve(baseDir, specifier);

  for (const ext of ["", ...TS_EXTENSIONS]) {
    const full = candidate + ext;
    if (existsSync(full)) return relative(projectRoot, full);
  }
  for (const ext of TS_EXTENSIONS) {
    const indexPath = join(candidate, `index${ext}`);
    if (existsSync(indexPath)) return relative(projectRoot, indexPath);
  }

  return null;
}

function parseNames(raw: string): string[] {
  return raw
    .split(",")
    .map((s) => {
      const parts = s.trim().split(/\s+as\s+/);
      return parts[0].replace(/^type\s+/, "").trim();
    })
    .filter(Boolean);
}

export function extractImports(filePath: string, projectRoot: string): ImportInfo[] {
  let content: string;
  try {
    content = readFileSync(filePath, "utf-8");
  } catch {
    return [];
  }

  const results: ImportInfo[] = [];
  let match: RegExpExecArray | null;

  IMPORT_RE.lastIndex = 0;

  while ((match = IMPORT_RE.exec(content)) !== null) {
    const [
      ,
      namedImports,
      defaultImport,
      additionalNamed,
      importModule,
      reExportNames,
      reExportModule,
      starReExportModule,
    ] = match;

    if (importModule) {
      const names: string[] = [];
      if (defaultImport) names.push(defaultImport);
      if (namedImports) names.push(...parseNames(namedImports));
      if (additionalNamed) names.push(...parseNames(additionalNamed));

      results.push({
        source_file: filePath,
        imported_names: names,
        module_specifier: importModule,
        resolved_path: resolveModulePath(importModule, filePath, projectRoot),
        is_reexport: false,
      });
    } else if (reExportModule) {
      results.push({
        source_file: filePath,
        imported_names: parseNames(reExportNames),
        module_specifier: reExportModule,
        resolved_path: resolveModulePath(reExportModule, filePath, projectRoot),
        is_reexport: true,
      });
    } else if (starReExportModule) {
      results.push({
        source_file: filePath,
        imported_names: ["*"],
        module_specifier: starReExportModule,
        resolved_path: resolveModulePath(starReExportModule, filePath, projectRoot),
        is_reexport: true,
      });
    }
  }

  return results;
}
