import { GraphQLError } from "graphql";
import { eq, and } from "drizzle-orm";

import type { GraphQLContext } from "../context.ts";
import { items } from "../../db/schema.ts";
import { createId } from "../../db/cuid.ts";

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
      return ctx.db.query.items.findFirst({
        where: eq(items.id, args.id),
      });
    },

    items: async (
      _parent: unknown,
      args: { itemType?: string; rarity?: string; source?: string },
      ctx: GraphQLContext,
    ) => {
      const conditions = [];
      if (args.itemType) conditions.push(eq(items.itemType, args.itemType));
      if (args.rarity) conditions.push(eq(items.rarity, args.rarity));
      if (args.source) conditions.push(eq(items.source, args.source));

      if (conditions.length > 0) {
        return ctx.db.query.items.findMany({
          where: conditions.length === 1 ? conditions[0] : and(...conditions),
        });
      }

      return ctx.db.query.items.findMany();
    },
  },

  Mutation: {
    createItem: async (
      _parent: unknown,
      args: { input: CreateItemInput },
      ctx: GraphQLContext,
    ) => {
      const user = requireAuth(ctx);
      return ctx.queue.enqueue(async () => {
        const id = createId();
        await ctx.db.insert(items).values({
          id,
          name: args.input.name,
          description: args.input.description,
          itemType: args.input.itemType,
          rarity: args.input.rarity,
          attunementRequired: args.input.attunementRequired ?? false,
          weight: args.input.weight,
          value: args.input.value,
          source: args.input.source ?? "HOMEBREW",
          createdById: user.id,
        });
        const created = await ctx.db.query.items.findFirst({ where: eq(items.id, id) });
        return created!;
      });
    },

    updateItem: async (
      _parent: unknown,
      args: { id: string; input: UpdateItemInput },
      ctx: GraphQLContext,
    ) => {
      requireAuth(ctx);
      return ctx.queue.enqueue(async () => {
        const data: Record<string, unknown> = {};
        if (args.input.name !== undefined) data.name = args.input.name;
        if (args.input.description !== undefined) data.description = args.input.description;
        if (args.input.itemType !== undefined) data.itemType = args.input.itemType;
        if (args.input.rarity !== undefined) data.rarity = args.input.rarity;
        if (args.input.attunementRequired !== undefined) data.attunementRequired = args.input.attunementRequired;
        if (args.input.weight !== undefined) data.weight = args.input.weight;
        if (args.input.value !== undefined) data.value = args.input.value;
        if (args.input.source !== undefined) data.source = args.input.source;

        await ctx.db.update(items).set(data).where(eq(items.id, args.id));
        const updated = await ctx.db.query.items.findFirst({ where: eq(items.id, args.id) });
        return updated!;
      });
    },

    deleteItem: async (
      _parent: unknown,
      args: { id: string },
      ctx: GraphQLContext,
    ) => {
      requireAuth(ctx);
      await ctx.queue.enqueue(async () => {
        await ctx.db.delete(items).where(eq(items.id, args.id));
      });
      return true;
    },
  },
};
