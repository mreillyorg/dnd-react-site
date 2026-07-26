import type { PrismaClient } from "@prisma/client";
import type { IncomingMessage } from "node:http";

import type { OperationQueue } from "../db/operationQueue.ts";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Represents an authenticated user extracted from the Authorization header.
 */
export interface AuthUser {
  id: string;
  email: string;
}

/**
 * The GraphQL context object available to all resolvers.
 */
export interface GraphQLContext {
  prisma: PrismaClient;
  queue: OperationQueue;
  currentUser: AuthUser | null;
}

// ---------------------------------------------------------------------------
// Context Factory
// ---------------------------------------------------------------------------

export interface CreateContextDeps {
  prisma: PrismaClient;
  queue: OperationQueue;
}

/**
 * Extracts a Bearer token from an Authorization header value.
 * Returns `null` if the header is missing, empty, or not in "Bearer <token>" format.
 */
function extractBearerToken(
  authHeader: string | undefined | null
): string | null {
  if (!authHeader) return null;
  const parts = authHeader.split(" ");
  if (parts.length !== 2 || parts[0] !== "Bearer") return null;
  const token = parts[1];
  if (!token || token.trim().length === 0) return null;
  return token;
}

/**
 * Resolves an AuthUser from a bearer token.
 *
 * Currently a stub implementation that decodes a simple base64-encoded JSON
 * payload with `{ id, email }`. In a real implementation this would verify
 * a JWT signature or call an auth service.
 */
function resolveUser(token: string): AuthUser | null {
  try {
    const decoded = Buffer.from(token, "base64").toString("utf-8");
    const payload: unknown = JSON.parse(decoded);

    if (
      typeof payload === "object" &&
      payload !== null &&
      "id" in payload &&
      "email" in payload &&
      typeof (payload as AuthUser).id === "string" &&
      typeof (payload as AuthUser).email === "string"
    ) {
      return { id: (payload as AuthUser).id, email: (payload as AuthUser).email };
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Creates a GraphQL context builder for use with Apollo Server.
 *
 * Usage:
 * ```ts
 * const contextFactory = createContextFactory({ prisma, queue });
 * // Pass contextFactory as the `context` option to Apollo Server
 * ```
 */
export function createContextFactory(deps: CreateContextDeps) {
  return async ({ req }: { req: IncomingMessage }): Promise<GraphQLContext> => {
    const authHeader = req.headers["authorization"];
    const headerValue = Array.isArray(authHeader) ? authHeader[0] : authHeader;
    const token = extractBearerToken(headerValue);
    const currentUser = token ? resolveUser(token) : null;

    return {
      prisma: deps.prisma,
      queue: deps.queue,
      currentUser,
    };
  };
}
