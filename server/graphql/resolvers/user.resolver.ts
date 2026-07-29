import { GraphQLError } from "graphql";
import { eq } from "drizzle-orm";

import type { GraphQLContext } from "../context.ts";
import { users } from "../../db/schema.ts";
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
  return { db: ctx.db, queue: ctx.queue };
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
      return ctx.db.query.users.findMany();
    },
  },

  Mutation: {
    createUser: async (
      _parent: unknown,
      args: { input: { email: string; password: string; name?: string; themeMode?: string } },
      ctx: GraphQLContext,
    ) => {
      return createUser(getDeps(ctx), args.input);
    },

    updateUser: async (
      _parent: unknown,
      args: { id: string; input: { name?: string; themeMode?: string } },
      ctx: GraphQLContext,
    ) => {
      requireAuth(ctx);
      const deps = getDeps(ctx);
      return deps.queue.enqueue(async () => {
        const data: Record<string, unknown> = {};
        if (args.input.name !== undefined) data.name = args.input.name;
        if (args.input.themeMode !== undefined) data.themeMode = args.input.themeMode;

        const [updated] = await deps.db
          .update(users)
          .set(data)
          .where(eq(users.id, args.id))
          .returning()
          .all();
        return updated;
      });
    },

    deleteUser: async (
      _parent: unknown,
      args: { id: string },
      ctx: GraphQLContext,
    ) => {
      requireAuth(ctx);
      const deps = getDeps(ctx);
      await deps.queue.enqueue(async () => {
        await deps.db.delete(users).where(eq(users.id, args.id)).run();
      });
      return true;
    },
  },
};
