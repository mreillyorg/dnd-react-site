import { GraphQLError } from "graphql";
import { eq } from "drizzle-orm";

import type { GraphQLContext } from "../context.ts";
import { combatants } from "../../db/schema.ts";
import { applyDamage, applyHealing, setTempHp } from "../../services/hpService.ts";

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

async function findCombatantOrThrow(ctx: GraphQLContext, id: string) {
  const combatant = await ctx.db.query.combatants.findFirst({
    where: eq(combatants.id, id),
  });
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

      return ctx.queue.enqueue(async () => {
        await ctx.db
          .update(combatants)
          .set({ currentHp: result.newCurrentHp, tempHp: result.newTempHp })
          .where(eq(combatants.id, args.combatantId));

        const updated = await ctx.db.query.combatants.findFirst({
          where: eq(combatants.id, args.combatantId),
        });
        return updated!;
      });
    },

    applyHealing: async (
      _parent: unknown,
      args: { combatantId: string; healing: number },
      ctx: GraphQLContext,
    ) => {
      requireAuth(ctx);

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

      return ctx.queue.enqueue(async () => {
        await ctx.db
          .update(combatants)
          .set({ currentHp: result.currentHp })
          .where(eq(combatants.id, args.combatantId));

        const updated = await ctx.db.query.combatants.findFirst({
          where: eq(combatants.id, args.combatantId),
        });
        return updated!;
      });
    },

    setTempHp: async (
      _parent: unknown,
      args: { combatantId: string; tempHp: number },
      ctx: GraphQLContext,
    ) => {
      requireAuth(ctx);

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

      return ctx.queue.enqueue(async () => {
        await ctx.db
          .update(combatants)
          .set({ tempHp: result.tempHp })
          .where(eq(combatants.id, args.combatantId));

        const updated = await ctx.db.query.combatants.findFirst({
          where: eq(combatants.id, args.combatantId),
        });
        return updated!;
      });
    },

    setMaxHp: async (
      _parent: unknown,
      args: { combatantId: string; maxHp: number },
      ctx: GraphQLContext,
    ) => {
      requireAuth(ctx);

      if (args.maxHp <= 0) {
        throw new GraphQLError("Max HP must be greater than zero", {
          extensions: { code: "BAD_USER_INPUT" },
        });
      }

      const combatant = await findCombatantOrThrow(ctx, args.combatantId);
      const newCurrentHp = Math.min(combatant.currentHp, args.maxHp);

      return ctx.queue.enqueue(async () => {
        await ctx.db
          .update(combatants)
          .set({ maxHp: args.maxHp, currentHp: newCurrentHp })
          .where(eq(combatants.id, args.combatantId));

        const updated = await ctx.db.query.combatants.findFirst({
          where: eq(combatants.id, args.combatantId),
        });
        return updated!;
      });
    },

    setCurrentHp: async (
      _parent: unknown,
      args: { combatantId: string; currentHp: number },
      ctx: GraphQLContext,
    ) => {
      requireAuth(ctx);

      if (args.currentHp < 0) {
        throw new GraphQLError("Current HP must be non-negative", {
          extensions: { code: "BAD_USER_INPUT" },
        });
      }

      const combatant = await findCombatantOrThrow(ctx, args.combatantId);
      const newCurrentHp = Math.min(Math.max(0, args.currentHp), combatant.maxHp);

      return ctx.queue.enqueue(async () => {
        await ctx.db
          .update(combatants)
          .set({ currentHp: newCurrentHp })
          .where(eq(combatants.id, args.combatantId));

        const updated = await ctx.db.query.combatants.findFirst({
          where: eq(combatants.id, args.combatantId),
        });
        return updated!;
      });
    },
  },
};
