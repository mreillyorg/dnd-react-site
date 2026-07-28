import { describe, it, expect, vi, beforeEach } from "vitest";
import { GraphQLError } from "graphql";

import type { GraphQLContext } from "../context.ts";

// ---------------------------------------------------------------------------
// Mock service modules
// ---------------------------------------------------------------------------

vi.mock("../../services/oauthService.ts", () => ({
  createAuthorizationURL: vi.fn(),
  invalidateSession: vi.fn(),
}));

vi.mock("../../services/oauthProviders.ts", () => ({
  SUPPORTED_PROVIDERS: ["google", "discord", "github", "facebook", "apple", "microsoft"] as const,
}));

// ---------------------------------------------------------------------------
// Import resolver (after mocks are set up)
// ---------------------------------------------------------------------------

import { authResolvers } from "./auth.resolver.ts";
import { createAuthorizationURL, invalidateSession } from "../../services/oauthService.ts";

// ---------------------------------------------------------------------------
// Test Helpers
// ---------------------------------------------------------------------------

function makeUnauthCtx(): GraphQLContext {
  return {
    currentUser: null,
    sessionToken: null,
    prisma: {
      user: { findUnique: vi.fn() },
      oAuthIdentity: { findMany: vi.fn() },
    } as unknown as GraphQLContext["prisma"],
    queue: { enqueue: vi.fn((fn) => fn()), drain: vi.fn(() => Promise.resolve()), pendingCount: 0 } as unknown as GraphQLContext["queue"],
  };
}

function makeAuthCtx(): GraphQLContext {
  return {
    currentUser: { id: "user-1", email: "test@example.com" },
    sessionToken: "valid-session-token-abc",
    prisma: {
      user: { findUnique: vi.fn() },
      oAuthIdentity: { findMany: vi.fn() },
    } as unknown as GraphQLContext["prisma"],
    queue: { enqueue: vi.fn((fn) => fn()), drain: vi.fn(() => Promise.resolve()), pendingCount: 0 } as unknown as GraphQLContext["queue"],
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("authResolvers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Query.me", () => {
    it("returns null when unauthenticated", async () => {
      const ctx = makeUnauthCtx();

      const result = await authResolvers.Query.me(null, {}, ctx);

      expect(result).toBeNull();
    });

    it("returns the full user record when authenticated", async () => {
      const ctx = makeAuthCtx();
      const fakeUser = { id: "user-1", email: "test@example.com", name: "Test User", themeMode: "SYSTEM" };
      vi.mocked(ctx.prisma.user.findUnique).mockResolvedValue(fakeUser as never);

      const result = await authResolvers.Query.me(null, {}, ctx);

      expect(ctx.prisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: "user-1" },
      });
      expect(result).toEqual(fakeUser);
    });
  });

  describe("Query.initiateOAuth", () => {
    it("returns authorization URL for a supported provider", () => {
      vi.mocked(createAuthorizationURL).mockReturnValue({
        url: "https://accounts.google.com/o/oauth2/auth?...",
        state: "random-state",
        codeVerifier: "verifier",
      });

      const ctx = makeUnauthCtx();
      const result = authResolvers.Query.initiateOAuth(null, { provider: "google" }, ctx);

      expect(createAuthorizationURL).toHaveBeenCalledWith("google");
      expect(result).toEqual({
        url: "https://accounts.google.com/o/oauth2/auth?...",
        provider: "google",
      });
    });

    it("throws BAD_USER_INPUT for unsupported provider", () => {
      const ctx = makeUnauthCtx();

      expect(() =>
        authResolvers.Query.initiateOAuth(null, { provider: "unsupported" }, ctx),
      ).toThrow(GraphQLError);

      try {
        authResolvers.Query.initiateOAuth(null, { provider: "unsupported" }, ctx);
      } catch (error) {
        expect((error as GraphQLError).extensions?.code).toBe("BAD_USER_INPUT");
      }
    });

    it("normalizes provider name to lowercase", () => {
      vi.mocked(createAuthorizationURL).mockReturnValue({
        url: "https://discord.com/api/oauth2/authorize?...",
        state: "random-state",
      });

      const ctx = makeUnauthCtx();
      const result = authResolvers.Query.initiateOAuth(null, { provider: "Discord" }, ctx);

      expect(createAuthorizationURL).toHaveBeenCalledWith("discord");
      expect(result.provider).toBe("discord");
    });
  });

  describe("Query.linkedProviders", () => {
    it("throws UNAUTHENTICATED when not logged in", async () => {
      const ctx = makeUnauthCtx();

      let error: unknown;
      try {
        await authResolvers.Query.linkedProviders(null, {}, ctx);
      } catch (e) {
        error = e;
      }

      expect(error).toBeInstanceOf(GraphQLError);
      expect((error as GraphQLError).extensions?.code).toBe("UNAUTHENTICATED");
    });

    it("returns linked provider names for authenticated user", async () => {
      const ctx = makeAuthCtx();
      vi.mocked(ctx.prisma.oAuthIdentity.findMany).mockResolvedValue([
        { provider: "google" },
        { provider: "discord" },
      ] as never);

      const result = await authResolvers.Query.linkedProviders(null, {}, ctx);

      expect(ctx.prisma.oAuthIdentity.findMany).toHaveBeenCalledWith({
        where: { userId: "user-1" },
        select: { provider: true },
      });
      expect(result).toEqual(["google", "discord"]);
    });
  });

  describe("Mutation.logout", () => {
    it("throws UNAUTHENTICATED when not logged in", async () => {
      const ctx = makeUnauthCtx();

      let error: unknown;
      try {
        await authResolvers.Mutation.logout(null, {}, ctx);
      } catch (e) {
        error = e;
      }

      expect(error).toBeInstanceOf(GraphQLError);
      expect((error as GraphQLError).extensions?.code).toBe("UNAUTHENTICATED");
    });

    it("invalidates session and returns true when authenticated", async () => {
      const ctx = makeAuthCtx();
      vi.mocked(invalidateSession).mockResolvedValue(undefined);

      const result = await authResolvers.Mutation.logout(null, {}, ctx);

      expect(invalidateSession).toHaveBeenCalledWith(
        { prisma: ctx.prisma, queue: ctx.queue },
        "valid-session-token-abc",
      );
      expect(result).toBe(true);
    });
  });
});
