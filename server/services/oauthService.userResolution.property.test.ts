/**
 * Property-based tests for user resolution logic in the OAuth service.
 *
 * Feature: oauth-migration, Properties 4, 5, 6
 *
 * **Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 4.2**
 *
 * Property 4: New user creation completeness
 * - For any OAuth profile where no user with that email exists, resolveOrCreateUser
 *   creates a User (with themeMode="SYSTEM") and an OAuthIdentity atomically.
 *
 * Property 5: Existing user identity linking without duplication
 * - For any OAuth profile matching an existing user's email, resolveOrCreateUser
 *   links a new OAuthIdentity without creating a duplicate user.
 *
 * Property 6: Duplicate identity rejection
 * - For any attempt to link an identity (provider+providerUserId) already belonging
 *   to a different user, resolveOrCreateUser throws an error.
 *
 * Uses a real SQLite database via @prisma/adapter-libsql to verify actual
 * database behavior (not mocks).
 */

import { existsSync, unlinkSync } from "node:fs";
import { join } from "node:path";
import { execSync } from "node:child_process";
import { PrismaClient } from "../../node_modules/.prisma/client/client.ts";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import * as fc from "fast-check";
import { afterAll, beforeAll, beforeEach, describe, it, expect } from "vitest";
import { resolveOrCreateUser, type ServiceDeps, type OAuthProfile } from "./oauthService.ts";
import { PassthroughOperationQueue } from "../db/operationQueue.ts";
import { SUPPORTED_PROVIDERS } from "./oauthProviders.ts";

// ---------------------------------------------------------------------------
// Test database setup
// ---------------------------------------------------------------------------

const TEST_DB_PATH = join(import.meta.dirname, "../../.test-user-resolution.db");
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

  // Use a passthrough queue (operations execute immediately, no serialization needed for tests)
  const queue = new PassthroughOperationQueue();
  deps = { prisma, queue };
}, 30_000);

beforeEach(async () => {
  // Clean all data between property runs to ensure isolation
  await prisma.oAuthIdentity.deleteMany();
  await prisma.authSession.deleteMany();
  await prisma.user.deleteMany();
});

