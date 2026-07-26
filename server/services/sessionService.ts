import type { PrismaClient } from "@prisma/client";
import type { OperationQueue } from "../db/operationQueue.ts";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ServiceContext {
  prisma: PrismaClient;
  queue: OperationQueue;
}

export interface CreateSessionInput {
  sessionNumber: number;
  title?: string | null;
  realWorldDate: Date;
  inGameDate?: string | null;
  duration?: number | null;
  campaignId: string;
}

export interface UpdateSessionInput {
  sessionNumber?: number | null;
  title?: string | null;
  realWorldDate?: Date | null;
  inGameDate?: string | null;
  duration?: number | null;
}

// ---------------------------------------------------------------------------
// Service Functions
// ---------------------------------------------------------------------------

/**
 * Creates a new session. The dmId is provided by the resolver (from currentUser).
 * Write goes through the queue for SQLite single-writer safety.
 */
export function createSession(
  ctx: ServiceContext,
  input: CreateSessionInput & { dmId: string },
) {
  const { dmId, sessionNumber, title, realWorldDate, inGameDate, duration, campaignId } = input;

  return ctx.queue.enqueue(() =>
    ctx.prisma.session.create({
      data: {
        sessionNumber,
        title: title ?? undefined,
        realWorldDate,
        inGameDate: inGameDate ?? undefined,
        duration: duration ?? undefined,
        campaignId,
        dmId,
      },
    }),
  );
}

/**
 * Retrieves a session by its ID.
 * Reads go directly through Prisma (no queue needed).
 */
export function getSessionById(ctx: ServiceContext, id: string) {
  return ctx.prisma.session.findUnique({ where: { id } });
}

/**
 * Lists all sessions for a specific campaign.
 * Reads go directly through Prisma (no queue needed).
 */
export function listSessionsByCampaign(ctx: ServiceContext, campaignId: string) {
  return ctx.prisma.session.findMany({ where: { campaignId } });
}

/**
 * Updates an existing session.
 * Write goes through the queue for SQLite single-writer safety.
 */
export function updateSession(
  ctx: ServiceContext,
  id: string,
  input: UpdateSessionInput,
) {
  return ctx.queue.enqueue(() =>
    ctx.prisma.session.update({
      where: { id },
      data: {
        ...(input.sessionNumber !== undefined && input.sessionNumber !== null && { sessionNumber: input.sessionNumber }),
        ...(input.title !== undefined && { title: input.title }),
        ...(input.realWorldDate !== undefined && input.realWorldDate !== null && { realWorldDate: input.realWorldDate }),
        ...(input.inGameDate !== undefined && { inGameDate: input.inGameDate }),
        ...(input.duration !== undefined && { duration: input.duration }),
      },
    }),
  );
}

/**
 * Deletes a session by its ID.
 * Write goes through the queue for SQLite single-writer safety.
 */
export function deleteSession(ctx: ServiceContext, id: string) {
  return ctx.queue.enqueue(() =>
    ctx.prisma.session.delete({ where: { id } }),
  );
}
