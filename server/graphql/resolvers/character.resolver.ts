import { GraphQLError } from "graphql";
import { eq } from "drizzle-orm";

import type { GraphQLContext } from "../context.ts";
import { characters } from "../../db/schema.ts";
import {
  createCharacter,
  getCharacterById,
  listCharactersByUser,
  updateCharacter,
  deleteCharacter,
} from "../../services/characterService.ts";
import type {
  CreateCharacterInput,
  UpdateCharacterInput,
} from "../../services/characterService.ts";

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

/**
 * Verifies the character belongs to the current user.
 */
async function requireOwnership(ctx: GraphQLContext, characterId: string) {
  const user = requireAuth(ctx);
  const character = await getCharacterById(getDeps(ctx), characterId);

  if (!character) {
    throw new GraphQLError("Character not found", {
      extensions: { code: "NOT_FOUND" },
    });
  }

  if (character.userId !== user.id) {
    throw new GraphQLError("Not authorized to modify this character", {
      extensions: { code: "FORBIDDEN" },
    });
  }

  return character;
}

// ---------------------------------------------------------------------------
// Resolver Map
// ---------------------------------------------------------------------------

export const characterResolvers = {
  Query: {
    character: async (
      _parent: unknown,
      args: { id: string },
      ctx: GraphQLContext,
    ) => {
      return getCharacterById(getDeps(ctx), args.id);
    },

    characters: async (
      _parent: unknown,
      args: { userId?: string; campaignId?: string },
      ctx: GraphQLContext,
    ) => {
      if (args.userId) {
        return listCharactersByUser(getDeps(ctx), args.userId);
      }
      if (args.campaignId) {
        return ctx.db.query.characters.findMany({
          where: eq(characters.campaignId, args.campaignId),
          with: { itemAssignments: true },
        });
      }
      // If no filter, return all characters
      return ctx.db.query.characters.findMany({
        with: { itemAssignments: true },
      });
    },
  },

  Mutation: {
    createCharacter: async (
      _parent: unknown,
      args: { input: CreateCharacterInput },
      ctx: GraphQLContext,
    ) => {
      const user = requireAuth(ctx);
      return createCharacter(getDeps(ctx), user.id, args.input);
    },

    updateCharacter: async (
      _parent: unknown,
      args: { id: string; input: UpdateCharacterInput },
      ctx: GraphQLContext,
    ) => {
      await requireOwnership(ctx, args.id);
      return updateCharacter(getDeps(ctx), args.id, args.input);
    },

    deleteCharacter: async (
      _parent: unknown,
      args: { id: string },
      ctx: GraphQLContext,
    ) => {
      await requireOwnership(ctx, args.id);
      await deleteCharacter(getDeps(ctx), args.id);
      return true;
    },
  },
};
