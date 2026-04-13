import { createNeonCompat, type NeonCompatClient } from "./neon-compat.js";

let sqlClient: NeonCompatClient | null = null;

export function getClient() {
  if (!sqlClient) {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      throw new Error("DATABASE_URL environment variable is required");
    }
    sqlClient = createNeonCompat(databaseUrl);
  }
  return sqlClient;
}

export type SqlClient = NeonCompatClient;
