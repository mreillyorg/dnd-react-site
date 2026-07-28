import { GraphQLError } from "graphql";
import { eq } from "drizzle-orm";

import type { GraphQLContext, AuthUser } from "../context.ts";
import { sessionNotes } from "../../db/schema.ts";
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
        { db: ctx.db, queue: ctx.queue },
        args.id,
      );
    },

    sessions: (_: unknown, args: { campaignId: string }, ctx: GraphQLContext) => {
      return sessionService.listSessionsByCampaign(
        { db: ctx.db, queue: ctx.queue },
        args.campaignId,
      );
    },

    sessionNote: (_: unknown, args: { id: string }, ctx: GraphQLContext) => {
      return ctx.db.query.sessionNotes.findFirst({ where: eq(sessionNotes.id, args.id) });
    },

    sessionNotes: (_: unknown, args: { sessionId: string }, ctx: GraphQLContext) => {
      return ctx.db.query.sessionNotes.findMany({ where: eq(sessionNotes.sessionId, args.sessionId) });
    },
  },

  Mutation: {
    createSession: (_: unknown, args: { input: { sessionNumber: number; title?: string | null; realWorldDate: Date; inGameDate?: string | null; duration?: number | null; campaignId: string } }, ctx: GraphQLContext) => {
      const user = requireAuth(ctx);
      return sessionService.createSession(
        { db: ctx.db, queue: ctx.queue },
        { ...args.input, dmId: user.id },
      );
    },

    updateSession: (_: unknown, args: { id: string; input: { sessionNumber?: number | null; title?: string | null; realWorldDate?: Date | null; inGameDate?: string | null; duration?: number | null } }, ctx: GraphQLContext) => {
      requireAuth(ctx);
      return sessionService.updateSession(
        { db: ctx.db, queue: ctx.queue },
        args.id,
        args.input,
      );
    },

    deleteSession: async (_: unknown, args: { id: string }, ctx: GraphQLContext) => {
      requireAuth(ctx);
      await sessionService.deleteSession(
        { db: ctx.db, queue: ctx.queue },
        args.id,
      );
      return true;
    },

    // --- SessionNote mutations ---

    createSessionNote: (_: unknown, args: { input: { title?: string | null; content: string; isSummary?: boolean | null; sessionId: string } }, ctx: GraphQLContext) => {
      requireAuth(ctx);
      const { title, content, isSummary, sessionId } = args.input;
      return ctx.queue.enqueue(() => {
        const [created] = ctx.db.insert(sessionNotes).values({
          title: title ?? undefined,
          content,
          isSummary: isSummary ?? undefined,
          sessionId,
        }).returning().all();
        return Promise.resolve(created);
      });
    },

    updateSessionNote: (_: unknown, args: { id: string; input: { title?: string | null; content?: string | null; isSummary?: boolean | null } }, ctx: GraphQLContext) => {
      requireAuth(ctx);
      const { title, content, isSummary } = args.input;
      return ctx.queue.enqueue(() => {
        const data: Record<string, unknown> = {};
        if (title !== undefined) data.title = title;
        if (content !== undefined && content !== null) data.content = content;
        if (isSummary !== undefined && isSummary !== null) data.isSummary = isSummary;

        const [updated] = ctx.db.update(sessionNotes).set(data).where(eq(sessionNotes.id, args.id)).returning().all();
        return Promise.resolve(updated);
      });
    },

    deleteSessionNote: async (_: unknown, args: { id: string }, ctx: GraphQLContext) => {
      requireAuth(ctx);
      await ctx.queue.enqueue(() => {
        ctx.db.delete(sessionNotes).where(eq(sessionNotes.id, args.id)).run();
        return Promise.resolve();
      });
      return true;
    },
  },
};
