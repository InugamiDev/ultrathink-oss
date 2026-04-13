/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Local-PostgreSQL-compatible DB client.
 * Replaces @neondatabase/serverless with `postgres` package so we can talk
 * to a regular PostgreSQL server (TCP or Unix socket) instead of Neon HTTP.
 * Preserves Neon API shape: both tagged-template and raw-string calls work.
 */
import postgres from "postgres";

type SqlClient = any;
let sql: SqlClient | null = null;

function createClient(url: string): SqlClient {
  let pg: any;
  if (/^postgres(ql)?:\/\/\/?/.test(url) && url.includes("host=")) {
    const u = new URL(url);
    pg = postgres({
      host: u.searchParams.get("host") || "/var/run/postgresql",
      database: u.pathname.replace(/^\//, "") || undefined,
      prepare: false,
    });
  } else {
    pg = postgres(url, { prepare: false });
  }
  const dispatch = (...args: any[]): any => {
    const first = args[0];
    if (Array.isArray(first) && "raw" in (first as object)) return pg(...args);
    if (typeof first === "string") {
      const [text, ...params] = args;
      return pg.unsafe(text, params);
    }
    return pg(...args);
  };
  return new Proxy(dispatch, {
    get(_t, prop) {
      return pg[prop as keyof typeof pg];
    },
  });
}

export function getDb() {
  if (!sql) {
    const url = process.env.DATABASE_URL;
    if (!url) {
      throw new Error("DATABASE_URL environment variable is required");
    }
    sql = createClient(url);
  }
  return sql;
}
