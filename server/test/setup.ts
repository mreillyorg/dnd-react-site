import { execSync } from "child_process";

/**
 * Vitest global setup file for server tests.
 *
 * - Sets DATABASE_URL to a test MySQL database
 * - Sets NODE_ENV to "test"
 * - Runs drizzle-kit push to create/sync tables from schema
 * - Returns a teardown function that drops the test database tables
 *
 * Requires a running MySQL instance. The test database (dnd_site_test) must
 * already exist. Create it manually if needed:
 *   CREATE DATABASE IF NOT EXISTS dnd_site_test;
 */
export default async function setup(): Promise<() => Promise<void>> {
  const databaseUrl =
    process.env["TEST_DATABASE_URL"] ??
    "mysql://root:password@localhost:3306/dnd_site_test";

  // Set environment variables for the test run
  process.env["DATABASE_URL"] = databaseUrl;
  process.env["DATABASE_PROVIDER"] = "mysql";
  process.env["NODE_ENV"] = "test";

  // Push schema to create/sync all tables
  execSync("npx drizzle-kit push --force", {
    env: {
      ...process.env,
      DATABASE_URL: databaseUrl,
    },
    stdio: "pipe",
  });

  // Return the teardown function
  return async function teardown(): Promise<void> {
    // Tables are cleaned per-test in resetDb.ts; nothing to do here.
  };
}
