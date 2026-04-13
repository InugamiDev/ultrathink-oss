/**
 * Neon-compatible client built on the `postgres` package.
 *
 * UltraThink was written against `@neondatabase/serverless`, which requires a
 * Neon HTTP endpoint and cannot talk to a regular PostgreSQL server over TCP
 * or a Unix socket. This shim preserves the same call shape so existing code
 * keeps working:
 *
 *   - sql`SELECT ${x}`              (tagged template — native postgres.js)
 *   - sql(rawSqlString)             (Neon-style raw-string call — routed to .unsafe)
 *   - sql.transaction(cb => [...])  (Neon-style batch — wrapped with postgres .begin)
 *
 * It also supports both plain TCP URLs and Unix-socket URLs of the form
 *   postgresql:///dbname?host=/var/run/postgresql
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
import postgres from "postgres";

export type NeonCompatClient = any;

export function createNeonCompat(url: string): NeonCompatClient {
  let pg: any;

  // Unix socket style: postgresql:///dbname?host=/var/run/postgresql
  if (/^postgres(ql)?:\/\/\/?/.test(url) && url.includes("host=")) {
    const u = new URL(url);
    const dbname = u.pathname.replace(/^\//, "");
    const host = u.searchParams.get("host") || "/var/run/postgresql";
    pg = postgres({
      host,
      database: dbname || undefined,
      prepare: false,
    });
  } else {
    pg = postgres(url, { prepare: false });
  }

  const dispatch = (...args: any[]): any => {
    const first = args[0];
    // Tagged template literal: first arg is a TemplateStringsArray (has .raw)
    if (Array.isArray(first) && "raw" in (first as object)) {
      return pg(...args);
    }
    // Plain string query (Neon-compatible)
    if (typeof first === "string") {
      const [text, ...params] = args;
      return pg.unsafe(text, params);
    }
    return pg(...args);
  };

  // Neon's .transaction(cb) runs the array of queries cb(txn) returns as one
  // HTTP batch. We emulate with postgres's .begin(async tx => ...).
  // cb returns an array of PendingQuery (tagged-template results using txn).
  const transaction = (cb: (txn: any) => any[]) => {
    return pg.begin(async (tx: any) => {
      const queries = cb(tx);
      return Promise.all(queries);
    });
  };

  return new Proxy(dispatch, {
    get(_target, prop) {
      if (prop === "transaction") return transaction;
      return pg[prop as keyof typeof pg];
    },
  }) as NeonCompatClient;
}
