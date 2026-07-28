/**
 * Property-based tests for session token lifecycle.
 *
 * **Validates: Requirements 5.1, 5.2, 5.4, 5.5, 5.6**
 *
 * Property 8: Session token entropy and persistence
 * Property 10: Session-based user resolution round-trip
 * Property 11: Session invalidation
 *
 * Uses a real SQLite file database with Prisma to verify actual session behavior.
 */

import { existsSync, unlinkSync } from "node:fs";
import { join } from "node:path";
import { execSync } from "node:child_process";
import { PrismaClient } from "../../node_modules/.prisma/client/client.ts";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import * as fc from "fast-check";
import { afterAll, beforeAll, beforeEach, describe, it, expect } from "vitest";
import {
  createSession,
  validateSession,
  invalidateSession,
  type ServiceDeps,
} from "./oauthService.ts";
import { createOperationQueue } from "../db/operationQueue.ts";

// Use a dedicated file-based SQLite database for session property tests
const TEST_DB_PATH = join(import.meta.dirname, "../../.test-session-props.db");
const DATABASE_URL = `file:${TEST_DB_PATH}`;

let prisma: PrismaClient;
let deps: ServiceDeps;

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

  // Create deps with a real operation queue
  const queue = createOperationQueue(100, 5000);
  deps = { prisma, queue };
}, 30_000);

beforeEach(async () => {
  // Clean up sessions and users between tests for isolation
  await prisma.authSession.deleteMany();
  await prisma.oAuthIdentity.deleteMany();
  await prisma.user.deleteMany();
});

afterAll(async () => {
  if (prisma) {
    await prisma.$disconnect();
  }
  // Clean up test database files
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

/**
 * Helper: creates a user in the database and returns { id, email }.
 */
async function createTestUser(email: string): Promise<{ id: string; email: string }> {
  const user = await prisma.user.create({
    data: {
      email,
      name: "Test User",
      themeMode: "SYSTEM",
    },
  });
  return { id: user.id, email: user.email };
}

describe("Feature: oauth-migration, Property 8: Session token entropy and persistence", () => {
  it("Property 8: For any createSession call, token is 64 hex chars (32 bytes) and persisted with correct userId and future expiresAt", async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate unique email addresses to create distinct users per run
        fc.emailAddress(),
        async (email) => {
          const user = await createTestUser(email);
          const beforeCreation = new Date();

          const token = await createSession(deps, user.id);

          // Token must be exactly 64 hex characters (32 bytes = 256 bits)
          expect(token).toMatch(/^[0-9a-f]{64}$/);

          // Verify the session was persisted in the database
          const session = await prisma.authSession.findUnique({
            where: { token },
          });

          expect(session).not.toBeNull();
          expect(session!.userId).toBe(user.id);

          // expiresAt must be in the future (after the time we started)
          expect(session!.expiresAt.getTime()).toBeGreaterThan(beforeCreation.getTime());

          // expiresAt should be approximately 7 days from now (within a reasonable margin)
          const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
          const expectedExpiry = beforeCreation.getTime() + sevenDaysMs;
          // Allow 10 seconds of tolerance for test execution time
          expect(session!.expiresAt.getTime()).toBeGreaterThan(expectedExpiry - 10_000);
          expect(session!.expiresAt.getTime()).toBeLessThan(expectedExpiry + 10_000);

          return true;
        },
      ),
      { numRuns: 100 },
    );
  }, 120_000);
});

describe("Feature: oauth-migration, Property 10: Session-based user resolution round-trip", () => {
  it("Property 10: For any valid non-expired session, validateSession returns the associated user", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.emailAddress(),
        async (email) => {
          const user = await createTestUser(email);

          // Create a session for the user
          const token = await createSession(deps, user.id);

          // Validate the session — should return the user
          const result = await validateSession(deps, token);

          expect(result).not.toBeNull();
          expect(result!.id).toBe(user.id);
          expect(result!.email).toBe(user.email);

          return true;
        },
      ),
      { numRuns: 100 },
    );
  }, 120_000);
});

describe("Feature: oauth-migration, Property 11: Session invalidation", () => {
  it("Property 11a: After invalidateSession, the token resolves to null", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.emailAddress(),
        async (email) => {
          const user = await createTestUser(email);

          // Create a session
          const token = await createSession(deps, user.id);

          // Verify it's valid first
          const beforeInvalidation = await validateSession(deps, token);
          expect(beforeInvalidation).not.toBeNull();

          // Invalidate the session
          await invalidateSession(deps, token);

          // Now validateSession should return null
          const afterInvalidation = await validateSession(deps, token);
          expect(afterInvalidation).toBeNull();

          return true;
        },
      ),
      { numRuns: 100 },
    );
  }, 120_000);

  it("Property 11b: Expired sessions resolve to null", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.emailAddress(),
        async (email) => {
          const user = await createTestUser(email);

          // Create a session with a past expiresAt directly in the DB
          const expiredToken = `expired-${Date.now()}-${Math.random().toString(36).slice(2)}`;
          await prisma.authSession.create({
            data: {
              token: expiredToken,
              userId: user.id,
              expiresAt: new Date(Date.now() - 1000), // 1 second in the past
            },
          });

          // validateSession should return null for expired sessions
          const result = await validateSession(deps, expiredToken);
          expect(result).toBeNull();

          return true;
        },
      ),
      { numRuns: 100 },
    );
  }, 120_000);
});
