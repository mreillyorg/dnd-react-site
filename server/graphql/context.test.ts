import { describe, it, expect, vi, beforeEach } from "vitest";
import type { IncomingMessage } from "node:http";

import { createContextFactory } from "./context.ts";
import type { AuthUser, CreateContextDeps } from "./context.ts";
import type { OperationQueue } from "../db/operationQueue.ts";

// ---------------------------------------------------------------------------
// Mock sessionCookie and oauthService
// ---------------------------------------------------------------------------

vi.mock("../services/sessionCookie.ts", () => ({
  getSessionToken: vi.fn(),
}));

vi.mock("../services/oauthService.ts", () => ({
  validateSession: vi.fn(),
}));

import { getSessionToken } from "../services/sessionCookie.ts";
import { validateSession } from "../services/oauthService.ts";

const mockedGetSessionToken = vi.mocked(getSessionToken);
const mockedValidateSession = vi.mocked(validateSession);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeDeps(): CreateContextDeps {
  return {
    prisma: {} as unknown as CreateContextDeps["prisma"],
    queue: { enqueue: vi.fn(), drain: vi.fn(), pendingCount: 0 } as unknown as OperationQueue,
  };
}

function makeReq(cookies?: Record<string, string>): { req: IncomingMessage } {
  const req = { headers: {}, cookies } as unknown as IncomingMessage;
  return { req };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("createContextFactory", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns context with prisma and queue from deps", async () => {
    mockedGetSessionToken.mockReturnValue(null);

    const deps = makeDeps();
    const factory = createContextFactory(deps);
    const ctx = await factory(makeReq());

    expect(ctx.prisma).toBe(deps.prisma);
    expect(ctx.queue).toBe(deps.queue);
  });

  it("sets currentUser to null when no session cookie is present", async () => {
    mockedGetSessionToken.mockReturnValue(null);

    const factory = createContextFactory(makeDeps());
    const ctx = await factory(makeReq());

    expect(ctx.currentUser).toBeNull();
    expect(mockedValidateSession).not.toHaveBeenCalled();
  });

  it("sets currentUser to null when session cookie is empty", async () => {
    mockedGetSessionToken.mockReturnValue(null);

    const factory = createContextFactory(makeDeps());
    const ctx = await factory(makeReq({ session: "" }));

    expect(ctx.currentUser).toBeNull();
    expect(mockedValidateSession).not.toHaveBeenCalled();
  });

  it("sets currentUser correctly when session token is valid", async () => {
    const expectedUser: AuthUser = { id: "user-123", email: "dm@example.com" };

    mockedGetSessionToken.mockReturnValue("valid-session-token");
    mockedValidateSession.mockResolvedValue(expectedUser);

    const deps = makeDeps();
    const factory = createContextFactory(deps);
    const ctx = await factory(makeReq({ session: "valid-session-token" }));

    expect(mockedGetSessionToken).toHaveBeenCalled();
    expect(mockedValidateSession).toHaveBeenCalledWith(deps, "valid-session-token");
    expect(ctx.currentUser).toEqual(expectedUser);
  });

  it("sets currentUser to null when session token is invalid (validateSession returns null)", async () => {
    mockedGetSessionToken.mockReturnValue("expired-token");
    mockedValidateSession.mockResolvedValue(null);

    const factory = createContextFactory(makeDeps());
    const ctx = await factory(makeReq({ session: "expired-token" }));

    expect(mockedValidateSession).toHaveBeenCalled();
    expect(ctx.currentUser).toBeNull();
  });

  it("does not call validateSession when getSessionToken returns null", async () => {
    mockedGetSessionToken.mockReturnValue(null);

    const factory = createContextFactory(makeDeps());
    await factory(makeReq());

    expect(mockedValidateSession).not.toHaveBeenCalled();
  });

  it("passes deps to validateSession for database lookup", async () => {
    const expectedUser: AuthUser = { id: "user-456", email: "player@example.com" };

    mockedGetSessionToken.mockReturnValue("session-abc");
    mockedValidateSession.mockResolvedValue(expectedUser);

    const deps = makeDeps();
    const factory = createContextFactory(deps);
    await factory(makeReq({ session: "session-abc" }));

    expect(mockedValidateSession).toHaveBeenCalledWith(deps, "session-abc");
  });
});
