import { GraphQLError } from "graphql";

import type { GraphQLContext, AuthUser } from "../context.ts";
import * as sessionService from "../../services/sessionService.ts";

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

export const sessionResolvers = {
  Query: {
    session: (_: unknown, args: { id: string }, ctx: GraphQLContext) => {
      return sessionService.getSessionById(
        { prisma: ctx.prisma, queue: ctx.queue },
        args.id,
      );
    },

    sessions: (_: unknown, args: { campaignId: string }, ctx: GraphQLContext) => {
      return sessionService.listSessionsByCampaign(
        { prisma: ctx.prisma, queue: ctx.queue },
        args.campaignId,
      );
    },

    sessionNote: (_: unknown, args: { id: string }, ctx: GraphQLContext) => {
      return ctx.prisma.sessionNote.findUnique({ where: { id: args.id } });
    },

    sessionNotes: (_: unknown, args: { sessionId: string }, ctx: GraphQLContext) => {
      return ctx.prisma.sessionNote.findMany({ where: { sessionId: args.sessionId } });
    },
  },

  Mutation: {
    createSession: (_: unknown, args: { input: { sessionNumber: number; title?: string | null; realWorldDate: Date; inGameDate?: string | null; duration?: number | null; campaignId: string } }, ctx: GraphQLContext) => {
      const user = requireAuth(ctx);
      return sessionService.createSession(
        { prisma: ctx.prisma, queue: ctx.queue },
        { ...args.input, dmId: user.id },
      );
    },

    updateSession: (_: unknown, args: { id: string; input: { sessionNumber?: number | null; title?: string | null; realWorldDate?: Date | null; inGameDate?: string | null; duration?: number | null } }, ctx: GraphQLContext) => {
      requireAuth(ctx);
      return sessionService.updateSession(
        { prisma: ctx.prisma, queue: ctx.queue },
        args.id,
        args.input,
      );
    },

    deleteSession: async (_: unknown, args: { id: string }, ctx: GraphQLContext) => {
      requireAuth(ctx);
      await sessionService.deleteSession(
        { prisma: ctx.prisma, queue: ctx.queue },
        args.id,
      );
      return true;
    },

    // --- SessionNote mutations (direct prisma through queue) ---

    createSessionNote: (_: unknown, args: { input: { title?: string | null; content: string; isSummary?: boolean | null; sessionId: string } }, ctx: GraphQLContext) => {
      requireAuth(ctx);
      const { title, content, isSummary, sessionId } = args.input;
      return ctx.queue.enqueue(() =>
        ctx.prisma.sessionNote.create({
          data: {
            title: title ?? undefined,
            content,
            isSummary: isSummary ?? undefined,
            sessionId,
          },
        }),
      );
    },

    updateSessionNote: (_: unknown, args: { id: string; input: { title?: string | null; content?: string | null; isSummary?: boolean | null } }, ctx: GraphQLContext) => {
      requireAuth(ctx);
      const { title, content, isSummary } = args.input;
      return ctx.queue.enqueue(() =>
        ctx.prisma.sessionNote.update({
          where: { id: args.id },
          data: {
            ...(title !== undefined && { title }),
            ...(content !== undefined && content !== null && { content }),
            ...(isSummary !== undefined && isSummary !== null && { isSummary }),
          },
        }),
      );
    },

    deleteSessionNote: async (_: unknown, args: { id: string }, ctx: GraphQLContext) => {
      requireAuth(ctx);
      await ctx.queue.enqueue(() =>
        ctx.prisma.sessionNote.delete({ where: { id: args.id } }),
      );
      return true;
    },
  },
};
