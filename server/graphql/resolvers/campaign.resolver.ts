import { GraphQLError } from "graphql";
import { eq, and } from "drizzle-orm";

import type { GraphQLContext, AuthUser } from "../context.ts";
import { npcs, locations, quests, timelineEntries } from "../../db/schema.ts";
import { createId } from "../../db/cuid.ts";
import * as campaignService from "../../services/campaignService.ts";

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

export const campaignResolvers = {
  Query: {
    campaign: (_: unknown, args: { id: string }, ctx: GraphQLContext) => {
      return campaignService.getCampaignById(
        { db: ctx.db, queue: ctx.queue },
        args.id,
      );
    },

    campaigns: (_: unknown, args: { ownerId?: string | null }, ctx: GraphQLContext) => {
      const ownerId = args.ownerId;
      if (!ownerId) {
        return ctx.db.query.campaigns.findMany();
      }
      return campaignService.listCampaignsByOwner(
        { db: ctx.db, queue: ctx.queue },
        ownerId,
      );
    },

    npc: (_: unknown, args: { id: string }, ctx: GraphQLContext) => {
      return ctx.db.query.npcs.findFirst({ where: eq(npcs.id, args.id) });
    },

    npcs: (_: unknown, args: { campaignId: string }, ctx: GraphQLContext) => {
      return ctx.db.query.npcs.findMany({ where: eq(npcs.campaignId, args.campaignId) });
    },

    location: (_: unknown, args: { id: string }, ctx: GraphQLContext) => {
      return ctx.db.query.locations.findFirst({ where: eq(locations.id, args.id) });
    },

    locations: (_: unknown, args: { campaignId: string }, ctx: GraphQLContext) => {
      return ctx.db.query.locations.findMany({ where: eq(locations.campaignId, args.campaignId) });
    },

    quest: (_: unknown, args: { id: string }, ctx: GraphQLContext) => {
      return ctx.db.query.quests.findFirst({ where: eq(quests.id, args.id) });
    },

    quests: (_: unknown, args: { campaignId: string; status?: string | null }, ctx: GraphQLContext) => {
      if (args.status) {
        return ctx.db.query.quests.findMany({
          where: and(eq(quests.campaignId, args.campaignId), eq(quests.status, args.status)),
        });
      }
      return ctx.db.query.quests.findMany({ where: eq(quests.campaignId, args.campaignId) });
    },

    timelineEntry: (_: unknown, args: { id: string }, ctx: GraphQLContext) => {
      return ctx.db.query.timelineEntries.findFirst({ where: eq(timelineEntries.id, args.id) });
    },

    timelineEntries: (_: unknown, args: { campaignId: string }, ctx: GraphQLContext) => {
      return ctx.db.query.timelineEntries.findMany({ where: eq(timelineEntries.campaignId, args.campaignId) });
    },
  },

  Mutation: {
    createCampaign: (_: unknown, args: { input: { name: string; description?: string | null; setting?: string | null; status?: string | null } }, ctx: GraphQLContext) => {
      const user = requireAuth(ctx);
      return campaignService.createCampaign(
        { db: ctx.db, queue: ctx.queue },
        { ...args.input, ownerId: user.id },
      );
    },

    updateCampaign: (_: unknown, args: { id: string; input: { name?: string | null; description?: string | null; setting?: string | null; status?: string | null } }, ctx: GraphQLContext) => {
      requireAuth(ctx);
      return campaignService.updateCampaign(
        { db: ctx.db, queue: ctx.queue },
        args.id,
        args.input,
      );
    },

    deleteCampaign: async (_: unknown, args: { id: string }, ctx: GraphQLContext) => {
      requireAuth(ctx);
      await campaignService.deleteCampaign(
        { db: ctx.db, queue: ctx.queue },
        args.id,
      );
      return true;
    },

    // --- NPC mutations ---

    createNPC: (_: unknown, args: { input: { name: string; description?: string | null; race?: string | null; class?: string | null; level?: number | null; role?: string | null; locationId?: string | null; campaignId: string } }, ctx: GraphQLContext) => {
      requireAuth(ctx);
      const { name, description, race, class: npcClass, level, role, locationId, campaignId } = args.input;
      return ctx.queue.enqueue(async () => {
        const id = createId();
        await ctx.db.insert(npcs).values({
          id,
          name,
          description: description ?? undefined,
          race: race ?? undefined,
          class: npcClass ?? undefined,
          level: level ?? undefined,
          role: role ?? undefined,
          locationId: locationId ?? undefined,
          campaignId,
        });
        const created = await ctx.db.query.npcs.findFirst({ where: eq(npcs.id, id) });
        return created!;
      });
    },

    updateNPC: (_: unknown, args: { id: string; input: { name?: string | null; description?: string | null; race?: string | null; class?: string | null; level?: number | null; role?: string | null; locationId?: string | null } }, ctx: GraphQLContext) => {
      requireAuth(ctx);
      const { name, description, race, class: npcClass, level, role, locationId } = args.input;
      return ctx.queue.enqueue(async () => {
        const data: Record<string, unknown> = {};
        if (name !== undefined && name !== null) data.name = name;
        if (description !== undefined) data.description = description;
        if (race !== undefined) data.race = race;
        if (npcClass !== undefined) data.class = npcClass;
        if (level !== undefined) data.level = level;
        if (role !== undefined) data.role = role;
        if (locationId !== undefined) data.locationId = locationId;

        await ctx.db.update(npcs).set(data).where(eq(npcs.id, args.id));
        const updated = await ctx.db.query.npcs.findFirst({ where: eq(npcs.id, args.id) });
        return updated!;
      });
    },

    deleteNPC: async (_: unknown, args: { id: string }, ctx: GraphQLContext) => {
      requireAuth(ctx);
      await ctx.queue.enqueue(async () => {
        await ctx.db.delete(npcs).where(eq(npcs.id, args.id));
      });
      return true;
    },

    // --- Location mutations ---

    createLocation: (_: unknown, args: { input: { name: string; description?: string | null; region?: string | null; parentId?: string | null; campaignId: string } }, ctx: GraphQLContext) => {
      requireAuth(ctx);
      const { name, description, region, parentId, campaignId } = args.input;
      return ctx.queue.enqueue(async () => {
        const id = createId();
        await ctx.db.insert(locations).values({
          id,
          name,
          description: description ?? undefined,
          region: region ?? undefined,
          parentId: parentId ?? undefined,
          campaignId,
        });
        const created = await ctx.db.query.locations.findFirst({ where: eq(locations.id, id) });
        return created!;
      });
    },

    updateLocation: (_: unknown, args: { id: string; input: { name?: string | null; description?: string | null; region?: string | null; parentId?: string | null } }, ctx: GraphQLContext) => {
      requireAuth(ctx);
      const { name, description, region, parentId } = args.input;
      return ctx.queue.enqueue(async () => {
        const data: Record<string, unknown> = {};
        if (name !== undefined && name !== null) data.name = name;
        if (description !== undefined) data.description = description;
        if (region !== undefined) data.region = region;
        if (parentId !== undefined) data.parentId = parentId;

        await ctx.db.update(locations).set(data).where(eq(locations.id, args.id));
        const updated = await ctx.db.query.locations.findFirst({ where: eq(locations.id, args.id) });
        return updated!;
      });
    },

    deleteLocation: async (_: unknown, args: { id: string }, ctx: GraphQLContext) => {
      requireAuth(ctx);
      await ctx.queue.enqueue(async () => {
        await ctx.db.delete(locations).where(eq(locations.id, args.id));
      });
      return true;
    },

    // --- Quest mutations ---

    createQuest: (_: unknown, args: { input: { name: string; description?: string | null; status?: string | null; rewards?: string | null; campaignId: string } }, ctx: GraphQLContext) => {
      requireAuth(ctx);
      const { name, description, status, rewards, campaignId } = args.input;
      return ctx.queue.enqueue(async () => {
        const id = createId();
        await ctx.db.insert(quests).values({
          id,
          name,
          description: description ?? undefined,
          status: status ?? undefined,
          rewards: rewards ?? undefined,
          campaignId,
        });
        const created = await ctx.db.query.quests.findFirst({ where: eq(quests.id, id) });
        return created!;
      });
    },

    updateQuest: (_: unknown, args: { id: string; input: { name?: string | null; description?: string | null; status?: string | null; rewards?: string | null } }, ctx: GraphQLContext) => {
      requireAuth(ctx);
      const { name, description, status, rewards } = args.input;
      return ctx.queue.enqueue(async () => {
        const data: Record<string, unknown> = {};
        if (name !== undefined && name !== null) data.name = name;
        if (description !== undefined) data.description = description;
        if (status !== undefined && status !== null) data.status = status;
        if (rewards !== undefined) data.rewards = rewards;

        await ctx.db.update(quests).set(data).where(eq(quests.id, args.id));
        const updated = await ctx.db.query.quests.findFirst({ where: eq(quests.id, args.id) });
        return updated!;
      });
    },

    deleteQuest: async (_: unknown, args: { id: string }, ctx: GraphQLContext) => {
      requireAuth(ctx);
      await ctx.queue.enqueue(async () => {
        await ctx.db.delete(quests).where(eq(quests.id, args.id));
      });
      return true;
    },

    // --- TimelineEntry mutations ---

    createTimelineEntry: (_: unknown, args: { input: { title?: string | null; description: string; inGameDate: string; campaignId: string } }, ctx: GraphQLContext) => {
      requireAuth(ctx);
      const { title, description, inGameDate, campaignId } = args.input;
      return ctx.queue.enqueue(async () => {
        const id = createId();
        await ctx.db.insert(timelineEntries).values({
          id,
          title: title ?? undefined,
          description,
          inGameDate,
          campaignId,
        });
        const created = await ctx.db.query.timelineEntries.findFirst({ where: eq(timelineEntries.id, id) });
        return created!;
      });
    },

    updateTimelineEntry: (_: unknown, args: { id: string; input: { title?: string | null; description?: string | null; inGameDate?: string | null } }, ctx: GraphQLContext) => {
      requireAuth(ctx);
      const { title, description, inGameDate } = args.input;
      return ctx.queue.enqueue(async () => {
        const data: Record<string, unknown> = {};
        if (title !== undefined) data.title = title;
        if (description !== undefined && description !== null) data.description = description;
        if (inGameDate !== undefined && inGameDate !== null) data.inGameDate = inGameDate;

        await ctx.db.update(timelineEntries).set(data).where(eq(timelineEntries.id, args.id));
        const updated = await ctx.db.query.timelineEntries.findFirst({ where: eq(timelineEntries.id, args.id) });
        return updated!;
      });
    },

    deleteTimelineEntry: async (_: unknown, args: { id: string }, ctx: GraphQLContext) => {
      requireAuth(ctx);
      await ctx.queue.enqueue(async () => {
        await ctx.db.delete(timelineEntries).where(eq(timelineEntries.id, args.id));
      });
      return true;
    },
  },
};
