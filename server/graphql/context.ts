import type { IncomingMessage } from "node:http";

import { fromNodeHeaders } from "better-auth/node";

import type { DrizzleDb } from "../db/drizzle.ts";
import type { OperationQueue } from "../db/operationQueue.ts";
import { auth } from "../auth.ts";

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
 * Uses better-auth's `getSession` API to resolve the current user
 * from request headers (session cookie).
 */
export function createContextFactory(deps: CreateContextDeps) {
  return async ({ req }: { req: IncomingMessage }): Promise<GraphQLContext> => {
    let currentUser: AuthUser | null = null;

    try {
      const session = await auth.api.getSession({
        headers: fromNodeHeaders(req.headers),
      });

      if (session?.user) {
        currentUser = {
          id: session.user.id,
          email: session.user.email,
        };
      }
    } catch {
      // Session validation failed — treat as unauthenticated
    }

    return {
      db: deps.db,
      queue: deps.queue,
      currentUser,
    };
  };
}
