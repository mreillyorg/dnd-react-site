import type { PrismaClient } from "@prisma/client";
import type { OperationQueue } from "../db/operationQueue.ts";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ServiceContext {
  prisma: PrismaClient;
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
 * Write goes through the queue for SQLite single-writer safety.
 */
export function createEncounter(ctx: ServiceContext, input: CreateEncounterInput) {
  return ctx.queue.enqueue(() =>
    ctx.prisma.combatEncounter.create({
      data: {
        name: input.name ?? undefined,
        isActive: input.isActive ?? undefined,
        sessionId: input.sessionId ?? undefined,
      },
    }),
  );
}

/**
 * Retrieves an encounter by its ID.
 * Reads go directly through Prisma (no queue needed).
 */
export function getEncounterById(ctx: ServiceContext, id: string) {
  return ctx.prisma.combatEncounter.findUnique({ where: { id } });
}

/**
 * Lists all encounters for a specific session.
 * Reads go directly through Prisma (no queue needed).
 */
export function listEncountersBySession(ctx: ServiceContext, sessionId: string) {
  return ctx.prisma.combatEncounter.findMany({ where: { sessionId } });
}

/**
 * Updates an existing encounter.
 * Write goes through the queue for SQLite single-writer safety.
 */
export function updateEncounter(
  ctx: ServiceContext,
  id: string,
  input: UpdateEncounterInput,
) {
  return ctx.queue.enqueue(() =>
    ctx.prisma.combatEncounter.update({
      where: { id },
      data: {
        ...(input.name !== undefined && { name: input.name }),
        ...(input.isActive !== undefined && input.isActive !== null && { isActive: input.isActive }),
        ...(input.currentRound !== undefined && input.currentRound !== null && { currentRound: input.currentRound }),
        ...(input.currentTurn !== undefined && input.currentTurn !== null && { currentTurn: input.currentTurn }),
      },
    }),
  );
}

/**
 * Deletes an encounter by its ID.
 * Write goes through the queue for SQLite single-writer safety.
 */
export function deleteEncounter(ctx: ServiceContext, id: string) {
  return ctx.queue.enqueue(() =>
    ctx.prisma.combatEncounter.delete({ where: { id } }),
  );
}
