/**
 * Drizzle ORM database connection singleton.
 *
 * Uses mysql2 as the underlying MySQL driver.
 * Connection URL is read from the DATABASE_URL environment variable.
 */

import mysql from "mysql2/promise";
import { drizzle } from "drizzle-orm/mysql2";

import * as schema from "./schema.ts";

// ---------------------------------------------------------------------------
// Singleton
// ---------------------------------------------------------------------------

const databaseUrl = process.env["DATABASE_URL"] ?? "mysql://root:password@localhost:3306/dnd_site";

const pool = mysql.createPool(databaseUrl);

/**
 * The Drizzle ORM database instance. All queries go through this.
 */
export const db = drizzle(pool, { schema, mode: "default" });

/**
 * The underlying mysql2 connection pool.
 * Exposed for graceful shutdown and health checks.
 */
export const rawPool = pool;

/**
 * Initializes the database connection.
 * For MySQL, no special PRAGMAs are needed — this verifies connectivity.
 */
export async function initializeDatabase(): Promise<void> {
  const connection = await pool.getConnection();
  try {
    await connection.ping();
    console.log("[db] MySQL connection verified.");
  } finally {
    connection.release();
  }
}

/**
 * Type alias for the Drizzle database instance (used in service/context typing).
 */
export type DrizzleDb = typeof db;
