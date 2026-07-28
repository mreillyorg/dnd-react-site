/**
 * Property-based tests for CSRF state validation in OAuth callback.
 *
 * **Validates: Requirements 10.4**
 *
 * Property 12: CSRF state validation — For any callback request where state param
 * does not match state cookie, verify request is rejected without creating a session.
 *
 * Feature: oauth-migration, Property 12: CSRF state validation
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import * as fc from "fast-check";
import express from "express";
import cookieParser from "cookie-parser";
import request from "supertest";
import { createAuthRouter } from "./authRoutes.ts";

// Mock the OAuth service functions so no real network calls are made
vi.mock("../services/oauthService.ts", () => ({
  createAuthorizationURL: vi.fn(),
  exchangeCode: vi.fn(),
  resolveOrCreateUser: vi.fn(),
  createSession: vi.fn(),
}));

// Mock config to avoid needing real env vars
vi.mock("../config.ts", () => ({
  config: {
    cookieSecure: false,
    oauthRedirectBaseUrl: "http://localhost:5173",
    googleClientId: "test",
    googleClientSecret: "test",
    discordClientId: "test",
    discordClientSecret: "test",
    githubClientId: "test",
    githubClientSecret: "test",
    facebookClientId: "test",
    facebookClientSecret: "test",
    appleClientId: "test",
    appleClientSecret: "test",
    microsoftClientId: "test",
    microsoftClientSecret: "test",
  },
}));

import { exchangeCode } from "../services/oauthService.ts";

const mockExchangeCode = vi.mocked(exchangeCode);

/**
 * Creates a minimal Express app with cookie-parser and the auth router mounted,
 * suitable for testing with supertest.
 */
function createTestApp() {
  const app = express();
  app.use(cookieParser());

  const deps = {
    prisma: {} as never,
    queue: {} as never,
  };

  const authRouter = createAuthRouter(deps);
  app.use(authRouter);

  return app;
}

describe("Feature: oauth-migration, Property 12: CSRF state validation", () => {
  let app: ReturnType<typeof createTestApp>;

  beforeEach(() => {
    vi.clearAllMocks();
    app = createTestApp();
  });

  it("Property 12a: Mismatched state param and state cookie → rejected without session creation", async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate two distinct non-empty state strings
        fc.string({ minLength: 1, maxLength: 64 }).filter((s) => s.trim().length > 0),
        fc.string({ minLength: 1, maxLength: 64 }).filter((s) => s.trim().length > 0),
        fc.constantFrom("google", "discord", "github", "facebook", "apple", "microsoft"),
        async (stateParam, stateCookie, provider) => {
          // Ensure stateParam and stateCookie are different
          fc.pre(stateParam !== stateCookie);

          const res = await request(app)
            .get(`/auth/callback/${provider}?code=test_code&state=${encodeURIComponent(stateParam)}`)
            .set("Cookie", `oauth_state=${encodeURIComponent(stateCookie)}`);

          // Should redirect to login with invalid_state error
          expect(res.status).toBe(302);
          expect(res.headers.location).toBe("/login?error=invalid_state");

          // exchangeCode should NOT have been called (no session created)
          expect(mockExchangeCode).not.toHaveBeenCalled();
        },
      ),
      { numRuns: 100 },
    );
  }, 60_000);

  it("Property 12b: No state cookie at all → rejected without session creation", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 64 }).filter((s) => s.trim().length > 0),
        fc.constantFrom("google", "discord", "github", "facebook", "apple", "microsoft"),
        async (stateParam, provider) => {
          const res = await request(app)
            .get(`/auth/callback/${provider}?code=test_code&state=${encodeURIComponent(stateParam)}`);
          // No cookie set at all

          // Should redirect to login with invalid_state error
          expect(res.status).toBe(302);
          expect(res.headers.location).toBe("/login?error=invalid_state");

          // exchangeCode should NOT have been called
          expect(mockExchangeCode).not.toHaveBeenCalled();
        },
      ),
      { numRuns: 100 },
    );
  }, 60_000);

  it("Property 12c: No state param in query → rejected without session creation", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 64 }).filter((s) => s.trim().length > 0),
        fc.constantFrom("google", "discord", "github", "facebook", "apple", "microsoft"),
        async (stateCookie, provider) => {
          const res = await request(app)
            .get(`/auth/callback/${provider}?code=test_code`)
            .set("Cookie", `oauth_state=${encodeURIComponent(stateCookie)}`);
          // No state param in query string

          // Should redirect to login with invalid_state error
          expect(res.status).toBe(302);
          expect(res.headers.location).toBe("/login?error=invalid_state");

          // exchangeCode should NOT have been called
          expect(mockExchangeCode).not.toHaveBeenCalled();
        },
      ),
      { numRuns: 100 },
    );
  }, 60_000);
});
