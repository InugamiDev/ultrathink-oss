import { neon } from "@neondatabase/serverless";

let sqlClient: ReturnType<typeof neon> | null = null;

export function getClient() {
  if (!sqlClient) {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      throw new Error("DATABASE_URL environment variable is required");
    }
    sqlClient = neon(databaseUrl);
  }
  return sqlClient;
}

export type SqlClient = ReturnType<typeof neon>;

// Cast Neon query results to typed arrays
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function rows<T>(result: any): T[] {
  return result as T[];
}
