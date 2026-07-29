import { eq } from "drizzle-orm";

import type { DrizzleDb } from "../db/drizzle.ts";
import type { OperationQueue } from "../db/operationQueue.ts";
import { combatants } from "../db/schema.ts";

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
  db: DrizzleDb;
  queue: OperationQueue;
}

// ---------------------------------------------------------------------------
// Combatant Service Functions
// ---------------------------------------------------------------------------

/**
 * Creates a new combatant in an encounter.
 * Single-model write routed through the operation queue.
 */
export async function createCombatant(
  deps: ServiceDeps,
  input: CreateCombatantInput,
) {
  return deps.queue.enqueue(async () => {
    const [created] = await deps.db
      .insert(combatants)
      .values({
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
      })
      .returning()
      .all();
    return created;
  });
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
  return deps.queue.enqueue(async () => {
    const data: Record<string, unknown> = {};
    if (input.name !== undefined) data.name = input.name;
    if (input.initiative !== undefined) data.initiative = input.initiative;
    if (input.maxHp !== undefined) data.maxHp = input.maxHp;
    if (input.currentHp !== undefined) data.currentHp = input.currentHp;
    if (input.tempHp !== undefined) data.tempHp = input.tempHp;
    if (input.armorClass !== undefined) data.armorClass = input.armorClass;

    const [updated] = await deps.db
      .update(combatants)
      .set(data)
      .where(eq(combatants.id, id))
      .returning()
      .all();
    return updated;
  });
}

/**
 * Deletes a combatant by ID.
 * Single-model write routed through the operation queue.
 */
export async function deleteCombatant(deps: ServiceDeps, id: string) {
  return deps.queue.enqueue(async () => {
    const [deleted] = await deps.db
      .delete(combatants)
      .where(eq(combatants.id, id))
      .returning()
      .all();
    return deleted;
  });
}

/**
 * Lists all combatants belonging to a specific encounter.
 * Reads go directly through Drizzle (no queue needed).
 */
export async function listCombatantsByEncounter(
  deps: ServiceDeps,
  encounterId: string,
) {
  return deps.db.query.combatants.findMany({
    where: eq(combatants.encounterId, encounterId),
  });
}
