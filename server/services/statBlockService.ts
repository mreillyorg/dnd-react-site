import { eq } from "drizzle-orm";

import type { DrizzleDb } from "../db/drizzle.ts";
import type { OperationQueue } from "../db/operationQueue.ts";
import { monsters } from "../db/schema.ts";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CreateStatBlockInput {
  name: string;
  size: string;
  type: string;
  alignment?: string;
  armorClass: number;
  hitPoints: number;
  hitDice: string;
  speed: string;
  strength: number;
  dexterity: number;
  constitution: number;
  intelligence: number;
  wisdom: number;
  charisma: number;
  challengeRating: number;
  source?: string;
  abilities: string;
  actions: string;
  reactions?: string;
  legendaryActions?: string;
  dndbeyondLink?: string;
}

export interface UpdateStatBlockInput {
  name?: string;
  size?: string;
  type?: string;
  alignment?: string | null;
  armorClass?: number;
  hitPoints?: number;
  hitDice?: string;
  speed?: string;
  strength?: number;
  dexterity?: number;
  constitution?: number;
  intelligence?: number;
  wisdom?: number;
  charisma?: number;
  challengeRating?: number;
  source?: string;
  abilities?: string;
  actions?: string;
  reactions?: string | null;
  legendaryActions?: string | null;
  dndbeyondLink?: string | null;
}

export interface ServiceDeps {
  db: DrizzleDb;
  queue: OperationQueue;
}

// ---------------------------------------------------------------------------
// StatBlock Service Functions
// ---------------------------------------------------------------------------

/**
 * Creates a new stat block (Monster record).
 * Single-model write routed through the operation queue.
 */
export async function createStatBlock(
  deps: ServiceDeps,
  input: CreateStatBlockInput,
  createdById?: string,
) {
  return deps.queue.enqueue(() => {
    const [created] = deps.db
      .insert(monsters)
      .values({
        name: input.name,
        size: input.size,
        type: input.type,
        alignment: input.alignment,
        armorClass: input.armorClass,
        hitPoints: input.hitPoints,
        hitDice: input.hitDice,
        speed: input.speed,
        strength: input.strength,
        dexterity: input.dexterity,
        constitution: input.constitution,
        intelligence: input.intelligence,
        wisdom: input.wisdom,
        charisma: input.charisma,
        challengeRating: input.challengeRating,
        source: input.source ?? "HOMEBREW",
        abilities: input.abilities,
        actions: input.actions,
        reactions: input.reactions,
        legendaryActions: input.legendaryActions,
        dndbeyondLink: input.dndbeyondLink,
        createdById,
      })
      .returning()
      .all();
    return Promise.resolve(created);
  });
}

/**
 * Retrieves a stat block by ID.
 * Reads go directly through Drizzle (no queue needed).
 */
export async function getStatBlockById(deps: ServiceDeps, id: string) {
  return deps.db.query.monsters.findFirst({
    where: eq(monsters.id, id),
  }) ?? null;
}

/**
 * Lists all stat blocks.
 * Reads go directly through Drizzle (no queue needed).
 */
export async function listStatBlocks(deps: ServiceDeps) {
  return deps.db.query.monsters.findMany();
}

/**
 * Updates an existing stat block.
 * Single-model write routed through the operation queue.
 */
export async function updateStatBlock(
  deps: ServiceDeps,
  id: string,
  input: UpdateStatBlockInput,
) {
  return deps.queue.enqueue(() => {
    const data: Record<string, unknown> = {};
    if (input.name !== undefined) data.name = input.name;
    if (input.size !== undefined) data.size = input.size;
    if (input.type !== undefined) data.type = input.type;
    if (input.alignment !== undefined) data.alignment = input.alignment;
    if (input.armorClass !== undefined) data.armorClass = input.armorClass;
    if (input.hitPoints !== undefined) data.hitPoints = input.hitPoints;
    if (input.hitDice !== undefined) data.hitDice = input.hitDice;
    if (input.speed !== undefined) data.speed = input.speed;
    if (input.strength !== undefined) data.strength = input.strength;
    if (input.dexterity !== undefined) data.dexterity = input.dexterity;
    if (input.constitution !== undefined) data.constitution = input.constitution;
    if (input.intelligence !== undefined) data.intelligence = input.intelligence;
    if (input.wisdom !== undefined) data.wisdom = input.wisdom;
    if (input.charisma !== undefined) data.charisma = input.charisma;
    if (input.challengeRating !== undefined) data.challengeRating = input.challengeRating;
    if (input.source !== undefined) data.source = input.source;
    if (input.abilities !== undefined) data.abilities = input.abilities;
    if (input.actions !== undefined) data.actions = input.actions;
    if (input.reactions !== undefined) data.reactions = input.reactions;
    if (input.legendaryActions !== undefined) data.legendaryActions = input.legendaryActions;
    if (input.dndbeyondLink !== undefined) data.dndbeyondLink = input.dndbeyondLink;

    const [updated] = deps.db
      .update(monsters)
      .set(data)
      .where(eq(monsters.id, id))
      .returning()
      .all();
    return Promise.resolve(updated);
  });
}

/**
 * Deletes a stat block by ID.
 * Single-model write routed through the operation queue.
 */
export async function deleteStatBlock(deps: ServiceDeps, id: string) {
  return deps.queue.enqueue(() => {
    const [deleted] = deps.db
      .delete(monsters)
      .where(eq(monsters.id, id))
      .returning()
      .all();
    return Promise.resolve(deleted);
  });
}
