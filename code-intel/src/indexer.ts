import { createHash } from "crypto";
import { readFileSync, readdirSync } from "fs";
import { join, relative, extname, basename, resolve } from "path";
import { config } from "dotenv";
import { getClient, rows } from "./client.js";
import { extractSymbols } from "./extractor.js";
import { extractImports } from "./resolver.js";
import type { CIProject } from "./types.js";

config({ path: join(import.meta.dirname, "../../.env") });

const INDEXABLE_EXTENSIONS = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
  ".go",
  ".rs",
  ".py",
  ".rb",
  ".java",
  ".kt",
  ".c",
  ".cpp",
  ".h",
  ".hpp",
  ".cs",
  ".swift",
]);

const SKIP_DIRS = new Set([
  "node_modules",
  ".git",
  "dist",
  "build",
  ".next",
  "__pycache__",
  ".cache",
  "vendor",
  "target",
]);

function hashFile(filePath: string): string {
  const content = readFileSync(filePath);
  return createHash("sha256").update(content).digest("hex");
}

function collectSourceFiles(dir: string): string[] {
  const files: string[] = [];

  function walk(d: string) {
    for (const entry of readdirSync(d, { withFileTypes: true })) {
      if (entry.name.startsWith(".") && entry.name !== ".") continue;
      const full = join(d, entry.name);

      if (entry.isDirectory()) {
        if (!SKIP_DIRS.has(entry.name)) walk(full);
      } else if (INDEXABLE_EXTENSIONS.has(extname(entry.name))) {
        files.push(full);
      }
    }
  }

  walk(dir);
  return files;
}

function inferLanguage(filePath: string): string | null {
  const ext = extname(filePath);
  const map: Record<string, string> = {
    ".ts": "typescript",
    ".tsx": "typescript",
    ".js": "javascript",
    ".jsx": "javascript",
    ".mjs": "javascript",
    ".cjs": "javascript",
    ".go": "go",
    ".rs": "rust",
    ".py": "python",
    ".rb": "ruby",
    ".java": "java",
    ".kt": "kotlin",
    ".c": "c",
    ".cpp": "cpp",
    ".h": "c",
    ".hpp": "cpp",
    ".cs": "csharp",
    ".swift": "swift",
  };
  return map[ext] || null;
}

async function ensureProject(rootPath: string): Promise<CIProject> {
  const sql = getClient();
  const name = rootPath.split("/").pop() || rootPath;

  const existing = rows<CIProject>(
    await sql`
    SELECT * FROM ci_projects WHERE root_path = ${rootPath}
  `
  );

  if (existing.length > 0) return existing[0];

  const result = rows<CIProject>(
    await sql`
    INSERT INTO ci_projects (name, root_path)
    VALUES (${name}, ${rootPath})
    RETURNING *
  `
  );
  return result[0];
}

async function upsertFile(
  projectId: string,
  relativePath: string,
  sha256: string,
  language: string | null
): Promise<{ id: string; changed: boolean }> {
  const sql = getClient();

  const existing = rows<{ id: string; sha256: string }>(
    await sql`
    SELECT id, sha256 FROM ci_files
    WHERE project_id = ${projectId} AND relative_path = ${relativePath}
  `
  );

  if (existing.length > 0) {
    if (existing[0].sha256 === sha256) {
      return { id: existing[0].id, changed: false };
    }
    await sql`
      UPDATE ci_files SET sha256 = ${sha256}, language = ${language}, indexed_at = NOW()
      WHERE id = ${existing[0].id}
    `;
    return { id: existing[0].id, changed: true };
  }

  const result = rows<{ id: string }>(
    await sql`
    INSERT INTO ci_files (project_id, relative_path, sha256, language)
    VALUES (${projectId}, ${relativePath}, ${sha256}, ${language})
    RETURNING id
  `
  );
  return { id: result[0].id, changed: true };
}

async function clearFileSymbols(fileId: string): Promise<void> {
  const sql = getClient();
  // Edges reference symbols, so delete edges first (cascading from symbols)
  await sql`DELETE FROM ci_symbols WHERE file_id = ${fileId}`;
}

async function insertSymbol(
  fileId: string,
  name: string,
  kind: string,
  signature: string | null,
  lineNumber: number,
  isExported: boolean
): Promise<string> {
  const sql = getClient();
  const result = rows<{ id: string }>(
    await sql`
    INSERT INTO ci_symbols (file_id, name, kind, signature, line_number, is_exported)
    VALUES (${fileId}, ${name}, ${kind}, ${signature}, ${lineNumber}, ${isExported})
    RETURNING id
  `
  );
  return result[0].id;
}

async function insertEdge(
  sourceSymbolId: string,
  targetSymbolId: string | null,
  edgeType: string,
  targetName: string | null,
  targetModule: string | null
): Promise<void> {
  const sql = getClient();
  if (targetSymbolId != null) {
    // Resolved edge: dedup on the standard unique constraint
    await sql`
      INSERT INTO ci_edges (source_symbol_id, target_symbol_id, edge_type, target_name, target_module)
      VALUES (${sourceSymbolId}, ${targetSymbolId}, ${edgeType}, ${targetName}, ${targetModule})
      ON CONFLICT (source_symbol_id, target_symbol_id, edge_type) DO NOTHING
    `;
  } else {
    // Unresolved edge (NULL target): dedup via partial unique index
    // idx_ci_edges_null_target_dedup (source_symbol_id, edge_type, target_name, target_module)
    // WHERE target_symbol_id IS NULL
    await sql`
      INSERT INTO ci_edges (source_symbol_id, target_symbol_id, edge_type, target_name, target_module)
      VALUES (${sourceSymbolId}, ${null}, ${edgeType}, ${targetName}, ${targetModule})
      ON CONFLICT (source_symbol_id, edge_type, target_name, target_module)
      WHERE target_symbol_id IS NULL
      DO NOTHING
    `;
  }
}

