import { GraphQLError } from "graphql";

import type { GraphQLContext, AuthUser } from "../context.ts";
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
        { prisma: ctx.prisma, queue: ctx.queue },
        args.id,
      );
    },

    campaigns: (_: unknown, args: { ownerId?: string | null }, ctx: GraphQLContext) => {
      const ownerId = args.ownerId;
      if (!ownerId) {
        return ctx.prisma.campaign.findMany();
      }
      return campaignService.listCampaignsByOwner(
        { prisma: ctx.prisma, queue: ctx.queue },
        ownerId,
      );
    },

    npc: (_: unknown, args: { id: string }, ctx: GraphQLContext) => {
      return ctx.prisma.nPC.findUnique({ where: { id: args.id } });
    },

    npcs: (_: unknown, args: { campaignId: string }, ctx: GraphQLContext) => {
      return ctx.prisma.nPC.findMany({ where: { campaignId: args.campaignId } });
    },

    location: (_: unknown, args: { id: string }, ctx: GraphQLContext) => {
      return ctx.prisma.location.findUnique({ where: { id: args.id } });
    },

    locations: (_: unknown, args: { campaignId: string }, ctx: GraphQLContext) => {
      return ctx.prisma.location.findMany({ where: { campaignId: args.campaignId } });
    },

    quest: (_: unknown, args: { id: string }, ctx: GraphQLContext) => {
      return ctx.prisma.quest.findUnique({ where: { id: args.id } });
    },

    quests: (_: unknown, args: { campaignId: string; status?: string | null }, ctx: GraphQLContext) => {
      const where: { campaignId: string; status?: string } = { campaignId: args.campaignId };
      if (args.status) {
        where.status = args.status;
      }
      return ctx.prisma.quest.findMany({ where });
    },

    timelineEntry: (_: unknown, args: { id: string }, ctx: GraphQLContext) => {
      return ctx.prisma.timelineEntry.findUnique({ where: { id: args.id } });
    },

    timelineEntries: (_: unknown, args: { campaignId: string }, ctx: GraphQLContext) => {
      return ctx.prisma.timelineEntry.findMany({ where: { campaignId: args.campaignId } });
    },
  },

  Mutation: {
    createCampaign: (_: unknown, args: { input: { name: string; description?: string | null; setting?: string | null; status?: string | null } }, ctx: GraphQLContext) => {
      const user = requireAuth(ctx);
      return campaignService.createCampaign(
        { prisma: ctx.prisma, queue: ctx.queue },
        { ...args.input, ownerId: user.id },
      );
    },

    updateCampaign: (_: unknown, args: { id: string; input: { name?: string | null; description?: string | null; setting?: string | null; status?: string | null } }, ctx: GraphQLContext) => {
      requireAuth(ctx);
      return campaignService.updateCampaign(
        { prisma: ctx.prisma, queue: ctx.queue },
        args.id,
        args.input,
      );
    },

    deleteCampaign: async (_: unknown, args: { id: string }, ctx: GraphQLContext) => {
      requireAuth(ctx);
      await campaignService.deleteCampaign(
        { prisma: ctx.prisma, queue: ctx.queue },
        args.id,
      );
      return true;
    },

    // --- NPC mutations (direct prisma through queue) ---

    createNPC: (_: unknown, args: { input: { name: string; description?: string | null; race?: string | null; class?: string | null; level?: number | null; role?: string | null; locationId?: string | null; campaignId: string } }, ctx: GraphQLContext) => {
      requireAuth(ctx);
      const { name, description, race, class: npcClass, level, role, locationId, campaignId } = args.input;
      return ctx.queue.enqueue(() =>
        ctx.prisma.nPC.create({
          data: {
            name,
            description: description ?? undefined,
            race: race ?? undefined,
            class: npcClass ?? undefined,
            level: level ?? undefined,
            role: role ?? undefined,
            locationId: locationId ?? undefined,
            campaignId,
          },
        }),
      );
    },

    updateNPC: (_: unknown, args: { id: string; input: { name?: string | null; description?: string | null; race?: string | null; class?: string | null; level?: number | null; role?: string | null; locationId?: string | null } }, ctx: GraphQLContext) => {
      requireAuth(ctx);
      const { name, description, race, class: npcClass, level, role, locationId } = args.input;
      return ctx.queue.enqueue(() =>
        ctx.prisma.nPC.update({
          where: { id: args.id },
          data: {
            ...(name !== undefined && name !== null && { name }),
            ...(description !== undefined && { description }),
            ...(race !== undefined && { race }),
            ...(npcClass !== undefined && { class: npcClass }),
            ...(level !== undefined && { level }),
            ...(role !== undefined && { role }),
            ...(locationId !== undefined && { locationId }),
          },
        }),
      );
    },

    deleteNPC: async (_: unknown, args: { id: string }, ctx: GraphQLContext) => {
      requireAuth(ctx);
      await ctx.queue.enqueue(() =>
        ctx.prisma.nPC.delete({ where: { id: args.id } }),
      );
      return true;
    },

    // --- Location mutations (direct prisma through queue) ---

    createLocation: (_: unknown, args: { input: { name: string; description?: string | null; region?: string | null; parentId?: string | null; campaignId: string } }, ctx: GraphQLContext) => {
      requireAuth(ctx);
      const { name, description, region, parentId, campaignId } = args.input;
      return ctx.queue.enqueue(() =>
        ctx.prisma.location.create({
          data: {
            name,
            description: description ?? undefined,
            region: region ?? undefined,
            parentId: parentId ?? undefined,
            campaignId,
          },
        }),
      );
    },

    updateLocation: (_: unknown, args: { id: string; input: { name?: string | null; description?: string | null; region?: string | null; parentId?: string | null } }, ctx: GraphQLContext) => {
      requireAuth(ctx);
      const { name, description, region, parentId } = args.input;
      return ctx.queue.enqueue(() =>
        ctx.prisma.location.update({
          where: { id: args.id },
          data: {
            ...(name !== undefined && name !== null && { name }),
            ...(description !== undefined && { description }),
            ...(region !== undefined && { region }),
            ...(parentId !== undefined && { parentId }),
          },
        }),
      );
    },

    deleteLocation: async (_: unknown, args: { id: string }, ctx: GraphQLContext) => {
      requireAuth(ctx);
      await ctx.queue.enqueue(() =>
        ctx.prisma.location.delete({ where: { id: args.id } }),
      );
      return true;
    },

    // --- Quest mutations (direct prisma through queue) ---

    createQuest: (_: unknown, args: { input: { name: string; description?: string | null; status?: string | null; rewards?: string | null; campaignId: string } }, ctx: GraphQLContext) => {
      requireAuth(ctx);
      const { name, description, status, rewards, campaignId } = args.input;
      return ctx.queue.enqueue(() =>
        ctx.prisma.quest.create({
          data: {
            name,
            description: description ?? undefined,
            status: status ?? undefined,
            rewards: rewards ?? undefined,
            campaignId,
          },
        }),
      );
    },

    updateQuest: (_: unknown, args: { id: string; input: { name?: string | null; description?: string | null; status?: string | null; rewards?: string | null } }, ctx: GraphQLContext) => {
      requireAuth(ctx);
      const { name, description, status, rewards } = args.input;
      return ctx.queue.enqueue(() =>
        ctx.prisma.quest.update({
          where: { id: args.id },
          data: {
            ...(name !== undefined && name !== null && { name }),
            ...(description !== undefined && { description }),
            ...(status !== undefined && status !== null && { status }),
            ...(rewards !== undefined && { rewards }),
          },
        }),
      );
    },

    deleteQuest: async (_: unknown, args: { id: string }, ctx: GraphQLContext) => {
      requireAuth(ctx);
      await ctx.queue.enqueue(() =>
        ctx.prisma.quest.delete({ where: { id: args.id } }),
      );
      return true;
    },

    // --- TimelineEntry mutations (direct prisma through queue) ---

    createTimelineEntry: (_: unknown, args: { input: { title?: string | null; description: string; inGameDate: string; campaignId: string } }, ctx: GraphQLContext) => {
      requireAuth(ctx);
      const { title, description, inGameDate, campaignId } = args.input;
      return ctx.queue.enqueue(() =>
        ctx.prisma.timelineEntry.create({
          data: {
            title: title ?? undefined,
            description,
            inGameDate,
            campaignId,
          },
        }),
      );
    },

    updateTimelineEntry: (_: unknown, args: { id: string; input: { title?: string | null; description?: string | null; inGameDate?: string | null } }, ctx: GraphQLContext) => {
      requireAuth(ctx);
      const { title, description, inGameDate } = args.input;
      return ctx.queue.enqueue(() =>
        ctx.prisma.timelineEntry.update({
          where: { id: args.id },
          data: {
            ...(title !== undefined && { title }),
            ...(description !== undefined && description !== null && { description }),
            ...(inGameDate !== undefined && inGameDate !== null && { inGameDate }),
          },
        }),
      );
    },

    deleteTimelineEntry: async (_: unknown, args: { id: string }, ctx: GraphQLContext) => {
      requireAuth(ctx);
      await ctx.queue.enqueue(() =>
        ctx.prisma.timelineEntry.delete({ where: { id: args.id } }),
      );
      return true;
    },
  },
};
