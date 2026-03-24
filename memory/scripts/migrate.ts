import { readFileSync, readdirSync } from "fs";
import { join } from "path";
import { config } from "dotenv";
import { getClient } from "../src/client.js";

config({ path: join(import.meta.dirname, "../../.env") });

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is required. Copy .env.example to .env and fill in your Neon connection string.");
  process.exit(1);
}

const sql = getClient();

/**
 * Split SQL into statements, respecting $$ dollar-quoted blocks.
 * Strips single-line comments. Preserves $$ content intact.
 */
function splitSqlStatements(content: string): string[] {
  const results: string[] = [];
  let current = "";
  let inDollarQuote = false;
  const lines = content.split("\n");

  for (const line of lines) {
    // Strip single-line comments (only outside $$ blocks)
    const cleanLine = inDollarQuote ? line : line.replace(/--.*$/, "");

    for (let i = 0; i < cleanLine.length; i++) {
      const ch = cleanLine[i];

      // Check for $$ delimiter
      if (ch === "$" && i + 1 < cleanLine.length && cleanLine[i + 1] === "$") {
        inDollarQuote = !inDollarQuote;
        current += "$$";
        i++; // skip second $
        continue;
      }

      // Semicolon outside $$ block = statement boundary
      if (ch === ";" && !inDollarQuote) {
        const trimmed = current.trim();
        if (trimmed.length > 0) {
          results.push(trimmed);
        }
        current = "";
        continue;
      }

      current += ch;
    }
    current += "\n";
  }

  // Remaining content
  const trimmed = current.trim();
  if (trimmed.length > 0) {
    results.push(trimmed);
  }

  return results;
}

async function migrate() {
  // Create migrations tracking table
  await sql`
    CREATE TABLE IF NOT EXISTS _migrations (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL UNIQUE,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  // Get applied migrations
  const applied = await sql`SELECT name FROM _migrations ORDER BY id`;
  const appliedNames = new Set(applied.map((r) => r.name as string));

  // Get migration files
  const migrationsDir = join(import.meta.dirname, "../migrations");
  const files = readdirSync(migrationsDir)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  let count = 0;
  for (const file of files) {
    if (appliedNames.has(file)) {
      console.log(`  SKIP  ${file} (already applied)`);
      continue;
    }

    const sqlContent = readFileSync(join(migrationsDir, file), "utf-8");
    console.log(`  RUN   ${file}`);

    try {
      // Neon serverless driver can't run multiple statements at once.
      // Split on semicolons, respecting $$ dollar-quoted blocks.
      const statements = splitSqlStatements(sqlContent);

      for (const stmt of statements) {
        await sql(stmt);
      }
      await sql`INSERT INTO _migrations (name) VALUES (${file})`;
      count++;
      console.log(`  OK    ${file}`);
    } catch (err) {
      console.error(`  FAIL  ${file}:`, err);
      process.exit(1);
    }
  }

  console.log(`\nMigrations complete: ${count} applied, ${appliedNames.size} skipped.`);
}

migrate().catch(console.error);
