import { GraphQLError } from "graphql";

import type { GraphQLContext } from "../context.ts";
import {
  createUser,
  getUserById,
} from "../../services/userService.ts";

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

export const userResolvers = {
  Query: {
    me: async (_parent: unknown, _args: unknown, ctx: GraphQLContext) => {
      const user = requireAuth(ctx);
      return getUserById(getDeps(ctx), user.id);
    },

    user: async (
      _parent: unknown,
      args: { id: string },
      ctx: GraphQLContext,
    ) => {
      return getUserById(getDeps(ctx), args.id);
    },

    users: async (_parent: unknown, _args: unknown, ctx: GraphQLContext) => {
      return ctx.prisma.user.findMany();
    },
  },

  Mutation: {
    createUser: async (
      _parent: unknown,
      args: { input: { email: string; password: string; name?: string; themeMode?: string } },
      ctx: GraphQLContext,
    ) => {
      // Public - no auth required
      return createUser(getDeps(ctx), args.input);
    },

    updateUser: async (
      _parent: unknown,
      args: { id: string; input: { name?: string; themeMode?: string } },
      ctx: GraphQLContext,
    ) => {
      requireAuth(ctx);
      const deps = getDeps(ctx);
      return deps.queue.enqueue(() =>
        deps.prisma.$transaction(async (tx) => {
          return tx.user.update({
            where: { id: args.id },
            data: {
              ...(args.input.name !== undefined && { name: args.input.name }),
              ...(args.input.themeMode !== undefined && { themeMode: args.input.themeMode }),
            },
          });
        }),
      );
    },

    deleteUser: async (
      _parent: unknown,
      args: { id: string },
      ctx: GraphQLContext,
    ) => {
      requireAuth(ctx);
      const deps = getDeps(ctx);
      await deps.queue.enqueue(() =>
        deps.prisma.$transaction(async (tx) => {
          return tx.user.delete({ where: { id: args.id } });
        }),
      );
      return true;
    },
  },
};
