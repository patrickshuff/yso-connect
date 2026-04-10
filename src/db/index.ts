import { drizzle, PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

/**
 * Lazy singleton database client.
 *
 * Initialization is deferred to the first actual DB call so that `next build`
 * can complete static analysis without requiring DATABASE_URL to be present in
 * the build environment. At runtime, the first query will throw a clear error
 * if DATABASE_URL is missing.
 */

let _db: PostgresJsDatabase<typeof schema> | null = null;

function getDb(): PostgresJsDatabase<typeof schema> {
  if (_db) return _db;

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL environment variable is not set");
  }

  const client = postgres(databaseUrl, {
    max: 1,
    idle_timeout: 20,
    connect_timeout: 10,
  });

  _db = drizzle(client, { schema });
  return _db;
}

export const db = new Proxy({} as PostgresJsDatabase<typeof schema>, {
  get(_target, prop) {
    return getDb()[prop as keyof PostgresJsDatabase<typeof schema>];
  },
});
