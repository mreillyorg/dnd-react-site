import { describe, it, expect, vi, beforeEach } from "vitest";
import { GraphQLError } from "graphql";

import type { GraphQLContext } from "../context.ts";

// ---------------------------------------------------------------------------
// Mock service modules
// ---------------------------------------------------------------------------

vi.mock("../../services/authService.ts", () => ({
  register: vi.fn(),
  login: vi.fn(),
  changePassword: vi.fn(),
}));

// ---------------------------------------------------------------------------
// Import resolver (after mocks are set up)
// ---------------------------------------------------------------------------

import { authResolvers } from "./auth.resolver.ts";
import { register, login, changePassword } from "../../services/authService.ts";

// ---------------------------------------------------------------------------
// Test Helpers
// ---------------------------------------------------------------------------

function makeUnauthCtx(): GraphQLContext {
  return {
    currentUser: null,
    prisma: {} as GraphQLContext["prisma"],
    queue: { enqueue: vi.fn((fn) => fn()), drain: vi.fn(() => Promise.resolve()), pendingCount: 0 } as unknown as GraphQLContext["queue"],
  };
}

function makeAuthCtx(): GraphQLContext {
  return {
    currentUser: { id: "user-1", email: "test@example.com" },
    prisma: {
      user: { findUnique: vi.fn() },
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

  describe("Mutation.register", () => {
    it("calls register service with correct deps and args", async () => {
      const ctx = makeUnauthCtx();
      const fakePayload = {
        token: "jwt-token",
        user: { id: "u1", email: "new@test.com", name: "Test" },
      };
      vi.mocked(register).mockResolvedValue(fakePayload);

      const result = await authResolvers.Mutation.register(
        null,
        { email: "new@test.com", password: "Password1", name: "Test" },
        ctx,
      );

      expect(register).toHaveBeenCalledWith(
        { prisma: ctx.prisma, queue: ctx.queue },
        { email: "new@test.com", password: "Password1", name: "Test" },
      );
      expect(result).toEqual(fakePayload);
    });

    it("throws GraphQLError with code CONFLICT when email already exists", async () => {
      const ctx = makeUnauthCtx();
      vi.mocked(register).mockRejectedValue(
        new Error("User with this email already exists"),
      );

      let error: unknown;
      try {
        await authResolvers.Mutation.register(
          null,
          { email: "dup@test.com", password: "Password1", name: "Test" },
          ctx,
        );
      } catch (e) {
        error = e;
      }

      expect(error).toBeInstanceOf(GraphQLError);
      expect((error as GraphQLError).extensions?.code).toBe("CONFLICT");
    });

    it("throws GraphQLError with code BAD_USER_INPUT when validation fails (ZodError)", async () => {
      const ctx = makeUnauthCtx();
      // Simulate a ZodError-like object with an issues array
      const zodLikeError = {
        issues: [{ message: "Password must be at least 8 characters" }],
      };
      vi.mocked(register).mockRejectedValue(zodLikeError);

      let error: unknown;
      try {
        await authResolvers.Mutation.register(
          null,
          { email: "bad@test.com", password: "short" },
          ctx,
        );
      } catch (e) {
        error = e;
      }

      expect(error).toBeInstanceOf(GraphQLError);
      expect((error as GraphQLError).extensions?.code).toBe("BAD_USER_INPUT");
      expect((error as GraphQLError).message).toContain(
        "Password must be at least 8 characters",
      );
    });
  });

  describe("Mutation.login", () => {
    it("calls login service with correct deps and args", async () => {
      const ctx = makeUnauthCtx();
      const fakePayload = {
        token: "jwt-token",
        user: { id: "u1", email: "user@test.com", name: "Test" },
      };
      vi.mocked(login).mockResolvedValue(fakePayload);

      const result = await authResolvers.Mutation.login(
        null,
        { email: "user@test.com", password: "Password1" },
        ctx,
      );

      expect(login).toHaveBeenCalledWith(
        { prisma: ctx.prisma, queue: ctx.queue },
        { email: "user@test.com", password: "Password1" },
      );
      expect(result).toEqual(fakePayload);
    });

    it("throws GraphQLError with code UNAUTHENTICATED for invalid credentials", async () => {
      const ctx = makeUnauthCtx();
      vi.mocked(login).mockRejectedValue(
        new Error("Invalid email or password"),
      );

      let error: unknown;
      try {
        await authResolvers.Mutation.login(
          null,
          { email: "user@test.com", password: "wrong" },
          ctx,
        );
      } catch (e) {
        error = e;
      }

      expect(error).toBeInstanceOf(GraphQLError);
      expect((error as GraphQLError).extensions?.code).toBe("UNAUTHENTICATED");
    });
  });

  describe("Mutation.changePassword", () => {
    it("throws GraphQLError with code UNAUTHENTICATED when ctx.currentUser is null", async () => {
      const ctx = makeUnauthCtx();

      let error: unknown;
      try {
        await authResolvers.Mutation.changePassword(
          null,
          { currentPassword: "OldPass1", newPassword: "NewPass1" },
          ctx,
        );
      } catch (e) {
        error = e;
      }

      expect(error).toBeInstanceOf(GraphQLError);
      expect((error as GraphQLError).extensions?.code).toBe("UNAUTHENTICATED");
    });

    it("calls changePassword service with correct args when authenticated", async () => {
      const ctx = makeAuthCtx();
      vi.mocked(changePassword).mockResolvedValue(undefined);

      const result = await authResolvers.Mutation.changePassword(
        null,
        { currentPassword: "OldPass1", newPassword: "NewPass1" },
        ctx,
      );

      expect(changePassword).toHaveBeenCalledWith(
        { prisma: ctx.prisma, queue: ctx.queue },
        "user-1",
        "OldPass1",
        "NewPass1",
      );
      expect(result).toBe(true);
    });

    it("throws GraphQLError with code UNAUTHENTICATED when current password is incorrect", async () => {
      const ctx = makeAuthCtx();
      vi.mocked(changePassword).mockRejectedValue(
        new Error("Current password is incorrect"),
      );

      let error: unknown;
      try {
        await authResolvers.Mutation.changePassword(
          null,
          { currentPassword: "WrongPass1", newPassword: "NewPass1" },
          ctx,
        );
      } catch (e) {
        error = e;
      }

      expect(error).toBeInstanceOf(GraphQLError);
      expect((error as GraphQLError).extensions?.code).toBe("UNAUTHENTICATED");
    });
  });
});
