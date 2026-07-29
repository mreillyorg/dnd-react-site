import { eq } from "drizzle-orm";

import type { DrizzleDb } from "../db/drizzle.ts";
import type { OperationQueue } from "../db/operationQueue.ts";
import { itemAssignments } from "../db/schema.ts";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AddItemToInventoryInput {
  itemId: string;
  characterId: string;
  quantity?: number;
  equipped?: boolean;
  attuned?: boolean;
  identified?: boolean;
}

export interface UpdateItemSlotInput {
  quantity?: number;
  equipped?: boolean;
  attuned?: boolean;
  identified?: boolean;
}

export interface ServiceDeps {
  db: DrizzleDb;
  queue: OperationQueue;
}

// ---------------------------------------------------------------------------
// Inventory Service Functions
// ---------------------------------------------------------------------------

/**
 * Adds an item to a character's inventory (creates an ItemAssignment).
 * Single-model write routed through the operation queue.
 */
export async function addItemToInventory(
  deps: ServiceDeps,
  input: AddItemToInventoryInput,
) {
  return deps.queue.enqueue(async () => {
    const [created] = await deps.db
      .insert(itemAssignments)
      .values({
        itemId: input.itemId,
        characterId: input.characterId,
        quantity: input.quantity ?? 1,
        equipped: input.equipped ?? false,
        attuned: input.attuned ?? false,
        identified: input.identified ?? true,
      })
      .returning()
      .all();
    return created;
  });
}

/**
 * Removes an item from a character's inventory (deletes the ItemAssignment).
 * Single-model write routed through the operation queue.
 */
export async function removeItemFromInventory(
  deps: ServiceDeps,
  id: string,
) {
  return deps.queue.enqueue(async () => {
    const [deleted] = await deps.db
      .delete(itemAssignments)
      .where(eq(itemAssignments.id, id))
      .returning()
      .all();
    return deleted;
  });
}

/**
 * Updates an inventory slot (quantity, equipped, attuned, identified).
 * Single-model write routed through the operation queue.
 */
export async function updateItemSlot(
  deps: ServiceDeps,
  id: string,
  input: UpdateItemSlotInput,
) {
  return deps.queue.enqueue(async () => {
    const data: Record<string, unknown> = {};
    if (input.quantity !== undefined) data.quantity = input.quantity;
    if (input.equipped !== undefined) data.equipped = input.equipped;
    if (input.attuned !== undefined) data.attuned = input.attuned;
    if (input.identified !== undefined) data.identified = input.identified;

    const [updated] = await deps.db
      .update(itemAssignments)
      .set(data)
      .where(eq(itemAssignments.id, id))
      .returning()
      .all();
    return updated;
  });
}

/**
 * Gets all inventory items for a character (with item details).
 * Reads go directly through Drizzle (no queue needed).
 */
export async function getInventoryByCharacter(
  deps: ServiceDeps,
  characterId: string,
) {
  return deps.db.query.itemAssignments.findMany({
    where: eq(itemAssignments.characterId, characterId),
    with: { item: true },
  });
}
