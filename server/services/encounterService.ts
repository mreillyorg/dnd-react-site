import { eq } from "drizzle-orm";

import type { DrizzleDb } from "../db/drizzle.ts";
import type { OperationQueue } from "../db/operationQueue.ts";
import { combatEncounters } from "../db/schema.ts";
import { createId } from "../db/cuid.ts";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ServiceContext {
  db: DrizzleDb;
  queue: OperationQueue;
}

export interface CreateEncounterInput {
  name?: string | null;
  isActive?: boolean | null;
  sessionId?: string | null;
}

export interface UpdateEncounterInput {
  name?: string | null;
  isActive?: boolean | null;
  currentRound?: number | null;
  currentTurn?: number | null;
}

// ---------------------------------------------------------------------------
// Service Functions
// ---------------------------------------------------------------------------

/**
 * Creates a new combat encounter.
 * Write goes through the queue for concurrency safety.
 */
export function createEncounter(ctx: ServiceContext, input: CreateEncounterInput) {
  return ctx.queue.enqueue(async () => {
    const id = createId();
    await ctx.db
      .insert(combatEncounters)
      .values({
        id,
        name: input.name ?? undefined,
        isActive: input.isActive ?? undefined,
        sessionId: input.sessionId ?? undefined,
      });

    const created = await ctx.db.query.combatEncounters.findFirst({
      where: eq(combatEncounters.id, id),
    });
    return created!;
  });
}

/**
 * Retrieves an encounter by its ID.
 * Reads go directly through Drizzle (no queue needed).
 */
export function getEncounterById(ctx: ServiceContext, id: string) {
  return ctx.db.query.combatEncounters.findFirst({ where: eq(combatEncounters.id, id) });
}

/**
 * Lists all encounters for a specific session.
 * Reads go directly through Drizzle (no queue needed).
 */
export function listEncountersBySession(ctx: ServiceContext, sessionId: string) {
  return ctx.db.query.combatEncounters.findMany({ where: eq(combatEncounters.sessionId, sessionId) });
}

/**
 * Updates an existing encounter.
 * Write goes through the queue for concurrency safety.
 */
export function updateEncounter(
  ctx: ServiceContext,
  id: string,
  input: UpdateEncounterInput,
) {
  return ctx.queue.enqueue(async () => {
    const data: Record<string, unknown> = {};
    if (input.name !== undefined) data.name = input.name;
    if (input.isActive !== undefined && input.isActive !== null) data.isActive = input.isActive;
    if (input.currentRound !== undefined && input.currentRound !== null) data.currentRound = input.currentRound;
    if (input.currentTurn !== undefined && input.currentTurn !== null) data.currentTurn = input.currentTurn;

    await ctx.db
      .update(combatEncounters)
      .set(data)
      .where(eq(combatEncounters.id, id));

    const updated = await ctx.db.query.combatEncounters.findFirst({
      where: eq(combatEncounters.id, id),
    });
    return updated!;
  });
}

/**
 * Deletes an encounter by its ID.
 * Write goes through the queue for concurrency safety.
 */
export function deleteEncounter(ctx: ServiceContext, id: string) {
  return ctx.queue.enqueue(async () => {
    const existing = await ctx.db.query.combatEncounters.findFirst({
      where: eq(combatEncounters.id, id),
    });

    await ctx.db.delete(combatEncounters).where(eq(combatEncounters.id, id));

    return existing!;
  });
}
