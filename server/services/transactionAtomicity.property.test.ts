/**
 * Property-based test for transaction atomicity.
 *
 * **Validates: Requirements 2.8, 6.1, 6.2, 6.3**
 *
 * Property 5: Transaction atomicity — partial failures produce no partial writes.
 * - Generates pairs of valid + intentionally-failing Prisma operations in `$transaction()`.
 * - Asserts post-failure row counts equal pre-transaction counts.
 * - Uses a real SQLite file database to verify actual rollback behavior.
 */

import { existsSync, unlinkSync } from "node:fs";
import { join } from "node:path";
import { execSync } from "node:child_process";
import { PrismaClient } from "../../node_modules/.prisma/client/client.ts";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import * as fc from "fast-check";
import { afterAll, beforeAll, describe, it } from "vitest";

// Use a file-based SQLite database in the project root for testing
const TEST_DB_PATH = join(import.meta.dirname, "../../.test-atomicity.db");
const DATABASE_URL = `file:${TEST_DB_PATH}`;

let prisma: PrismaClient;

beforeAll(async () => {
  // Clean up any leftover test database
  if (existsSync(TEST_DB_PATH)) {
    unlinkSync(TEST_DB_PATH);
  }
  if (existsSync(TEST_DB_PATH + "-journal")) {
    unlinkSync(TEST_DB_PATH + "-journal");
  }

  // Set env for Prisma CLI to pick up
  process.env["DATABASE_URL"] = DATABASE_URL;

  // Deploy migrations to create the schema
  execSync("npx prisma migrate deploy", {
    env: { ...process.env, DATABASE_URL },
    stdio: "pipe",
    cwd: join(import.meta.dirname, "../.."),
  });

  // Create PrismaClient with libSQL adapter for SQLite
  const adapter = new PrismaLibSql({ url: DATABASE_URL });
  prisma = new PrismaClient({ adapter });

  await prisma.$connect();
}, 30_000);

afterAll(async () => {
  if (prisma) {
    await prisma.$disconnect();
  }
  // Clean up test database — use try/catch since file may still be locked on Windows
  try {
    if (existsSync(TEST_DB_PATH)) {
      unlinkSync(TEST_DB_PATH);
    }
  } catch {
    // File may be locked briefly on Windows; ignore cleanup errors
  }
  try {
    if (existsSync(TEST_DB_PATH + "-journal")) {
      unlinkSync(TEST_DB_PATH + "-journal");
    }
  } catch {
    // Ignore cleanup errors
  }
});

describe("Transaction Atomicity Property Tests", () => {
  it("Property 5: partial failures produce no partial writes (explicit throw)", async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate arbitrary valid user data
        fc.record({
          email: fc.emailAddress(),
          name: fc.string({ minLength: 1, maxLength: 50 }),
        }),
        async (userData) => {
          // Count rows before the transaction
          const countBefore = await prisma.user.count();

          // Attempt a transaction with:
          // 1. A valid user creation
          // 2. Followed by an intentionally-failing operation (explicit throw)
          try {
            await prisma.$transaction(async (tx) => {
              // Valid operation: create a user
              await tx.user.create({
                data: {
                  email: userData.email,
                  name: userData.name,
                  themeMode: "SYSTEM",
                },
              });

              // Intentionally failing operation: throw to force rollback
              throw new Error("Intentional failure to test atomicity");
            });
          } catch (error: unknown) {
            // We expect this to throw — the transaction should be rolled back
            if (
              error instanceof Error &&
              error.message !== "Intentional failure to test atomicity"
            ) {
              // Re-throw unexpected errors
              throw error;
            }
          }

          // Count rows after — should equal count before (rollback happened)
          const countAfter = await prisma.user.count();
          return countAfter === countBefore;
        },
      ),
      { numRuns: 50 },
    );
  }, 60_000);

  it("Property 5b: duplicate unique constraint in transaction produces no partial writes", async () => {
    // Create a seed user that we'll use for duplicate constraint violations
    const seedEmail = `seed-atomicity-${Date.now()}@test.com`;
    await prisma.user.create({
      data: {
        email: seedEmail,
        name: "Seed User",
        themeMode: "SYSTEM",
      },
    });

    await fc.assert(
      fc.asyncProperty(
        // Generate arbitrary valid user data for the first create
        fc.record({
          name: fc.string({ minLength: 1, maxLength: 50 }),
        }),
        async (userData) => {
          // Count rows before the transaction
          const countBefore = await prisma.user.count();

          // Attempt a transaction with:
          // 1. A valid user creation (unique email)
          // 2. A second create using the same email as the seed (unique constraint violation)
          try {
            await prisma.$transaction(async (tx) => {
              // Valid operation: create a user with a unique email
              await tx.user.create({
                data: {
                  email: `unique-${Date.now()}-${Math.random()}@test.com`,
                  name: userData.name,
                  themeMode: "SYSTEM",
                },
              });

              // Failing operation: duplicate email (unique constraint violation)
              await tx.user.create({
                data: {
                  email: seedEmail, // This will violate the unique constraint
                  name: "Duplicate",
                  themeMode: "SYSTEM",
                },
              });
            });
          } catch {
            // Expected: unique constraint violation causes transaction rollback
          }

          // Count rows after — should equal count before (both operations rolled back)
          const countAfter = await prisma.user.count();
          return countAfter === countBefore;
        },
      ),
      { numRuns: 50 },
    );
  }, 60_000);
});
