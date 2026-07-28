/**
 * Drizzle ORM database connection singleton.
 *
 * Uses @libsql/client as the underlying SQLite driver (no native compilation needed).
 * Applies PRAGMA foreign_keys = ON and PRAGMA synchronous = FULL on connection
 * when DATABASE_URL points to a SQLite file.
 */

import { createClient, type Client } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";

import * as schema from "./schema.ts";

// ---------------------------------------------------------------------------
// URL resolution
// ---------------------------------------------------------------------------

/**
 * Resolves the libSQL connection URL from the DATABASE_URL env var.
 * Prisma-style "file:./dev.db" → "file:dev.db" for libsql client.
 */
function resolveLibSQLUrl(databaseUrl: string): string {
  if (databaseUrl.startsWith("file:./")) {
    return `file:${databaseUrl.slice(7)}`;
  }
  return databaseUrl;
}

// ---------------------------------------------------------------------------
// Singleton
// ---------------------------------------------------------------------------

const databaseUrl = process.env["DATABASE_URL"] ?? "file:./dev.db";

const libsqlClient: Client = createClient({ url: resolveLibSQLUrl(databaseUrl) });

/**
 * The Drizzle ORM database instance. All queries go through this.
 */
export const db = drizzle(libsqlClient, { schema });

/**
 * The underlying libSQL client instance.
 * Exposed for graceful shutdown and health checks.
 */
export const rawClient = libsqlClient;

/**
 * Initializes the database connection with SQLite PRAGMAs.
 * Must be called once at startup.
 */
export async function initializeDatabase(): Promise<void> {
  if (databaseUrl.startsWith("file:")) {
    await libsqlClient.execute("PRAGMA foreign_keys = ON");
    await libsqlClient.execute("PRAGMA synchronous = FULL");
  }
}

/**
 * Type alias for the Drizzle database instance (used in service/context typing).
 */
export type DrizzleDb = typeof db;
