import { getClient, rows } from "./client.js";

interface DirCluster {
  directory: string;
  file_count: number;
  symbol_count: number;
  internal_edges: number;
}

export async function clusterProject(projectId: string): Promise<number> {
  const sql = getClient();

  // Clear existing modules for this project
  await sql`DELETE FROM ci_modules WHERE project_id = ${projectId}`;

  // Group files by top-level directory, count symbols and internal edges
  const clusters = await sql`
    WITH file_dirs AS (
      SELECT
        f.id AS file_id,
        split_part(f.relative_path, '/', 1) AS top_dir,
        f.relative_path
      FROM ci_files f
      WHERE f.project_id = ${projectId}
    ),
    dir_stats AS (
      SELECT
        fd.top_dir,
        COUNT(DISTINCT fd.file_id) AS file_count,
        COUNT(DISTINCT s.id) AS symbol_count
      FROM file_dirs fd
      LEFT JOIN ci_symbols s ON s.file_id = fd.file_id
      GROUP BY fd.top_dir
    ),
    internal_edges AS (
      SELECT
        fd1.top_dir,
        COUNT(*) AS edge_count
      FROM ci_edges e
      JOIN ci_symbols s1 ON e.source_symbol_id = s1.id
      JOIN file_dirs fd1 ON s1.file_id = fd1.file_id
      LEFT JOIN ci_symbols s2 ON e.target_symbol_id = s2.id
      LEFT JOIN file_dirs fd2 ON s2.file_id = fd2.file_id
      WHERE fd1.top_dir = fd2.top_dir
      GROUP BY fd1.top_dir
    )
    SELECT
      ds.top_dir AS directory,
      ds.file_count,
      ds.symbol_count,
      COALESCE(ie.edge_count, 0) AS internal_edges
    FROM dir_stats ds
    LEFT JOIN internal_edges ie ON ds.top_dir = ie.top_dir
    WHERE ds.symbol_count > 0
    ORDER BY ds.symbol_count DESC
  `;

  let count = 0;
  for (const cluster of rows<DirCluster>(clusters)) {
    const name = cluster.directory.replace(/[/_]/g, "-").toLowerCase();

    await sql`
      INSERT INTO ci_modules (project_id, name, directory_pattern, file_count, symbol_count, description)
      VALUES (
        ${projectId},
        ${name},
        ${cluster.directory + "/**"},
        ${cluster.file_count},
        ${cluster.symbol_count},
        ${`${cluster.symbol_count} symbols, ${cluster.internal_edges} internal edges`}
      )
      ON CONFLICT (project_id, name) DO UPDATE SET
        file_count = EXCLUDED.file_count,
        symbol_count = EXCLUDED.symbol_count,
        description = EXCLUDED.description
    `;

    // Link files to module
    await sql`
      INSERT INTO ci_module_files (module_id, file_id)
      SELECT m.id, f.id
      FROM ci_modules m, ci_files f
      WHERE m.project_id = ${projectId}
        AND m.name = ${name}
        AND f.project_id = ${projectId}
        AND split_part(f.relative_path, '/', 1) = ${cluster.directory}
      ON CONFLICT DO NOTHING
    `;

    count++;
  }

  return count;
}