async function resolveEdgeTargets(projectId: string): Promise<number> {
  const sql = getClient();
  // Resolve unresolved edges by matching target_name to known exported symbols
  const result = await sql`
    UPDATE ci_edges e
    SET target_symbol_id = s.id
    FROM ci_symbols s
    JOIN ci_files f ON s.file_id = f.id
    WHERE e.target_symbol_id IS NULL
      AND f.project_id = ${projectId}
      AND s.name = e.target_name
      AND s.is_exported = true
      AND (e.target_module IS NULL OR f.relative_path LIKE '%' || e.target_module || '%')
  `;
  // The neon client returns a result object for UPDATE, not an array
  return (result as any).count ?? 0;
}

export async function indexFile(
  projectId: string,
  rootPath: string,
  filePath: string
): Promise<{ symbols: number; edges: number }> {
  const sql = getClient();
  const relPath = relative(rootPath, filePath);
  const sha256 = hashFile(filePath);
  const language = inferLanguage(filePath);

  const { id: fileId, changed } = await upsertFile(projectId, relPath, sha256, language);
  if (!changed) return { symbols: 0, edges: 0 };

  // Clear old data
  await clearFileSymbols(fileId);

  // Extract symbols via VFS
  const entries = extractSymbols([filePath]);
  const symbolMap = new Map<string, string>(); // name → symbol_id
  let symbolCount = 0;

  for (const entry of entries) {
    const symbolId = await insertSymbol(
      fileId,
      entry.name,
      entry.kind,
      entry.signature,
      entry.line_number,
      entry.is_exported
    );
    symbolMap.set(entry.name, symbolId);
    symbolCount++;
  }

  // Extract imports and create edges
  const imports = extractImports(filePath, rootPath);
  let edgeCount = 0;

  // Create file-level module symbol for import edges
  const moduleName = basename(filePath, extname(filePath));
  const [moduleRow] = rows<{ id: string }>(
    await sql`
    INSERT INTO ci_symbols (file_id, name, kind, is_exported, line_start, line_end)
    VALUES (${fileId}, ${moduleName}, 'module', false, 0, 0)
    ON CONFLICT (file_id, name, kind, line_start) DO UPDATE SET name = EXCLUDED.name
    RETURNING id
  `
  );
  const moduleSymbolId = moduleRow.id;

  for (const imp of imports) {
    const edgeType = imp.is_reexport ? "re_exports" : "imports";

    for (const name of imp.imported_names) {
      await insertEdge(moduleSymbolId, null, edgeType, name, imp.module_specifier);
      edgeCount++;
    }
  }

  return { symbols: symbolCount, edges: edgeCount };
}

export async function fullIndex(rootPath: string): Promise<{
  project: CIProject;
  files: number;
  symbols: number;
  edges: number;
  skipped: number;
}> {
  const finalRoot = resolve(rootPath);

  const project = await ensureProject(finalRoot);
  const files = collectSourceFiles(finalRoot);

  let totalSymbols = 0;
  let totalEdges = 0;
  let skipped = 0;

  console.log(`Indexing ${files.length} files in ${finalRoot}...`);

  for (const file of files) {
    const { symbols, edges } = await indexFile(project.id, finalRoot, file);
    if (symbols === 0 && edges === 0) {
      skipped++;
    } else {
      totalSymbols += symbols;
      totalEdges += edges;
      console.log(`  ${relative(finalRoot, file)}: ${symbols} symbols, ${edges} edges`);
    }
  }

  // Resolve cross-file edges
  const resolved = await resolveEdgeTargets(project.id);
  console.log(`Resolved ${resolved} cross-file references.`);

  // Update project timestamp
  const sql = getClient();
  await sql`UPDATE ci_projects SET last_indexed_at = NOW() WHERE id = ${project.id}`;

  return { project, files: files.length, symbols: totalSymbols, edges: totalEdges, skipped };
}

export async function incrementalIndex(
  rootPath: string,
  filePath: string
): Promise<{ symbols: number; edges: number }> {
  const sql = getClient();
  const project = await ensureProject(rootPath);
  const result = await indexFile(project.id, rootPath, filePath);

  if (result.symbols > 0) {
    await resolveEdgeTargets(project.id);
  }

  await sql`UPDATE ci_projects SET last_indexed_at = NOW() WHERE id = ${project.id}`;
  return result;
}

// CLI entry point
if (import.meta.url === `file://${process.argv[1]}`) {
  const command = process.argv[2];
  const targetPath = process.argv[3];

  if (command === "index" && targetPath) {
    fullIndex(targetPath)
      .then((result) => {
        console.log(
          `\nDone: ${result.files} files, ${result.symbols} symbols, ${result.edges} edges (${result.skipped} unchanged)`
        );
      })
      .catch((err) => {
        console.error("Index failed:", err);
        process.exit(1);
      });
  } else if (command === "incremental" && targetPath && process.argv[4]) {
    incrementalIndex(targetPath, process.argv[4])
      .then((result) => {
        console.log(`Incremental: ${result.symbols} symbols, ${result.edges} edges`);
      })
      .catch((err) => {
        console.error("Incremental index failed:", err);
        process.exit(1);
      });
  } else {
    console.log("Usage:");
    console.log("  node indexer.js index <directory>");
    console.log("  node indexer.js incremental <project-root> <file-path>");
    process.exit(1);
  }
}
