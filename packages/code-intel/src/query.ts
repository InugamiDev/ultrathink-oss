import { getClient, rows } from "./client.js";
import type { SymbolKind, EdgeType } from "./types.js";

interface SymbolResult {
  id: string;
  file_id: string;
  name: string;
  kind: SymbolKind;
  signature: string | null;
  line_number: number;
  is_exported: boolean;
  parent_symbol_id: string | null;
  file_path: string;
  project_name: string;
}

interface EdgeResult {
  edge_type: EdgeType;
  symbol_name: string;
  symbol_kind: SymbolKind;
  file_path: string;
  line_number: number;
  signature: string | null;
  target_name: string | null;
  target_module: string | null;
}

interface ImpactResult {
  hop: number;
  symbol_name: string;
  symbol_kind: SymbolKind;
  file_path: string;
  edge_type: EdgeType;
}

interface ModuleResult {
  id: string;
  name: string;
  description: string | null;
  directory_pattern: string | null;
  file_count: number;
  symbol_count: number;
}

export async function searchSymbols(opts: {
  query: string;
  kind?: SymbolKind;
  project?: string;
  exported_only?: boolean;
  limit?: number;
}): Promise<SymbolResult[]> {
  const sql = getClient();
  const limit = opts.limit || 20;

  const kindFilter = opts.kind || null;
  const projectFilter = opts.project || null;
  const exportedOnly = opts.exported_only || false;

  return rows<SymbolResult>(
    await sql`
    SELECT
      s.id, s.name, s.kind, s.signature, s.line_number, s.is_exported,
      s.parent_symbol_id, s.file_id,
      f.relative_path AS file_path,
      p.name AS project_name,
      ts_rank(s.search_vector, plainto_tsquery('simple', ${opts.query})) +
      similarity(s.name, ${opts.query}) AS rank
    FROM ci_symbols s
    JOIN ci_files f ON s.file_id = f.id
    JOIN ci_projects p ON f.project_id = p.id
    WHERE (
      s.search_vector @@ plainto_tsquery('simple', ${opts.query})
      OR s.name % ${opts.query}
      OR s.name ILIKE ${"%" + opts.query + "%"}
    )
    AND (${kindFilter}::text IS NULL OR s.kind = ${kindFilter})
    AND (${projectFilter}::text IS NULL OR p.name = ${projectFilter})
    AND (${exportedOnly} = false OR s.is_exported = true)
    ORDER BY rank DESC
    LIMIT ${limit}
  `
  );
}

export async function getDeps(symbolId: string): Promise<EdgeResult[]> {
  const sql = getClient();

  return rows<EdgeResult>(
    await sql`
    SELECT
      e.edge_type,
      COALESCE(ts.name, e.target_name) AS symbol_name,
      ts.kind AS symbol_kind,
      tf.relative_path AS file_path,
      ts.line_number,
      ts.signature,
      e.target_name,
      e.target_module
    FROM ci_edges e
    LEFT JOIN ci_symbols ts ON e.target_symbol_id = ts.id
    LEFT JOIN ci_files tf ON ts.file_id = tf.id
    WHERE e.source_symbol_id = ${symbolId}
    ORDER BY e.edge_type, symbol_name
  `
  );
}

export async function getDependents(symbolId: string): Promise<EdgeResult[]> {
  const sql = getClient();

  return rows<EdgeResult>(
    await sql`
    SELECT
      e.edge_type,
      ss.name AS symbol_name,
      ss.kind AS symbol_kind,
      sf.relative_path AS file_path,
      ss.line_number,
      ss.signature,
      NULL AS target_name,
      NULL AS target_module
    FROM ci_edges e
    JOIN ci_symbols ss ON e.source_symbol_id = ss.id
    JOIN ci_files sf ON ss.file_id = sf.id
    WHERE e.target_symbol_id = ${symbolId}
    ORDER BY e.edge_type, ss.name
  `
  );
}

export async function getImpact(symbolId: string, maxHops: number = 3): Promise<ImpactResult[]> {
  const sql = getClient();

  return rows<ImpactResult>(
    await sql`
    WITH RECURSIVE impact AS (
      SELECT
        e.source_symbol_id AS symbol_id,
        e.edge_type,
        1 AS hop
      FROM ci_edges e
      WHERE e.target_symbol_id = ${symbolId}

      UNION ALL

      SELECT
        e.source_symbol_id,
        e.edge_type,
        i.hop + 1
      FROM ci_edges e
      JOIN impact i ON e.target_symbol_id = i.symbol_id
      WHERE i.hop < ${maxHops}
    )
    SELECT DISTINCT ON (s.id)
      i.hop,
      s.name AS symbol_name,
      s.kind AS symbol_kind,
      f.relative_path AS file_path,
      i.edge_type
    FROM impact i
    JOIN ci_symbols s ON i.symbol_id = s.id
    JOIN ci_files f ON s.file_id = f.id
    ORDER BY s.id, i.hop
  `
  );
}

export async function getModules(projectName?: string): Promise<ModuleResult[]> {
  const sql = getClient();
  const pFilter = projectName || null;

  return rows<ModuleResult>(
    await sql`
    SELECT m.id, m.name, m.description, m.directory_pattern, m.file_count, m.symbol_count
    FROM ci_modules m
    JOIN ci_projects p ON m.project_id = p.id
    WHERE (${pFilter}::text IS NULL OR p.name = ${pFilter})
    ORDER BY m.name
  `
  );
}

export async function findSymbolByName(name: string, projectName?: string): Promise<SymbolResult | null> {
  const sql = getClient();
  const pFilter = projectName || null;

  const results = rows<SymbolResult>(
    await sql`
    SELECT
      s.id, s.name, s.kind, s.signature, s.line_number, s.is_exported,
      s.parent_symbol_id, s.file_id,
      f.relative_path AS file_path,
      p.name AS project_name
    FROM ci_symbols s
    JOIN ci_files f ON s.file_id = f.id
    JOIN ci_projects p ON f.project_id = p.id
    WHERE s.name = ${name}
    AND (${pFilter}::text IS NULL OR p.name = ${pFilter})
    ORDER BY s.is_exported DESC
    LIMIT 1
  `
  );

  return results.length > 0 ? results[0] : null;
}
