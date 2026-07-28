import { GraphQLError } from "graphql";
import { eq } from "drizzle-orm";

import type { GraphQLContext } from "../context.ts";
import { combatants } from "../../db/schema.ts";
import {
  createCombatant,
  updateCombatant,
  deleteCombatant,
  listCombatantsByEncounter,
} from "../../services/combatantService.ts";
import type {
  CreateCombatantInput,
  UpdateCombatantInput,
} from "../../services/combatantService.ts";

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

export const combatantResolvers = {
  Query: {
    combatant: async (
      _parent: unknown,
      args: { id: string },
      ctx: GraphQLContext,
    ) => {
      return ctx.db.query.combatants.findFirst({
        where: eq(combatants.id, args.id),
      });
    },

    combatants: async (
      _parent: unknown,
      args: { encounterId: string },
      ctx: GraphQLContext,
    ) => {
      return listCombatantsByEncounter(getDeps(ctx), args.encounterId);
    },
  },

  Mutation: {
    createCombatant: async (
      _parent: unknown,
      args: { input: CreateCombatantInput },
      ctx: GraphQLContext,
    ) => {
      requireAuth(ctx);
      return createCombatant(getDeps(ctx), args.input);
    },

    updateCombatant: async (
      _parent: unknown,
      args: { id: string; input: UpdateCombatantInput },
      ctx: GraphQLContext,
    ) => {
      requireAuth(ctx);
      return updateCombatant(getDeps(ctx), args.id, args.input);
    },

    deleteCombatant: async (
      _parent: unknown,
      args: { id: string },
      ctx: GraphQLContext,
    ) => {
      requireAuth(ctx);
      await deleteCombatant(getDeps(ctx), args.id);
      return true;
    },
  },
};
