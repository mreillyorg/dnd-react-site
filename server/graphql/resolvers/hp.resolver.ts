import { GraphQLError } from "graphql";

import type { GraphQLContext } from "../context.ts";
import { applyDamage, applyHealing, setTempHp } from "../../../src/services/hpService.ts";

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
  return { prisma: ctx.prisma, queue: ctx.queue };
}

async function findCombatantOrThrow(ctx: GraphQLContext, id: string) {
  const combatant = await ctx.prisma.combatant.findUnique({ where: { id } });
  if (!combatant) {
    throw new GraphQLError("Combatant not found", {
      extensions: { code: "NOT_FOUND" },
    });
  }
  return combatant;
}

// ---------------------------------------------------------------------------
// Resolver Map
// ---------------------------------------------------------------------------

export const hpResolvers = {
  Mutation: {
    applyDamage: async (
      _parent: unknown,
      args: { combatantId: string; damage: number },
      ctx: GraphQLContext,
    ) => {
      requireAuth(ctx);
      const deps = getDeps(ctx);

      if (args.damage < 0) {
        throw new GraphQLError("Damage must be non-negative", {
          extensions: { code: "BAD_USER_INPUT" },
        });
      }

      const combatant = await findCombatantOrThrow(ctx, args.combatantId);

      const result = applyDamage(
        { maxHp: combatant.maxHp, currentHp: combatant.currentHp, tempHp: combatant.tempHp },
        args.damage,
      );

      return deps.queue.enqueue(() =>
        deps.prisma.combatant.update({
          where: { id: args.combatantId },
          data: {
            currentHp: result.newCurrentHp,
            tempHp: result.newTempHp,
          },
        }),
      );
    },

    applyHealing: async (
      _parent: unknown,
      args: { combatantId: string; healing: number },
      ctx: GraphQLContext,
    ) => {
      requireAuth(ctx);
      const deps = getDeps(ctx);

      if (args.healing < 0) {
        throw new GraphQLError("Healing must be non-negative", {
          extensions: { code: "BAD_USER_INPUT" },
        });
      }

      const combatant = await findCombatantOrThrow(ctx, args.combatantId);

      const result = applyHealing(
        { maxHp: combatant.maxHp, currentHp: combatant.currentHp, tempHp: combatant.tempHp },
        args.healing,
      );

      return deps.queue.enqueue(() =>
        deps.prisma.combatant.update({
          where: { id: args.combatantId },
          data: {
            currentHp: result.currentHp,
          },
        }),
      );
    },

    setTempHp: async (
      _parent: unknown,
      args: { combatantId: string; tempHp: number },
      ctx: GraphQLContext,
    ) => {
      requireAuth(ctx);
      const deps = getDeps(ctx);

      if (args.tempHp < 0) {
        throw new GraphQLError("Temp HP must be non-negative", {
          extensions: { code: "BAD_USER_INPUT" },
        });
      }

      const combatant = await findCombatantOrThrow(ctx, args.combatantId);

      const result = setTempHp(
        { maxHp: combatant.maxHp, currentHp: combatant.currentHp, tempHp: combatant.tempHp },
        args.tempHp,
      );

      return deps.queue.enqueue(() =>
        deps.prisma.combatant.update({
          where: { id: args.combatantId },
          data: {
            tempHp: result.tempHp,
          },
        }),
      );
    },

    setMaxHp: async (
      _parent: unknown,
      args: { combatantId: string; maxHp: number },
      ctx: GraphQLContext,
    ) => {
      requireAuth(ctx);
      const deps = getDeps(ctx);

      if (args.maxHp <= 0) {
        throw new GraphQLError("Max HP must be greater than zero", {
          extensions: { code: "BAD_USER_INPUT" },
        });
      }

      const combatant = await findCombatantOrThrow(ctx, args.combatantId);

      // Clamp currentHp to new maxHp if it would exceed it
      const newCurrentHp = Math.min(combatant.currentHp, args.maxHp);

      return deps.queue.enqueue(() =>
        deps.prisma.combatant.update({
          where: { id: args.combatantId },
          data: {
            maxHp: args.maxHp,
            currentHp: newCurrentHp,
          },
        }),
      );
    },

    setCurrentHp: async (
      _parent: unknown,
      args: { combatantId: string; currentHp: number },
      ctx: GraphQLContext,
    ) => {
      requireAuth(ctx);
      const deps = getDeps(ctx);

      if (args.currentHp < 0) {
        throw new GraphQLError("Current HP must be non-negative", {
          extensions: { code: "BAD_USER_INPUT" },
        });
      }

      const combatant = await findCombatantOrThrow(ctx, args.combatantId);

      // Clamp between 0 and maxHp
      const newCurrentHp = Math.min(Math.max(0, args.currentHp), combatant.maxHp);

      return deps.queue.enqueue(() =>
        deps.prisma.combatant.update({
          where: { id: args.combatantId },
          data: {
            currentHp: newCurrentHp,
          },
        }),
      );
    },
  },
};
