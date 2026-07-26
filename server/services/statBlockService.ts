import type { PrismaClient } from "@prisma/client";
import type { OperationQueue } from "../db/operationQueue.ts";

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
  prisma: PrismaClient;
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
  return deps.queue.enqueue(() =>
    deps.prisma.monster.create({
      data: {
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
      },
    }),
  );
}

/**
 * Retrieves a stat block by ID.
 * Reads go directly through Prisma (no queue needed).
 */
export async function getStatBlockById(deps: ServiceDeps, id: string) {
  return deps.prisma.monster.findUnique({
    where: { id },
  });
}

/**
 * Lists all stat blocks, optionally filtered by type or challenge rating.
 * Reads go directly through Prisma (no queue needed).
 */
export async function listStatBlocks(deps: ServiceDeps) {
  return deps.prisma.monster.findMany();
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
  return deps.queue.enqueue(() =>
    deps.prisma.monster.update({
      where: { id },
      data: {
        ...(input.name !== undefined && { name: input.name }),
        ...(input.size !== undefined && { size: input.size }),
        ...(input.type !== undefined && { type: input.type }),
        ...(input.alignment !== undefined && { alignment: input.alignment }),
        ...(input.armorClass !== undefined && { armorClass: input.armorClass }),
        ...(input.hitPoints !== undefined && { hitPoints: input.hitPoints }),
        ...(input.hitDice !== undefined && { hitDice: input.hitDice }),
        ...(input.speed !== undefined && { speed: input.speed }),
        ...(input.strength !== undefined && { strength: input.strength }),
        ...(input.dexterity !== undefined && { dexterity: input.dexterity }),
        ...(input.constitution !== undefined && { constitution: input.constitution }),
        ...(input.intelligence !== undefined && { intelligence: input.intelligence }),
        ...(input.wisdom !== undefined && { wisdom: input.wisdom }),
        ...(input.charisma !== undefined && { charisma: input.charisma }),
        ...(input.challengeRating !== undefined && { challengeRating: input.challengeRating }),
        ...(input.source !== undefined && { source: input.source }),
        ...(input.abilities !== undefined && { abilities: input.abilities }),
        ...(input.actions !== undefined && { actions: input.actions }),
        ...(input.reactions !== undefined && { reactions: input.reactions }),
        ...(input.legendaryActions !== undefined && { legendaryActions: input.legendaryActions }),
        ...(input.dndbeyondLink !== undefined && { dndbeyondLink: input.dndbeyondLink }),
      },
    }),
  );
}

/**
 * Deletes a stat block by ID.
 * Single-model write routed through the operation queue.
 */
export async function deleteStatBlock(deps: ServiceDeps, id: string) {
  return deps.queue.enqueue(() =>
    deps.prisma.monster.delete({
      where: { id },
    }),
  );
}
