import type { PrismaClient } from "@prisma/client";
import type { OperationQueue } from "../db/operationQueue.ts";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CreateCharacterInput {
  name: string;
  level?: number;
  class: string;
  race: string;
  strength?: number;
  dexterity?: number;
  constitution?: number;
  intelligence?: number;
  wisdom?: number;
  charisma?: number;
  maxHp: number;
  currentHp: number;
  tempHp?: number;
  armorClass: number;
  campaignId?: string;
}

export interface UpdateCharacterInput {
  name?: string;
  level?: number;
  class?: string;
  race?: string;
  strength?: number;
  dexterity?: number;
  constitution?: number;
  intelligence?: number;
  wisdom?: number;
  charisma?: number;
  maxHp?: number;
  currentHp?: number;
  tempHp?: number;
  armorClass?: number;
  campaignId?: string | null;
}

export interface ServiceDeps {
  prisma: PrismaClient;
  queue: OperationQueue;
}

// ---------------------------------------------------------------------------
// Character Service Functions
// ---------------------------------------------------------------------------

/**
 * Creates a new character AND a default empty inventory (ItemAssignment)
 * in a single transaction routed through the operation queue.
 *
 * Note: "default empty inventory" means the character is created with the
 * itemAssignments relation initialized (no items assigned). Since there are
 * no default items, the transaction just creates the character. The
 * transaction boundary ensures atomicity if we later add default items.
 */
export async function createCharacter(
  deps: ServiceDeps,
  userId: string,
  input: CreateCharacterInput,
) {
  return deps.queue.enqueue(() =>
    deps.prisma.$transaction(async (tx) => {
      const character = await tx.character.create({
        data: {
          name: input.name,
          level: input.level ?? 1,
          class: input.class,
          race: input.race,
          strength: input.strength ?? 10,
          dexterity: input.dexterity ?? 10,
          constitution: input.constitution ?? 10,
          intelligence: input.intelligence ?? 10,
          wisdom: input.wisdom ?? 10,
          charisma: input.charisma ?? 10,
          maxHp: input.maxHp,
          currentHp: input.currentHp,
          tempHp: input.tempHp ?? 0,
          armorClass: input.armorClass,
          userId,
          campaignId: input.campaignId,
        },
        include: {
          itemAssignments: true,
        },
      });

      return character;
    }),
  );
}

/**
 * Retrieves a character by ID.
 * Reads go directly through Prisma (no queue needed).
 */
export async function getCharacterById(deps: ServiceDeps, id: string) {
  return deps.prisma.character.findUnique({
    where: { id },
    include: { itemAssignments: true },
  });
}

/**
 * Lists all characters belonging to a specific user.
 * Reads go directly through Prisma (no queue needed).
 */
export async function listCharactersByUser(deps: ServiceDeps, userId: string) {
  return deps.prisma.character.findMany({
    where: { userId },
    include: { itemAssignments: true },
  });
}

/**
 * Updates an existing character. The write goes through the operation queue
 * and is wrapped in a transaction.
 */
export async function updateCharacter(
  deps: ServiceDeps,
  id: string,
  input: UpdateCharacterInput,
) {
  return deps.queue.enqueue(() =>
    deps.prisma.$transaction(async (tx) => {
      return tx.character.update({
        where: { id },
        data: {
          ...(input.name !== undefined && { name: input.name }),
          ...(input.level !== undefined && { level: input.level }),
          ...(input.class !== undefined && { class: input.class }),
          ...(input.race !== undefined && { race: input.race }),
          ...(input.strength !== undefined && { strength: input.strength }),
          ...(input.dexterity !== undefined && { dexterity: input.dexterity }),
          ...(input.constitution !== undefined && { constitution: input.constitution }),
          ...(input.intelligence !== undefined && { intelligence: input.intelligence }),
          ...(input.wisdom !== undefined && { wisdom: input.wisdom }),
          ...(input.charisma !== undefined && { charisma: input.charisma }),
          ...(input.maxHp !== undefined && { maxHp: input.maxHp }),
          ...(input.currentHp !== undefined && { currentHp: input.currentHp }),
          ...(input.tempHp !== undefined && { tempHp: input.tempHp }),
          ...(input.armorClass !== undefined && { armorClass: input.armorClass }),
          ...(input.campaignId !== undefined && { campaignId: input.campaignId }),
        },
        include: { itemAssignments: true },
      });
    }),
  );
}

/**
 * Deletes a character by ID. The write goes through the operation queue
 * and is wrapped in a transaction.
 */
export async function deleteCharacter(deps: ServiceDeps, id: string) {
  return deps.queue.enqueue(() =>
    deps.prisma.$transaction(async (tx) => {
      return tx.character.delete({
        where: { id },
      });
    }),
  );
}
