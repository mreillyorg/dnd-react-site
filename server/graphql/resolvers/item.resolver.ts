import { GraphQLError } from "graphql";

import type { GraphQLContext } from "../context.ts";

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

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CreateItemInput {
  name: string;
  description: string;
  itemType: string;
  rarity: string;
  attunementRequired?: boolean;
  weight?: number;
  value?: number;
  source?: string;
}

interface UpdateItemInput {
  name?: string;
  description?: string;
  itemType?: string;
  rarity?: string;
  attunementRequired?: boolean;
  weight?: number | null;
  value?: number | null;
  source?: string;
}

// ---------------------------------------------------------------------------
// Resolver Map
// ---------------------------------------------------------------------------

export const itemResolvers = {
  Query: {
    item: async (
      _parent: unknown,
      args: { id: string },
      ctx: GraphQLContext,
    ) => {
      return ctx.prisma.item.findUnique({
        where: { id: args.id },
      });
    },

    items: async (
      _parent: unknown,
      args: { itemType?: string; rarity?: string; source?: string },
      ctx: GraphQLContext,
    ) => {
      const where: Record<string, string> = {};
      if (args.itemType) where.itemType = args.itemType;
      if (args.rarity) where.rarity = args.rarity;
      if (args.source) where.source = args.source;

      return ctx.prisma.item.findMany({ where });
    },
  },

  Mutation: {
    createItem: async (
      _parent: unknown,
      args: { input: CreateItemInput },
      ctx: GraphQLContext,
    ) => {
      const user = requireAuth(ctx);
      return ctx.queue.enqueue(() =>
        ctx.prisma.item.create({
          data: {
            name: args.input.name,
            description: args.input.description,
            itemType: args.input.itemType,
            rarity: args.input.rarity,
            attunementRequired: args.input.attunementRequired ?? false,
            weight: args.input.weight,
            value: args.input.value,
            source: args.input.source ?? "HOMEBREW",
            createdById: user.id,
          },
        }),
      );
    },

    updateItem: async (
      _parent: unknown,
      args: { id: string; input: UpdateItemInput },
      ctx: GraphQLContext,
    ) => {
      requireAuth(ctx);
      return ctx.queue.enqueue(() =>
        ctx.prisma.item.update({
          where: { id: args.id },
          data: {
            ...(args.input.name !== undefined && { name: args.input.name }),
            ...(args.input.description !== undefined && { description: args.input.description }),
            ...(args.input.itemType !== undefined && { itemType: args.input.itemType }),
            ...(args.input.rarity !== undefined && { rarity: args.input.rarity }),
            ...(args.input.attunementRequired !== undefined && { attunementRequired: args.input.attunementRequired }),
            ...(args.input.weight !== undefined && { weight: args.input.weight }),
            ...(args.input.value !== undefined && { value: args.input.value }),
            ...(args.input.source !== undefined && { source: args.input.source }),
          },
        }),
      );
    },

    deleteItem: async (
      _parent: unknown,
      args: { id: string },
      ctx: GraphQLContext,
    ) => {
      requireAuth(ctx);
      await ctx.queue.enqueue(() =>
        ctx.prisma.item.delete({
          where: { id: args.id },
        }),
      );
      return true;
    },
  },
};
