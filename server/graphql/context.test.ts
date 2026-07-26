import { describe, it, expect, vi, beforeEach } from "vitest";
import type { IncomingMessage } from "node:http";

import { createContextFactory, extractBearerToken } from "./context.ts";
import type { AuthUser, CreateContextDeps } from "./context.ts";
import type { OperationQueue } from "../db/operationQueue.ts";

// ---------------------------------------------------------------------------
// Mock AuthService
// ---------------------------------------------------------------------------

vi.mock("../services/authService.ts", () => ({
  verifyToken: vi.fn(),
}));

import { verifyToken } from "../services/authService.ts";

const mockedVerifyToken = vi.mocked(verifyToken);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeDeps(): CreateContextDeps {
  return {
    prisma: {
      user: {
        findUnique: vi.fn(),
      },
    } as unknown as CreateContextDeps["prisma"],
    queue: { enqueue: vi.fn(), drain: vi.fn(), pendingCount: 0 } as unknown as OperationQueue,
  };
}

function makeReq(authHeader?: string): { req: IncomingMessage } {
  const headers: Record<string, string | undefined> = {};
  if (authHeader !== undefined) {
    headers["authorization"] = authHeader;
  }
  return { req: { headers } as unknown as IncomingMessage };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("extractBearerToken", () => {
  it("returns null for undefined input", () => {
    expect(extractBearerToken(undefined)).toBeNull();
  });

  it("returns null for null input", () => {
    expect(extractBearerToken(null)).toBeNull();
  });

  it("returns null for empty string", () => {
    expect(extractBearerToken("")).toBeNull();
  });

  it("returns null for non-Bearer scheme", () => {
    expect(extractBearerToken("Basic abc123")).toBeNull();
  });

  it("returns null when Bearer token is whitespace only", () => {
    expect(extractBearerToken("Bearer ")).toBeNull();
  });

  it("returns the token for valid Bearer header", () => {
    expect(extractBearerToken("Bearer my-jwt-token")).toBe("my-jwt-token");
  });

  it("returns null when there are more than 2 parts", () => {
    expect(extractBearerToken("Bearer token extra")).toBeNull();
  });
});

describe("createContextFactory", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns context with prisma and queue from deps", async () => {
    const deps = makeDeps();
    const factory = createContextFactory(deps);
    const ctx = await factory(makeReq());

    expect(ctx.prisma).toBe(deps.prisma);
    expect(ctx.queue).toBe(deps.queue);
  });

  it("sets currentUser to null when no Authorization header is present", async () => {
    const factory = createContextFactory(makeDeps());
    const ctx = await factory(makeReq());

    expect(ctx.currentUser).toBeNull();
  });

  it("sets currentUser to null when Authorization header is empty", async () => {
    const factory = createContextFactory(makeDeps());
    const ctx = await factory(makeReq(""));

    expect(ctx.currentUser).toBeNull();
  });

  it("sets currentUser to null when Authorization header is not Bearer scheme", async () => {
    const factory = createContextFactory(makeDeps());
    const ctx = await factory(makeReq("Basic abc123"));

    expect(ctx.currentUser).toBeNull();
  });

  it("sets currentUser to null when Bearer token is missing", async () => {
    const factory = createContextFactory(makeDeps());
    const ctx = await factory(makeReq("Bearer "));

    expect(ctx.currentUser).toBeNull();
  });

  it("sets currentUser correctly when token is valid and user exists", async () => {
    const deps = makeDeps();
    const expectedUser: AuthUser = { id: "user-123", email: "dm@example.com" };

    mockedVerifyToken.mockReturnValue("user-123");
    (deps.prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(expectedUser);

    const factory = createContextFactory(deps);
    const ctx = await factory(makeReq("Bearer valid-jwt-token"));

    expect(mockedVerifyToken).toHaveBeenCalledWith("valid-jwt-token");
    expect(deps.prisma.user.findUnique).toHaveBeenCalledWith({
      where: { id: "user-123" },
      select: { id: true, email: true },
    });
    expect(ctx.currentUser).toEqual(expectedUser);
  });

  it("sets currentUser to null when token is invalid (verifyToken throws)", async () => {
    const deps = makeDeps();
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    mockedVerifyToken.mockImplementation(() => {
      throw new Error("Invalid or expired token");
    });

    const factory = createContextFactory(deps);
    const ctx = await factory(makeReq("Bearer invalid-token"));

    expect(ctx.currentUser).toBeNull();
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "[context] Token verification failed:",
      expect.any(Error)
    );

    consoleErrorSpy.mockRestore();
  });

  it("sets currentUser to null when user is not found in database", async () => {
    const deps = makeDeps();

    mockedVerifyToken.mockReturnValue("deleted-user-id");
    (deps.prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const factory = createContextFactory(deps);
    const ctx = await factory(makeReq("Bearer valid-but-deleted-user"));

    expect(mockedVerifyToken).toHaveBeenCalledWith("valid-but-deleted-user");
    expect(ctx.currentUser).toBeNull();
  });

  it("sets currentUser to null and logs error when database lookup fails", async () => {
    const deps = makeDeps();
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    mockedVerifyToken.mockReturnValue("user-123");
    (deps.prisma.user.findUnique as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error("Database connection lost")
    );

    const factory = createContextFactory(deps);
    const ctx = await factory(makeReq("Bearer valid-token"));

    expect(ctx.currentUser).toBeNull();
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "[context] Token verification failed:",
      expect.any(Error)
    );

    consoleErrorSpy.mockRestore();
  });

  it("does not call verifyToken when no token is extracted", async () => {
    const factory = createContextFactory(makeDeps());
    await factory(makeReq());

    expect(mockedVerifyToken).not.toHaveBeenCalled();
  });

  it("handles malformed Authorization header without Bearer prefix", async () => {
    const factory = createContextFactory(makeDeps());
    const ctx = await factory(makeReq("Token some-value"));

    expect(ctx.currentUser).toBeNull();
    expect(mockedVerifyToken).not.toHaveBeenCalled();
  });

  it("handles array-valued authorization header (takes first value)", async () => {
    const deps = makeDeps();
    mockedVerifyToken.mockReturnValue("user-arr");
    (deps.prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "user-arr",
      email: "arr@example.com",
    });

    const factory = createContextFactory(deps);
    const headers: Record<string, string[]> = {
      authorization: ["Bearer array-token", "Bearer second-token"],
    };
    const req = { headers } as unknown as IncomingMessage;
    const ctx = await factory({ req });

    expect(mockedVerifyToken).toHaveBeenCalledWith("array-token");
    expect(ctx.currentUser).toEqual({ id: "user-arr", email: "arr@example.com" });
  });
});
