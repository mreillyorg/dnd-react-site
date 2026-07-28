import { GraphQLError } from "graphql";

import type { GraphQLContext, AuthUser } from "../context.ts";
import * as encounterService from "../../services/encounterService.ts";

// ---------------------------------------------------------------------------
// Auth helper
// ---------------------------------------------------------------------------

function requireAuth(ctx: GraphQLContext): AuthUser {
  if (!ctx.currentUser) {
    throw new GraphQLError("Not authenticated", {
      extensions: { code: "UNAUTHENTICATED" },
    });
  }
  return ctx.currentUser;
}

// ---------------------------------------------------------------------------
// Resolver map
// ---------------------------------------------------------------------------

export const encounterResolvers = {
  Query: {
    combatEncounter: (_: unknown, args: { id: string }, ctx: GraphQLContext) => {
      return encounterService.getEncounterById(
        { db: ctx.db, queue: ctx.queue },
        args.id,
      );
    },

    combatEncounters: (_: unknown, args: { sessionId?: string | null }, ctx: GraphQLContext) => {
      if (args.sessionId) {
        return encounterService.listEncountersBySession(
          { db: ctx.db, queue: ctx.queue },
          args.sessionId,
        );
      }
      return ctx.db.query.combatEncounters.findMany();
    },
  },

  Mutation: {
    createCombatEncounter: (_: unknown, args: { input: { name?: string | null; isActive?: boolean | null; sessionId?: string | null } }, ctx: GraphQLContext) => {
      requireAuth(ctx);
      return encounterService.createEncounter(
        { db: ctx.db, queue: ctx.queue },
        args.input,
      );
    },

    updateCombatEncounter: (_: unknown, args: { id: string; input: { name?: string | null; isActive?: boolean | null; currentRound?: number | null; currentTurn?: number | null } }, ctx: GraphQLContext) => {
      requireAuth(ctx);
      return encounterService.updateEncounter(
        { db: ctx.db, queue: ctx.queue },
        args.id,
        args.input,
      );
    },

    deleteCombatEncounter: async (_: unknown, args: { id: string }, ctx: GraphQLContext) => {
      requireAuth(ctx);
      await encounterService.deleteEncounter(
        { db: ctx.db, queue: ctx.queue },
        args.id,
      );
      return true;
    },
  },
};
