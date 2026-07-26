import type { PrismaClient } from "@prisma/client";
import type { OperationQueue } from "../db/operationQueue.ts";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CreateCombatantInput {
  name: string;
  initiative: number;
  maxHp: number;
  currentHp: number;
  tempHp?: number;
  armorClass: number;
  combatantType: string;
  characterId?: string;
  monsterId?: string;
  encounterId: string;
}

export interface UpdateCombatantInput {
  name?: string;
  initiative?: number;
  maxHp?: number;
  currentHp?: number;
  tempHp?: number;
  armorClass?: number;
}

export interface ServiceDeps {
  prisma: PrismaClient;
  queue: OperationQueue;
}

// ---------------------------------------------------------------------------
// Combatant Service Functions
// ---------------------------------------------------------------------------

/**
 * Creates a new combatant in an encounter.
 * Single-model write routed through the operation queue (no $transaction needed).
 */
export async function createCombatant(
  deps: ServiceDeps,
  input: CreateCombatantInput,
) {
  return deps.queue.enqueue(() =>
    deps.prisma.combatant.create({
      data: {
        name: input.name,
        initiative: input.initiative,
        maxHp: input.maxHp,
        currentHp: input.currentHp,
        tempHp: input.tempHp ?? 0,
        armorClass: input.armorClass,
        combatantType: input.combatantType,
        characterId: input.characterId,
        monsterId: input.monsterId,
        encounterId: input.encounterId,
      },
    }),
  );
}

/**
 * Updates a combatant (HP, initiative, etc.).
 * Single-model write routed through the operation queue.
 */
export async function updateCombatant(
  deps: ServiceDeps,
  id: string,
  input: UpdateCombatantInput,
) {
  return deps.queue.enqueue(() =>
    deps.prisma.combatant.update({
      where: { id },
      data: {
        ...(input.name !== undefined && { name: input.name }),
        ...(input.initiative !== undefined && { initiative: input.initiative }),
        ...(input.maxHp !== undefined && { maxHp: input.maxHp }),
        ...(input.currentHp !== undefined && { currentHp: input.currentHp }),
        ...(input.tempHp !== undefined && { tempHp: input.tempHp }),
        ...(input.armorClass !== undefined && { armorClass: input.armorClass }),
      },
    }),
  );
}

/**
 * Deletes a combatant by ID.
 * Single-model write routed through the operation queue.
 */
export async function deleteCombatant(deps: ServiceDeps, id: string) {
  return deps.queue.enqueue(() =>
    deps.prisma.combatant.delete({
      where: { id },
    }),
  );
}

/**
 * Lists all combatants belonging to a specific encounter.
 * Reads go directly through Prisma (no queue needed).
 */
export async function listCombatantsByEncounter(
  deps: ServiceDeps,
  encounterId: string,
) {
  return deps.prisma.combatant.findMany({
    where: { encounterId },
  });
}
