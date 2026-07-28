import { GraphQLError } from "graphql";
import { eq } from "drizzle-orm";

import type { GraphQLContext } from "../context.ts";
import { itemAssignments } from "../../db/schema.ts";
import {
  addItemToInventory,
  removeItemFromInventory,
  updateItemSlot,
  getInventoryByCharacter,
} from "../../services/inventoryService.ts";
import type {
  AddItemToInventoryInput,
  UpdateItemSlotInput,
} from "../../services/inventoryService.ts";

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

export const inventoryResolvers = {
  Query: {
    itemAssignment: async (
      _parent: unknown,
      args: { id: string },
      ctx: GraphQLContext,
    ) => {
      return ctx.db.query.itemAssignments.findFirst({
        where: eq(itemAssignments.id, args.id),
        with: { item: true, character: true },
      });
    },

    itemAssignments: async (
      _parent: unknown,
      args: { characterId: string },
      ctx: GraphQLContext,
    ) => {
      return getInventoryByCharacter(getDeps(ctx), args.characterId);
    },
  },

  Mutation: {
    createItemAssignment: async (
      _parent: unknown,
      args: { input: AddItemToInventoryInput },
      ctx: GraphQLContext,
    ) => {
      requireAuth(ctx);
      return addItemToInventory(getDeps(ctx), args.input);
    },

    updateItemAssignment: async (
      _parent: unknown,
      args: { id: string; input: UpdateItemSlotInput },
      ctx: GraphQLContext,
    ) => {
      requireAuth(ctx);
      return updateItemSlot(getDeps(ctx), args.id, args.input);
    },

    deleteItemAssignment: async (
      _parent: unknown,
      args: { id: string },
      ctx: GraphQLContext,
    ) => {
      requireAuth(ctx);
      await removeItemFromInventory(getDeps(ctx), args.id);
      return true;
    },
  },
};
