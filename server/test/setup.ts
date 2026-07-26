import { execSync } from "child_process";
import { existsSync, unlinkSync } from "fs";
import { join } from "path";
import { PrismaClient } from "@prisma/client";

/**
 * Vitest global setup file for server tests.
 *
 * - Sets DATABASE_URL to a test SQLite database
 * - Sets NODE_ENV to "test"
 * - Runs prisma migrate deploy once before all suites start
 * - Returns a teardown function that truncates all tables in reverse-dependency order
 *
 * On Windows, in-memory SQLite with shared cache is not supported by Prisma's
 * schema engine, so we use a file-based test database instead.
 *
 * Requirements: 3.5, 8.5
 */
export default async function setup(): Promise<() => Promise<void>> {
  const isWindows = process.platform === "win32";
  const testDbPath = join(process.cwd(), ".test-vitest.db");

  // Use file-based DB on Windows (in-memory shared cache not supported),
  // in-memory on other platforms
  const databaseUrl = isWindows
    ? `file:${testDbPath}`
    : "file::memory:?cache=shared";

  // Clean up any leftover test DB from previous runs
  if (isWindows && existsSync(testDbPath)) {
    unlinkSync(testDbPath);
  }

  // Set environment variables for the test run
  process.env["DATABASE_URL"] = databaseUrl;
  process.env["NODE_ENV"] = "test";

  // Run prisma migrate deploy to apply all migrations to the test database
  execSync("npx prisma migrate deploy", {
    env: {
      ...process.env,
      DATABASE_URL: databaseUrl,
    },
    stdio: "pipe",
  });

  // Create a PrismaClient connected to the test database for teardown.
  // The DATABASE_URL env var is already set above so PrismaClient will use it.
  const prisma = new PrismaClient();

  await prisma.$connect();

  // Return the teardown function
  return async function teardown(): Promise<void> {
    // Truncate all tables in reverse-dependency order (most dependent first)
    // to avoid foreign key constraint violations
    await prisma.$transaction([
      prisma.itemAssignment.deleteMany(),
      prisma.combatant.deleteMany(),
      prisma.sessionNote.deleteMany(),
      prisma.combatEncounter.deleteMany(),
      prisma.nPC.deleteMany(),
      prisma.location.deleteMany(),
      prisma.quest.deleteMany(),
      prisma.timelineEntry.deleteMany(),
      prisma.session.deleteMany(),
      prisma.character.deleteMany(),
      prisma.campaign.deleteMany(),
      prisma.monster.deleteMany(),
      prisma.item.deleteMany(),
      prisma.user.deleteMany(),
    ]);

    await prisma.$disconnect();

    // Clean up file-based test DB on Windows
    if (isWindows && existsSync(testDbPath)) {
      unlinkSync(testDbPath);
    }
  };
}
