#!/usr/bin/env node
// intent: scan project database fundamentals into a Studio schema graph
// status: done
// next: replace heuristic parsing with AST-backed Prisma/Drizzle adapters if needed
// confidence: medium

import { readFile, readdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { basename, dirname, extname, join, resolve } from "node:path";

type Engine = "postgres" | "mysql" | "sqlite" | "mongodb" | "unknown";

interface Column {
  name: string;
  type: string;
  nullable: boolean;
  pk: boolean;
  fk?: string;
}

interface TableNode {
  id: string;
  table: string;
  columns: Column[];
  engine: Engine;
  source?: string;
  indexes?: string[];
}

interface Edge {
  from: string;
  to: string;
  type: "fk";
}

interface Graph {
  nodes: TableNode[];
  edges: Edge[];
  meta: {
    engines: Engine[];
    deps: string[];
    sources: string[];
  };
}

const root = resolve(process.argv[2] ?? process.cwd());
const SKIP_DIRS = new Set([".git", "node_modules", ".next", "dist", "build", "coverage", "target"]);
const DB_DEPS = ["pg", "mysql2", "mongoose", "prisma", "drizzle-orm", "@neondatabase/serverless", "better-sqlite3"];

async function walk(dir: string, out: string[] = []): Promise<string[]> {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const entry of entries) {
    if (entry.name.startsWith(".") && entry.name !== ".env") continue;
    if (entry.isDirectory()) {
      if (!SKIP_DIRS.has(entry.name)) await walk(join(dir, entry.name), out);
    } else {
      out.push(join(dir, entry.name));
    }
  }
  return out;
}

