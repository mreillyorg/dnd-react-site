import { eq } from "drizzle-orm";

import type { DrizzleDb } from "../db/drizzle.ts";
import type { OperationQueue } from "../db/operationQueue.ts";
import { sessions } from "../db/schema.ts";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ServiceContext {
  db: DrizzleDb;
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

  return ctx.queue.enqueue(async () => {
    const [created] = await ctx.db
      .insert(sessions)
      .values({
        sessionNumber,
        title: title ?? undefined,
        realWorldDate,
        inGameDate: inGameDate ?? undefined,
        duration: duration ?? undefined,
        campaignId,
        dmId,
      })
      .returning()
      .all();
    return created;
  });
}

/**
 * Retrieves a session by its ID.
 * Reads go directly through Drizzle (no queue needed).
 */
export function getSessionById(ctx: ServiceContext, id: string) {
  return ctx.db.query.sessions.findFirst({ where: eq(sessions.id, id) });
}

/**
 * Lists all sessions for a specific campaign.
 * Reads go directly through Drizzle (no queue needed).
 */
export function listSessionsByCampaign(ctx: ServiceContext, campaignId: string) {
  return ctx.db.query.sessions.findMany({ where: eq(sessions.campaignId, campaignId) });
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
  return ctx.queue.enqueue(async () => {
    const data: Record<string, unknown> = {};
    if (input.sessionNumber !== undefined && input.sessionNumber !== null) data.sessionNumber = input.sessionNumber;
    if (input.title !== undefined) data.title = input.title;
    if (input.realWorldDate !== undefined && input.realWorldDate !== null) data.realWorldDate = input.realWorldDate;
    if (input.inGameDate !== undefined) data.inGameDate = input.inGameDate;
    if (input.duration !== undefined) data.duration = input.duration;

    const [updated] = await ctx.db
      .update(sessions)
      .set(data)
      .where(eq(sessions.id, id))
      .returning()
      .all();
    return updated;
  });
}

/**
 * Deletes a session by its ID.
 * Write goes through the queue for SQLite single-writer safety.
 */
export function deleteSession(ctx: ServiceContext, id: string) {
  return ctx.queue.enqueue(async () => {
    const [deleted] = await ctx.db
      .delete(sessions)
      .where(eq(sessions.id, id))
      .returning()
      .all();
    return deleted;
  });
}
