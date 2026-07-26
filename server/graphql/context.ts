import type { PrismaClient } from "@prisma/client";
import type { IncomingMessage } from "node:http";

import type { OperationQueue } from "../db/operationQueue.ts";
import { verifyToken } from "../services/authService.ts";

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
export function extractBearerToken(
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
 * Resolves an AuthUser from a bearer token by verifying the JWT
 * and looking up the user in the database.
 *
 * Returns `null` if the token is invalid, expired, or the user doesn't exist.
 * Errors are logged but never thrown — an invalid token simply means
 * the request is unauthenticated.
 */
async function resolveUser(
  token: string,
  prisma: PrismaClient
): Promise<AuthUser | null> {
  try {
    const userId = verifyToken(token);

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true },
    });

    if (!user) return null;

    return { id: user.id, email: user.email };
  } catch (error) {
    console.error("[context] Token verification failed:", error);
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
    const currentUser = token ? await resolveUser(token, deps.prisma) : null;

    return {
      prisma: deps.prisma,
      queue: deps.queue,
      currentUser,
    };
  };
}