afterAll(async () => {
  if (prisma) {
    await prisma.$disconnect();
  }
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

// ---------------------------------------------------------------------------
// Arbitraries
// ---------------------------------------------------------------------------

/** Generates a random OAuth provider name from the supported set. */
const providerArb = fc.constantFrom(...SUPPORTED_PROVIDERS);

/** Generates a random providerUserId (non-empty alphanumeric string). */
const providerUserIdArb = fc.stringMatching(/^[a-zA-Z0-9]{5,30}$/);

/** Generates a random email address. */
const emailArb = fc.emailAddress();

/** Generates an optional name (string or null). */
const nameArb = fc.option(fc.string({ minLength: 1, maxLength: 50 }), { nil: null });

/** Generates a complete OAuthProfile object. */
const oauthProfileArb: fc.Arbitrary<OAuthProfile> = fc.record({
  email: emailArb,
  name: nameArb,
  providerUserId: providerUserIdArb,
  provider: providerArb,
});

// ---------------------------------------------------------------------------
// Property Tests
// ---------------------------------------------------------------------------

describe("Feature: oauth-migration, Properties 4, 5, 6: User resolution logic", () => {
  it("Property 4: New user creation completeness — creates User + OAuthIdentity atomically with themeMode=SYSTEM", async () => {
    await fc.assert(
      fc.asyncProperty(oauthProfileArb, async (profile) => {
        // Clean state for each iteration
        await prisma.oAuthIdentity.deleteMany();
        await prisma.authSession.deleteMany();
        await prisma.user.deleteMany();

        // Act: resolve or create user with a brand new profile
        const result = await resolveOrCreateUser(deps, profile);

        // Assert: The returned user has the correct email and name
        expect(result.email).toBe(profile.email);
        expect(result.name).toBe(profile.name);
        expect(result.id).toBeTruthy();

        // Assert: Exactly one user was created
        const userCount = await prisma.user.count();
        expect(userCount).toBe(1);

        // Assert: The user has themeMode = "SYSTEM"
        const user = await prisma.user.findUnique({ where: { id: result.id } });
        expect(user).not.toBeNull();
        expect(user!.themeMode).toBe("SYSTEM");
        expect(user!.email).toBe(profile.email);

        // Assert: Exactly one OAuthIdentity was created with correct data
        const identities = await prisma.oAuthIdentity.findMany();
        expect(identities.length).toBe(1);
        expect(identities[0].provider).toBe(profile.provider);
        expect(identities[0].providerUserId).toBe(profile.providerUserId);
        expect(identities[0].userId).toBe(result.id);
      }),
      { numRuns: 100 },
    );
  }, 120_000);

  it("Property 5: Existing user identity linking without duplication — links identity to existing user", async () => {
    await fc.assert(
      fc.asyncProperty(
        oauthProfileArb,
        // Generate a second provider that's different from the first
        providerArb,
        providerUserIdArb,
        async (profile, secondProvider, secondProviderUserId) => {
          // Clean state for each iteration
          await prisma.oAuthIdentity.deleteMany();
          await prisma.authSession.deleteMany();
          await prisma.user.deleteMany();

          // Arrange: Create an existing user with the same email via the first profile
          const firstResult = await resolveOrCreateUser(deps, profile);
          const userCountAfterFirst = await prisma.user.count();
          expect(userCountAfterFirst).toBe(1);

          // Act: Call resolveOrCreateUser with the same email but different provider details
          const secondProfile: OAuthProfile = {
            email: profile.email,
            name: profile.name,
            providerUserId: secondProviderUserId,
            provider: secondProvider,
          };

          // If same provider+providerUserId combination as the first, it's the same identity
          // (not a new linking scenario). Skip by returning early since
          // this is already covered — the function will just return the existing user.
          if (
            secondProfile.provider === profile.provider &&
            secondProfile.providerUserId === profile.providerUserId
          ) {
            return; // Skip this case — same identity, not a new link
          }

          const secondResult = await resolveOrCreateUser(deps, secondProfile);

          // Assert: Same user is returned (no new user created)
          expect(secondResult.id).toBe(firstResult.id);
          expect(secondResult.email).toBe(profile.email);

          // Assert: User count remains 1
          const userCountAfterSecond = await prisma.user.count();
          expect(userCountAfterSecond).toBe(1);

          // Assert: There are now 2 OAuthIdentities linked to the same user
          const identities = await prisma.oAuthIdentity.findMany({
            where: { userId: firstResult.id },
          });
          expect(identities.length).toBe(2);

          // Assert: Both identities have distinct provider+providerUserId combinations
          const combos = identities.map((i) => `${i.provider}:${i.providerUserId}`);
          expect(new Set(combos).size).toBe(2);
        },
      ),
      { numRuns: 100 },
    );
  }, 120_000);

  it("Property 6: Duplicate identity rejection — error when identity belongs to different user", async () => {
    await fc.assert(
      fc.asyncProperty(
        oauthProfileArb,
        // Generate a second email that is different from the first
        emailArb,
        nameArb,
        async (profile, secondEmail, secondName) => {
          // Ensure the two emails are actually different
          if (secondEmail === profile.email) {
            return; // Skip — same email means same user, not a conflict
          }

          // Clean state for each iteration
          await prisma.oAuthIdentity.deleteMany();
          await prisma.authSession.deleteMany();
          await prisma.user.deleteMany();

          // Arrange: Create the first user with the original profile
          await resolveOrCreateUser(deps, profile);

          // Act: Try to resolve with a DIFFERENT email but the SAME provider+providerUserId
          const conflictProfile: OAuthProfile = {
            email: secondEmail,
            name: secondName,
            providerUserId: profile.providerUserId,
            provider: profile.provider,
          };

          // Assert: Error is thrown about identity conflict
          await expect(
            resolveOrCreateUser(deps, conflictProfile),
          ).rejects.toThrow(
            "This OAuth identity is already associated with another account",
          );

          // Assert: No additional user was created
          const userCount = await prisma.user.count();
          expect(userCount).toBe(1);

          // Assert: No additional OAuthIdentity was created
          const identityCount = await prisma.oAuthIdentity.count();
          expect(identityCount).toBe(1);
        },
      ),
      { numRuns: 100 },
    );
  }, 120_000);
});
