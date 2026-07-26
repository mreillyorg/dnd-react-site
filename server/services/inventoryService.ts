import type { PrismaClient } from "@prisma/client";
import type { OperationQueue } from "../db/operationQueue.ts";

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
  prisma: PrismaClient;
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
  return deps.queue.enqueue(() =>
    deps.prisma.itemAssignment.create({
      data: {
        itemId: input.itemId,
        characterId: input.characterId,
        quantity: input.quantity ?? 1,
        equipped: input.equipped ?? false,
        attuned: input.attuned ?? false,
        identified: input.identified ?? true,
      },
    }),
  );
}

/**
 * Removes an item from a character's inventory (deletes the ItemAssignment).
 * Single-model write routed through the operation queue.
 */
export async function removeItemFromInventory(
  deps: ServiceDeps,
  id: string,
) {
  return deps.queue.enqueue(() =>
    deps.prisma.itemAssignment.delete({
      where: { id },
    }),
  );
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
  return deps.queue.enqueue(() =>
    deps.prisma.itemAssignment.update({
      where: { id },
      data: {
        ...(input.quantity !== undefined && { quantity: input.quantity }),
        ...(input.equipped !== undefined && { equipped: input.equipped }),
        ...(input.attuned !== undefined && { attuned: input.attuned }),
        ...(input.identified !== undefined && { identified: input.identified }),
      },
    }),
  );
}

/**
 * Gets all inventory items for a character.
 * Reads go directly through Prisma (no queue needed).
 */
export async function getInventoryByCharacter(
  deps: ServiceDeps,
  characterId: string,
) {
  return deps.prisma.itemAssignment.findMany({
    where: { characterId },
    include: { item: true },
  });
}
