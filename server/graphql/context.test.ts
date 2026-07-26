import { describe, it, expect, vi } from "vitest";
import type { IncomingMessage } from "node:http";

import { createContextFactory } from "./context.ts";
import type { AuthUser, GraphQLContext, CreateContextDeps } from "./context.ts";
import type { OperationQueue } from "../db/operationQueue.ts";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeDeps(): CreateContextDeps {
  return {
    prisma: {} as CreateContextDeps["prisma"],
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

function encodeUser(user: { id: string; email: string }): string {
  return Buffer.from(JSON.stringify(user)).toString("base64");
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("createContextFactory", () => {
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

  it("sets currentUser to null when token is invalid base64", async () => {
    const factory = createContextFactory(makeDeps());
    const ctx = await factory(makeReq("Bearer not-valid-json!!!"));

    expect(ctx.currentUser).toBeNull();
  });

  it("sets currentUser to null when token payload is missing id", async () => {
    const factory = createContextFactory(makeDeps());
    const token = Buffer.from(JSON.stringify({ email: "a@b.com" })).toString("base64");
    const ctx = await factory(makeReq(`Bearer ${token}`));

    expect(ctx.currentUser).toBeNull();
  });

  it("sets currentUser to null when token payload is missing email", async () => {
    const factory = createContextFactory(makeDeps());
    const token = Buffer.from(JSON.stringify({ id: "user-1" })).toString("base64");
    const ctx = await factory(makeReq(`Bearer ${token}`));

    expect(ctx.currentUser).toBeNull();
  });

  it("resolves currentUser from a valid Bearer token", async () => {
    const factory = createContextFactory(makeDeps());
    const user: AuthUser = { id: "user-123", email: "dm@example.com" };
    const token = encodeUser(user);
    const ctx = await factory(makeReq(`Bearer ${token}`));

    expect(ctx.currentUser).toEqual(user);
  });

  it("ignores extra fields in the token payload", async () => {
    const factory = createContextFactory(makeDeps());
    const token = Buffer.from(
      JSON.stringify({ id: "u1", email: "x@y.com", role: "admin" })
    ).toString("base64");
    const ctx = await factory(makeReq(`Bearer ${token}`));

    expect(ctx.currentUser).toEqual({ id: "u1", email: "x@y.com" });
  });
});
