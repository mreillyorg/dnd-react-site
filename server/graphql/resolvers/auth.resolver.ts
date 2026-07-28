import { GraphQLError } from "graphql";
import { eq } from "drizzle-orm";

import type { GraphQLContext } from "../context.ts";
import { users, oauthIdentities } from "../../db/schema.ts";
import { createAuthorizationURL, invalidateSession } from "../../services/oauthService.ts";
import { SUPPORTED_PROVIDERS, type SupportedProvider } from "../../services/oauthProviders.ts";

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

function getDeps(ctx: GraphQLContext) {
  return { db: ctx.db, queue: ctx.queue };
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

    initiateOAuth: (
      _parent: unknown,
      args: { provider: string },
      _ctx: GraphQLContext,
    ) => {
      const provider = args.provider.toLowerCase();

      if (!SUPPORTED_PROVIDERS.includes(provider as SupportedProvider)) {
        throw new GraphQLError(
          `Unsupported OAuth provider: ${args.provider}`,
          { extensions: { code: "BAD_USER_INPUT" } },
        );
      }

      const result = createAuthorizationURL(provider as SupportedProvider);
      return { url: result.url, provider };
    },

    linkedProviders: async (
      _parent: unknown,
      _args: unknown,
      ctx: GraphQLContext,
    ) => {
      const user = requireAuth(ctx);

      const identities = await ctx.db.query.oauthIdentities.findMany({
        where: eq(oauthIdentities.userId, user.id),
        columns: { provider: true },
      });

      return identities.map((identity) => identity.provider);
    },
  },

  Mutation: {
    logout: async (
      _parent: unknown,
      _args: unknown,
      ctx: GraphQLContext,
    ) => {
      requireAuth(ctx);

      if (ctx.sessionToken) {
        await invalidateSession(getDeps(ctx), ctx.sessionToken);
      }

      return true;
    },
  },
};
