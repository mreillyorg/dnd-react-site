import { execSync } from "child_process";
import { existsSync, unlinkSync } from "fs";
import { join } from "path";

/**
 * Vitest global setup file for server tests.
 *
 * - Sets DATABASE_URL to a test SQLite database
 * - Sets NODE_ENV to "test"
 * - Runs drizzle-kit push to create tables from schema
 * - Returns a teardown function that cleans up the test database file
 */
export default async function setup(): Promise<() => Promise<void>> {
  const testDbPath = join(process.cwd(), ".test-vitest.db");

  // Use file-based DB
  const databaseUrl = `file:${testDbPath}`;

  // Clean up any leftover test DB from previous runs
  if (existsSync(testDbPath)) {
    unlinkSync(testDbPath);
  }

  // Set environment variables for the test run
  process.env["DATABASE_URL"] = databaseUrl;
  process.env["NODE_ENV"] = "test";

  // Push schema to create all tables
  execSync("npx drizzle-kit push --force", {
    env: {
      ...process.env,
      DATABASE_URL: databaseUrl,
    },
    stdio: "pipe",
  });

  // Return the teardown function
  return async function teardown(): Promise<void> {
    // Clean up file-based test DB
    if (existsSync(testDbPath)) {
      unlinkSync(testDbPath);
    }
  };
}
