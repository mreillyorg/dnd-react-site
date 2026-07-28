import { GraphQLError } from "graphql";
import { eq, and } from "drizzle-orm";

import type { GraphQLContext } from "../context.ts";
import { monsters } from "../../db/schema.ts";
import {
  createStatBlock,
  getStatBlockById,
  listStatBlocks,
  updateStatBlock,
  deleteStatBlock,
} from "../../services/statBlockService.ts";
import type {
  CreateStatBlockInput,
  UpdateStatBlockInput,
} from "../../services/statBlockService.ts";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function requireAuth(ctx: GraphQLContext) {
  if (!ctx.currentUser) {
    throw new GraphQLError("Not authenticated", {
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

export const statBlockResolvers = {
  Query: {
    monster: async (
      _parent: unknown,
      args: { id: string },
      ctx: GraphQLContext,
    ) => {
      return getStatBlockById(getDeps(ctx), args.id);
    },

    monsters: async (
      _parent: unknown,
      args: { type?: string; source?: string },
      ctx: GraphQLContext,
    ) => {
      // Apply optional filters
      const conditions = [];
      if (args.type) conditions.push(eq(monsters.type, args.type));
      if (args.source) conditions.push(eq(monsters.source, args.source));

      if (conditions.length > 0) {
        return ctx.db.query.monsters.findMany({
          where: conditions.length === 1 ? conditions[0] : and(...conditions),
        });
      }

      return listStatBlocks(getDeps(ctx));
    },
  },

  Mutation: {
    createMonster: async (
      _parent: unknown,
      args: { input: CreateStatBlockInput },
      ctx: GraphQLContext,
    ) => {
      const user = requireAuth(ctx);
      return createStatBlock(getDeps(ctx), args.input, user.id);
    },

    updateMonster: async (
      _parent: unknown,
      args: { id: string; input: UpdateStatBlockInput },
      ctx: GraphQLContext,
    ) => {
      requireAuth(ctx);
      return updateStatBlock(getDeps(ctx), args.id, args.input);
    },

    deleteMonster: async (
      _parent: unknown,
      args: { id: string },
      ctx: GraphQLContext,
    ) => {
      requireAuth(ctx);
      await deleteStatBlock(getDeps(ctx), args.id);
      return true;
    },
  },
};
