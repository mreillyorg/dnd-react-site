import { beforeEach } from "vitest";

/**
 * Per-test-file setup hook that truncates all tables before each test
 * when running with the in-memory SQLite test database.
 *
 * This ensures test isolation: each test starts with an empty database.
 * The global setup (server/test/setup.ts) handles migration and the shared
 * in-memory SQLite connection; this file handles row-level cleanup.
 *
 * The reset only activates when DATABASE_URL is the in-memory test database;
 * this avoids importing PrismaClient during frontend-only test runs.
 *
 * Requirements: 8.5
 */

if (process.env["DATABASE_URL"]?.includes(":memory:")) {
  // Dynamic import so PrismaClient is only loaded when DB tests are active
  const { PrismaClient } = await import("@prisma/client");
  const prisma = new PrismaClient();

  beforeEach(async () => {
    // Truncate all tables in reverse-dependency order to avoid FK violations
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
  });
}
