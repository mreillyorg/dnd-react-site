import { GraphQLError } from "graphql";
import { eq } from "drizzle-orm";

import type { GraphQLContext } from "../context.ts";
import { users, accounts } from "../../db/schema.ts";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function requireAuth(ctx: GraphQLContext) {
  if (!ctx.currentUser) {
    throw new GraphQLError("Authentication required", {
      extensions: { code: "UNAUTHENTICATED" },
    });
  }
  return ctx.currentUser;
}

// ---------------------------------------------------------------------------
// Resolver Map
// ---------------------------------------------------------------------------

export const authResolvers = {
  Query: {
    me: async (
      _parent: unknown,
      _args: unknown,
      ctx: GraphQLContext,
    ) => {
      if (!ctx.currentUser) {
        return null;
      }
      return ctx.db.query.users.findFirst({
        where: eq(users.id, ctx.currentUser.id),
      });
    },

    linkedProviders: async (
      _parent: unknown,
      _args: unknown,
      ctx: GraphQLContext,
    ) => {
      const user = requireAuth(ctx);

      // better-auth stores linked accounts in the "accounts" table
      const userAccounts = await ctx.db.query.accounts.findMany({
        where: eq(accounts.userId, user.id),
        columns: { providerId: true },
      });

      return userAccounts.map((account) => account.providerId);
    },
  },

  Mutation: {
    logout: async (
      _parent: unknown,
      _args: unknown,
      ctx: GraphQLContext,
    ) => {
      requireAuth(ctx);
      // Client-side should call POST /api/auth/sign-out to invalidate
      // the session via better-auth. This resolver confirms intent.
      return true;
    },
  },
};
