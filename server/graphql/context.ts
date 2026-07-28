import type { IncomingMessage } from "node:http";

import type { DrizzleDb } from "../db/drizzle.ts";
import type { OperationQueue } from "../db/operationQueue.ts";
import { getSessionToken } from "../services/sessionCookie.ts";
import { validateSession } from "../services/oauthService.ts";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Represents an authenticated user resolved from the session cookie.
 */
export interface AuthUser {
  id: string;
  email: string;
}

/**
 * The GraphQL context object available to all resolvers.
 */
export interface GraphQLContext {
  db: DrizzleDb;
  queue: OperationQueue;
  currentUser: AuthUser | null;
  sessionToken: string | null;
}

/**
 * Extends IncomingMessage with the `cookies` property attached by cookie-parser.
 */
interface RequestWithCookies extends IncomingMessage {
  cookies?: Record<string, string>;
}

// ---------------------------------------------------------------------------
// Context Factory
// ---------------------------------------------------------------------------

export interface CreateContextDeps {
  db: DrizzleDb;
  queue: OperationQueue;
}

/**
 * Creates a GraphQL context builder for use with Apollo Server.
 *
 * Parses the session cookie from the request (cookie-parser must have run upstream),
 * validates the session in the database, and sets `currentUser` if valid.
 */
export function createContextFactory(deps: CreateContextDeps) {
  return async ({ req }: { req: IncomingMessage }): Promise<GraphQLContext> => {
    const sessionToken = getSessionToken(req as RequestWithCookies as import("express").Request);
    const currentUser = sessionToken
      ? await validateSession(deps, sessionToken)
      : null;

    return {
      db: deps.db,
      queue: deps.queue,
      currentUser,
      sessionToken,
    };
  };
}
