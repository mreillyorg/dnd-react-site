import { GraphQLError } from "graphql";

import type { GraphQLContext } from "../context.ts";
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
  return { prisma: ctx.prisma, queue: ctx.queue };
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
      // Fetch the full user record from the database
      const user = await ctx.prisma.user.findUnique({
        where: { id: ctx.currentUser.id },
      });
      return user;
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

      const identities = await ctx.prisma.oAuthIdentity.findMany({
        where: { userId: user.id },
        select: { provider: true },
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