function cleanIdent(value: string): string {
  return value
    .trim()
    .replace(/^[\s"'`[]+/, "")
    .replace(/[\s"'`\]]+$/, "");
}

function splitTopLevel(input: string): string[] {
  const parts: string[] = [];
  let current = "";
  let depth = 0;
  let quote: string | null = null;
  for (let i = 0; i < input.length; i++) {
    const ch = input[i];
    if (quote) {
      current += ch;
      if (ch === quote && input[i - 1] !== "\\") quote = null;
      continue;
    }
    if (ch === "'" || ch === '"' || ch === "`") {
      quote = ch;
      current += ch;
      continue;
    }
    if (ch === "(") depth++;
    if (ch === ")") depth = Math.max(0, depth - 1);
    if (ch === "," && depth === 0) {
      if (current.trim()) parts.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  if (current.trim()) parts.push(current.trim());
  return parts;
}

function detectEngineFromUrl(url: string): Engine {
  const lower = url.toLowerCase();
  if (lower.startsWith("postgres") || lower.includes("neon.tech")) return "postgres";
  if (lower.startsWith("mysql")) return "mysql";
  if (lower.startsWith("sqlite") || lower.startsWith("file:")) return "sqlite";
  if (lower.startsWith("mongodb")) return "mongodb";
  return "unknown";
}

async function detectEnvEngine(files: string[]): Promise<Engine> {
  for (const file of files.filter((f) => basename(f) === ".env")) {
    try {
      const text = await readFile(file, "utf8");
      const match = text.match(/^DATABASE_URL\s*=\s*["']?([^"'\n]+)["']?/m);
      if (match) return detectEngineFromUrl(match[1]);
    } catch {
      /* ignore */
    }
  }
  return "unknown";
}

async function detectDeps(files: string[]): Promise<string[]> {
  const deps = new Set<string>();
  for (const file of files.filter((f) => basename(f) === "package.json")) {
    try {
      const pkg = JSON.parse(await readFile(file, "utf8")) as {
        dependencies?: Record<string, string>;
        devDependencies?: Record<string, string>;
      };
      const all = { ...(pkg.dependencies ?? {}), ...(pkg.devDependencies ?? {}) };
      for (const dep of DB_DEPS) if (all[dep]) deps.add(dep);
    } catch {
      /* ignore malformed package.json */
    }
  }
  return [...deps].sort();
}

function mergeGraph(target: Graph, nodes: TableNode[], edges: Edge[], source: string): void {
  const byTable = new Map(target.nodes.map((node) => [node.table, node]));
  for (const node of nodes) {
    const existing = byTable.get(node.table);
    if (existing) {
      const colNames = new Set(existing.columns.map((col) => col.name));
      for (const col of node.columns) if (!colNames.has(col.name)) existing.columns.push(col);
      existing.indexes = [...new Set([...(existing.indexes ?? []), ...(node.indexes ?? [])])];
      if (existing.engine === "unknown") existing.engine = node.engine;
    } else {
      target.nodes.push(node);
      byTable.set(node.table, node);
    }
  }
  const edgeIds = new Set(target.edges.map((edge) => `${edge.from}->${edge.to}`));
  for (const edge of edges) {
    const id = `${edge.from}->${edge.to}`;
    if (!edgeIds.has(id)) {
      target.edges.push(edge);
      edgeIds.add(id);
    }
  }
  target.meta.sources.push(source);
}

async function parsePrisma(file: string, fallbackEngine: Engine): Promise<{ nodes: TableNode[]; edges: Edge[] }> {
  const text = await readFile(file, "utf8");
  const provider = text.match(/provider\s*=\s*["']([^"']+)["']/)?.[1]?.toLowerCase();
  const engine: Engine = provider?.includes("postgres")
    ? "postgres"
    : provider?.includes("mysql")
      ? "mysql"
      : provider?.includes("sqlite")
        ? "sqlite"
        : fallbackEngine;
  const nodes: TableNode[] = [];
  const edges: Edge[] = [];
  const modelRegex = /model\s+(\w+)\s*\{([\s\S]*?)\n\}/g;
  for (const match of text.matchAll(modelRegex)) {
    const table = match[1];
    const body = match[2];
    const columns = new Map<string, Column>();
    const indexes = new Set<string>();
    const compositePk = new Set<string>();

    for (const idx of body.matchAll(/@@(?:index|unique)\s*\(\s*\[([^\]]+)\]/g)) {
      for (const col of idx[1].split(",").map((v) => cleanIdent(v))) indexes.add(col);
    }
    for (const pk of body.matchAll(/@@id\s*\(\s*\[([^\]]+)\]/g)) {
      for (const col of pk[1].split(",").map((v) => cleanIdent(v))) compositePk.add(col);
    }

    for (const rawLine of body.split("\n")) {
      const line = rawLine.trim();
      if (!line || line.startsWith("//") || line.startsWith("@@")) continue;
      const parts = line.split(/\s+/);
      if (parts.length < 2) continue;
      const name = parts[0];
      const type = parts[1].replace(/[?[\]]/g, "");
      const scalarTypes = new Set([
        "String",
        "Int",
        "BigInt",
        "Float",
        "Decimal",
        "Boolean",
        "DateTime",
        "Json",
        "Bytes",
      ]);
      if (line.includes("@relation") || (parts[1].includes("[]") && !scalarTypes.has(type))) continue;
      if (line.includes("@relation") && !line.includes("fields:")) continue;
      const nullable = parts[1].includes("?");
      const pk = line.includes("@id") || compositePk.has(name);
      columns.set(name, { name, type, nullable, pk });
    }

    for (const relation of body.matchAll(
      /\w+\s+(\w+)[?[\]]*\s+@relation\s*\(\s*fields:\s*\[([^\]]+)\]\s*,\s*references:\s*\[([^\]]+)\]/g
    )) {
      const targetTable = relation[1];
      const fields = relation[2].split(",").map((v) => cleanIdent(v));
      const refs = relation[3].split(",").map((v) => cleanIdent(v));
      fields.forEach((field, index) => {
        const ref = refs[index] ?? refs[0] ?? "id";
        const col = columns.get(field);
        if (col) col.fk = `${targetTable}.${ref}`;
        edges.push({ from: `${table}.${field}`, to: `${targetTable}.${ref}`, type: "fk" });
      });
    }

    nodes.push({ id: table, table, columns: [...columns.values()], engine, source: file, indexes: [...indexes] });
  }
  return { nodes, edges };
}

function parseSql(text: string, source: string, engine: Engine): { nodes: TableNode[]; edges: Edge[] } {
  const nodes: TableNode[] = [];
  const edges: Edge[] = [];
  const indexes = new Map<string, Set<string>>();

  for (const idx of text.matchAll(/CREATE\s+(?:UNIQUE\s+)?INDEX[\s\S]*?\s+ON\s+["`]?(\w+)["`]?\s*\(([^)]+)\)/gi)) {
    const table = cleanIdent(idx[1]);
    const cols = splitTopLevel(idx[2]).map((col) => cleanIdent(col.split(/\s+/)[0]));
    if (!indexes.has(table)) indexes.set(table, new Set());
    cols.forEach((col) => indexes.get(table)?.add(col));
  }

  const tableRegex = /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:(?:"?\w+"?\.)?["`]?(\w+)["`]?)\s*\(([\s\S]*?)\);/gi;
  for (const match of text.matchAll(tableRegex)) {
    const table = cleanIdent(match[1]);
    const body = match[2];
    const columns = new Map<string, Column>();
    const tablePk = new Set<string>();

    for (const part of splitTopLevel(body)) {
      const upper = part.toUpperCase();
      const pkMatch = part.match(/PRIMARY\s+KEY\s*\(([^)]+)\)/i);
      if (pkMatch)
        pkMatch[1]
          .split(",")
          .map((v) => cleanIdent(v))
          .forEach((col) => tablePk.add(col));

      const fkMatch = part.match(/FOREIGN\s+KEY\s*\(([^)]+)\)\s+REFERENCES\s+["`]?(\w+)["`]?\s*\(([^)]+)\)/i);
      if (fkMatch) {
        const fromCols = fkMatch[1].split(",").map((v) => cleanIdent(v));
        const targetTable = cleanIdent(fkMatch[2]);
        const targetCols = fkMatch[3].split(",").map((v) => cleanIdent(v));
        fromCols.forEach((fromCol, index) => {
          const targetCol = targetCols[index] ?? targetCols[0] ?? "id";
          const col = columns.get(fromCol);
          if (col) col.fk = `${targetTable}.${targetCol}`;
          edges.push({ from: `${table}.${fromCol}`, to: `${targetTable}.${targetCol}`, type: "fk" });
        });
        continue;
      }
      if (upper.startsWith("CONSTRAINT") || upper.startsWith("PRIMARY KEY") || upper.startsWith("UNIQUE")) continue;
      const colMatch = part.match(/^["`]?(\w+)["`]?\s+([A-Za-z0-9_()]+)([\s\S]*)$/);
      if (!colMatch) continue;
      const name = cleanIdent(colMatch[1]);
      const rest = colMatch[3] ?? "";
      const inlineFk = rest.match(/REFERENCES\s+["`]?(\w+)["`]?\s*\(([^)]+)\)/i);
      const col: Column = {
        name,
        type: colMatch[2],
        nullable: !/NOT\s+NULL/i.test(rest) && !/PRIMARY\s+KEY/i.test(rest),
        pk: /PRIMARY\s+KEY/i.test(rest) || tablePk.has(name),
      };
      if (inlineFk) {
        const targetTable = cleanIdent(inlineFk[1]);
        const targetCol = cleanIdent(inlineFk[2]);
        col.fk = `${targetTable}.${targetCol}`;
        edges.push({ from: `${table}.${name}`, to: `${targetTable}.${targetCol}`, type: "fk" });
      }
      columns.set(name, col);
    }
    for (const pk of tablePk) {
      const col = columns.get(pk);
      if (col) col.pk = true;
    }
    nodes.push({
      id: table,
      table,
      columns: [...columns.values()],
      engine,
      source,
      indexes: [...(indexes.get(table) ?? [])],
    });
  }
  return { nodes, edges };
}

async function parseDrizzle(
  configFile: string,
  files: string[],
  fallbackEngine: Engine
): Promise<{ nodes: TableNode[]; edges: Edge[] }> {
  const config = await readFile(configFile, "utf8");
  const schemaPaths = new Set<string>();
  for (const match of config.matchAll(/schema\s*:\s*(?:\[([^\]]+)\]|["']([^"']+)["'])/g)) {
    const raw = match[1] ?? match[2] ?? "";
    for (const item of raw.matchAll(/["']([^"']+)["']/g)) schemaPaths.add(resolve(dirname(configFile), item[1]));
    if (match[2]) schemaPaths.add(resolve(dirname(configFile), match[2]));
  }
  const schemaFiles = [...schemaPaths].flatMap((path) => {
    if (existsSync(path)) return [path];
    return files.filter((file) => file.startsWith(path.replace(/\/$/, "")) && [".ts", ".js"].includes(extname(file)));
  });
  const nodes: TableNode[] = [];
  const edges: Edge[] = [];
  const tableNames = new Map<string, string>();

  for (const file of schemaFiles) {
    const text = await readFile(file, "utf8");
    for (const match of text.matchAll(
      /(?:export\s+)?const\s+(\w+)\s*=\s*(?:pgTable|mysqlTable|sqliteTable)\s*\(\s*["']([^"']+)["']/g
    )) {
      tableNames.set(match[1], match[2]);
    }
  }

  for (const file of schemaFiles) {
    const text = await readFile(file, "utf8");
    const declRegex =
      /(?:export\s+)?const\s+(\w+)\s*=\s*(pgTable|mysqlTable|sqliteTable)\s*\(\s*["']([^"']+)["']\s*,\s*\{([\s\S]*?)\}\s*(?:,\s*\(([\s\S]*?)\)\s*=>\s*\(?\{?([\s\S]*?)\}?\)?)?\s*\)/g;
    for (const match of text.matchAll(declRegex)) {
      const varName = match[1];
      const kind = match[2];
      const table = match[3];
      const body = match[4];
      const extra = `${match[5] ?? ""}\n${match[6] ?? ""}`;
      const engine: Engine =
        kind === "mysqlTable"
          ? "mysql"
          : kind === "sqliteTable"
            ? "sqlite"
            : fallbackEngine === "unknown"
              ? "postgres"
              : fallbackEngine;
      const columns: Column[] = [];
      const indexes = new Set<string>();

      for (const idx of extra.matchAll(/(?:index|uniqueIndex)\s*\([^)]*\)\.on\s*\(([^)]*)\)/g)) {
        for (const col of idx[1].matchAll(new RegExp(`${varName}\\.(\\w+)`, "g"))) indexes.add(col[1]);
      }

      for (const part of splitTopLevel(body)) {
        const colMatch = part.match(/^(\w+)\s*:\s*(\w+)\s*\(\s*["']([^"']+)["']([\s\S]*)$/);
        if (!colMatch) continue;
        const prop = colMatch[1];
        const type = colMatch[2];
        const name = colMatch[3];
        const chain = colMatch[4];
        const col: Column = {
          name,
          type,
          nullable: !chain.includes(".notNull()") && !chain.includes(".primaryKey()"),
          pk: chain.includes(".primaryKey()"),
        };
        const fk = chain.match(/\.references\s*\(\s*\(\)\s*=>\s*(\w+)\.(\w+)/);
        if (fk) {
          const targetTable = tableNames.get(fk[1]) ?? fk[1];
          col.fk = `${targetTable}.${fk[2]}`;
          edges.push({ from: `${table}.${name}`, to: `${targetTable}.${fk[2]}`, type: "fk" });
        }
        if (prop !== name) indexes.add(prop);
        columns.push(col);
      }
      nodes.push({ id: table, table, columns, engine, source: file, indexes: [...indexes] });
    }
  }

  return { nodes, edges };
}

async function main(): Promise<void> {
  const files = await walk(root);
  const deps = await detectDeps(files);
  const envEngine = await detectEnvEngine(files);
  const graph: Graph = { nodes: [], edges: [], meta: { engines: [], deps, sources: [] } };
  const fallbackEngine: Engine =
    envEngine !== "unknown"
      ? envEngine
      : deps.includes("mysql2")
        ? "mysql"
        : deps.includes("better-sqlite3")
          ? "sqlite"
          : deps.includes("mongoose")
            ? "mongodb"
            : deps.some(
                  (dep) =>
                    dep === "pg" || dep === "@neondatabase/serverless" || dep === "prisma" || dep === "drizzle-orm"
                )
              ? "postgres"
              : "unknown";

  for (const file of files.filter((f) => f.endsWith("prisma/schema.prisma"))) {
    const parsed = await parsePrisma(file, fallbackEngine);
    mergeGraph(graph, parsed.nodes, parsed.edges, file);
  }
  for (const file of files.filter((f) => basename(f) === "drizzle.config.ts")) {
    const parsed = await parseDrizzle(file, files, fallbackEngine);
    mergeGraph(graph, parsed.nodes, parsed.edges, file);
  }
  for (const file of files.filter((f) => /migrations\/.*\.sql$/i.test(f))) {
    const text = await readFile(file, "utf8");
    const parsed = parseSql(text, file, fallbackEngine);
    mergeGraph(graph, parsed.nodes, parsed.edges, file);
  }

  graph.meta.engines = [...new Set(graph.nodes.map((node) => node.engine).filter((engine) => engine !== "unknown"))];
  process.stdout.write(JSON.stringify(graph) + "\n");
}

main().catch((err) => {
  process.stderr.write(`foundations-scan failed: ${err instanceof Error ? err.message : String(err)}\n`);
  process.stdout.write(JSON.stringify({ nodes: [], edges: [], meta: { engines: [], deps: [], sources: [] } }) + "\n");
  process.exit(1);
});
