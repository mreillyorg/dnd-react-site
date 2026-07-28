import { eq } from "drizzle-orm";

import type { DrizzleDb } from "../db/drizzle.ts";
import type { OperationQueue } from "../db/operationQueue.ts";
import { characters, itemAssignments } from "../db/schema.ts";

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
  db: DrizzleDb;
  queue: OperationQueue;
}

// ---------------------------------------------------------------------------
// Character Service Functions
// ---------------------------------------------------------------------------

/**
 * Creates a new character. The write goes through the operation queue.
 * Returns the character with its itemAssignments relation.
 */
export async function createCharacter(
  deps: ServiceDeps,
  userId: string,
  input: CreateCharacterInput,
) {
  return deps.queue.enqueue(() => {
    const [created] = deps.db
      .insert(characters)
      .values({
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
      })
      .returning()
      .all();

    // Return with empty itemAssignments (matches Prisma's include behavior)
    return Promise.resolve({ ...created, itemAssignments: [] });
  });
}

/**
 * Retrieves a character by ID with item assignments.
 * Reads go directly through Drizzle (no queue needed).
 */
export async function getCharacterById(deps: ServiceDeps, id: string) {
  return deps.db.query.characters.findFirst({
    where: eq(characters.id, id),
    with: { itemAssignments: true },
  }) ?? null;
}

/**
 * Lists all characters belonging to a specific user.
 * Reads go directly through Drizzle (no queue needed).
 */
export async function listCharactersByUser(deps: ServiceDeps, userId: string) {
  return deps.db.query.characters.findMany({
    where: eq(characters.userId, userId),
    with: { itemAssignments: true },
  });
}

/**
 * Updates an existing character. The write goes through the operation queue.
 */
export async function updateCharacter(
  deps: ServiceDeps,
  id: string,
  input: UpdateCharacterInput,
) {
  return deps.queue.enqueue(() => {
    const data: Record<string, unknown> = {};
    if (input.name !== undefined) data.name = input.name;
    if (input.level !== undefined) data.level = input.level;
    if (input.class !== undefined) data.class = input.class;
    if (input.race !== undefined) data.race = input.race;
    if (input.strength !== undefined) data.strength = input.strength;
    if (input.dexterity !== undefined) data.dexterity = input.dexterity;
    if (input.constitution !== undefined) data.constitution = input.constitution;
    if (input.intelligence !== undefined) data.intelligence = input.intelligence;
    if (input.wisdom !== undefined) data.wisdom = input.wisdom;
    if (input.charisma !== undefined) data.charisma = input.charisma;
    if (input.maxHp !== undefined) data.maxHp = input.maxHp;
    if (input.currentHp !== undefined) data.currentHp = input.currentHp;
    if (input.tempHp !== undefined) data.tempHp = input.tempHp;
    if (input.armorClass !== undefined) data.armorClass = input.armorClass;
    if (input.campaignId !== undefined) data.campaignId = input.campaignId;

    const [updated] = deps.db
      .update(characters)
      .set(data)
      .where(eq(characters.id, id))
      .returning()
      .all();

    // Fetch item assignments for the response
    const assignments = deps.db
      .select()
      .from(itemAssignments)
      .where(eq(itemAssignments.characterId, id))
      .all();

    return Promise.resolve({ ...updated, itemAssignments: assignments });
  });
}

/**
 * Deletes a character by ID. The write goes through the operation queue.
 */
export async function deleteCharacter(deps: ServiceDeps, id: string) {
  return deps.queue.enqueue(() => {
    const [deleted] = deps.db
      .delete(characters)
      .where(eq(characters.id, id))
      .returning()
      .all();
    return Promise.resolve(deleted);
  });
}
