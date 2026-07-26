/**
 * Property-based test for auth rejection.
 *
 * **Validates: Requirements 1.7**
 *
 * Property 2: Protected resolvers reject unauthenticated requests.
 * - Defines a list of protected GraphQL resolver functions (queries and mutations).
 * - Uses fast-check to generate arbitrary indices into the protected operations list.
 * - Calls each picked resolver with no auth context (currentUser: null).
 * - Asserts every call throws a GraphQLError with extensions.code === 'UNAUTHENTICATED'.
 */

// @vitest-environment node

import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import { GraphQLError } from "graphql";
import { userResolvers } from "./user.resolver.ts";
import { characterResolvers } from "./character.resolver.ts";
import { campaignResolvers } from "./campaign.resolver.ts";
import { sessionResolvers } from "./session.resolver.ts";
import { encounterResolvers } from "./encounter.resolver.ts";
import { combatantResolvers } from "./combatant.resolver.ts";
import { statBlockResolvers } from "./statBlock.resolver.ts";
import { inventoryResolvers } from "./inventory.resolver.ts";
import { itemResolvers } from "./item.resolver.ts";
import type { GraphQLContext } from "../context.ts";

/**
 * A mock prisma object that throws if any property is accessed.
 * Since auth checks happen before data access, prisma should never be reached.
 */
const mockPrisma = new Proxy(
  {},
  {
    get(_target, prop) {
      if (prop === "then") return undefined; // Prevent promise confusion
      throw new Error(
        `Prisma should not be accessed for unauthenticated requests (accessed: ${String(prop)})`,
      );
    },
  },
);

/**
 * A mock queue that executes functions immediately (should not be reached).
 */
const mockQueue = {
  enqueue: (fn: () => unknown) => fn(),
  drain: () => Promise.resolve(),
  pendingCount: 0,
};

/**
 * Context with no authenticated user.
 */
const unauthenticatedContext: GraphQLContext = {
  prisma: mockPrisma as never,
  queue: mockQueue as never,
  currentUser: null,
};

/**
 * A protected operation entry: name for debugging and a function that invokes
 * the resolver with unauthenticated context.
 */
interface ProtectedOperation {
  name: string;
  invoke: () => unknown;
}

/**
 * List of all protected operations. Each entry calls the resolver function
 * with the unauthenticated context and dummy arguments.
 */
const protectedOperations: ProtectedOperation[] = [
  // Query.me
  {
    name: "Query.me",
    invoke: () =>
      userResolvers.Query.me(null, {}, unauthenticatedContext),
  },
  // Mutation.updateUser
  {
    name: "Mutation.updateUser",
    invoke: () =>
      userResolvers.Mutation.updateUser(
        null,
        { id: "test-id", input: { name: "Test" } },
        unauthenticatedContext,
      ),
  },
  // Mutation.deleteUser
  {
    name: "Mutation.deleteUser",
    invoke: () =>
      userResolvers.Mutation.deleteUser(
        null,
        { id: "test-id" },
        unauthenticatedContext,
      ),
  },
  // Mutation.createCharacter
  {
    name: "Mutation.createCharacter",
    invoke: () =>
      characterResolvers.Mutation.createCharacter(
        null,
        { input: { name: "Hero", class: "Fighter", race: "Human", maxHp: 10, currentHp: 10, armorClass: 15 } },
        unauthenticatedContext,
      ),
  },
  // Mutation.updateCharacter
  {
    name: "Mutation.updateCharacter",
    invoke: () =>
      characterResolvers.Mutation.updateCharacter(
        null,
        { id: "test-id", input: { name: "Updated" } },
        unauthenticatedContext,
      ),
  },
  // Mutation.deleteCharacter
  {
    name: "Mutation.deleteCharacter",
    invoke: () =>
      characterResolvers.Mutation.deleteCharacter(
        null,
        { id: "test-id" },
        unauthenticatedContext,
      ),
  },
  // Mutation.createCampaign
  {
    name: "Mutation.createCampaign",
    invoke: () =>
      campaignResolvers.Mutation.createCampaign(
        null,
        { input: { name: "Campaign" } },
        unauthenticatedContext,
      ),
  },
  // Mutation.updateCampaign
  {
    name: "Mutation.updateCampaign",
    invoke: () =>
      campaignResolvers.Mutation.updateCampaign(
        null,
        { id: "test-id", input: { name: "Updated" } },
        unauthenticatedContext,
      ),
  },
  // Mutation.deleteCampaign
  {
    name: "Mutation.deleteCampaign",
    invoke: () =>
      campaignResolvers.Mutation.deleteCampaign(
        null,
        { id: "test-id" },
        unauthenticatedContext,
      ),
  },
  // Mutation.createNPC
  {
    name: "Mutation.createNPC",
    invoke: () =>
      campaignResolvers.Mutation.createNPC(
        null,
        { input: { name: "Goblin", campaignId: "camp-1" } },
        unauthenticatedContext,
      ),
  },
  // Mutation.updateNPC
  {
    name: "Mutation.updateNPC",
    invoke: () =>
      campaignResolvers.Mutation.updateNPC(
        null,
        { id: "test-id", input: { name: "Updated" } },
        unauthenticatedContext,
      ),
  },
  // Mutation.deleteNPC
  {
    name: "Mutation.deleteNPC",
    invoke: () =>
      campaignResolvers.Mutation.deleteNPC(
        null,
        { id: "test-id" },
        unauthenticatedContext,
      ),
  },
  // Mutation.createLocation
  {
    name: "Mutation.createLocation",
    invoke: () =>
      campaignResolvers.Mutation.createLocation(
        null,
        { input: { name: "Tavern", campaignId: "camp-1" } },
        unauthenticatedContext,
      ),
  },
  // Mutation.updateLocation
  {
    name: "Mutation.updateLocation",
    invoke: () =>
      campaignResolvers.Mutation.updateLocation(
        null,
        { id: "test-id", input: { name: "Updated" } },
        unauthenticatedContext,
      ),
  },
  // Mutation.deleteLocation
  {
    name: "Mutation.deleteLocation",
    invoke: () =>
      campaignResolvers.Mutation.deleteLocation(
        null,
        { id: "test-id" },
        unauthenticatedContext,
      ),
  },
  // Mutation.createQuest
  {
    name: "Mutation.createQuest",
    invoke: () =>
      campaignResolvers.Mutation.createQuest(
        null,
        { input: { name: "Dragon Slaying", campaignId: "camp-1" } },
        unauthenticatedContext,
      ),
  },
  // Mutation.updateQuest
  {
    name: "Mutation.updateQuest",
    invoke: () =>
      campaignResolvers.Mutation.updateQuest(
        null,
        { id: "test-id", input: { name: "Updated" } },
        unauthenticatedContext,
      ),
  },
  // Mutation.deleteQuest
  {
    name: "Mutation.deleteQuest",
    invoke: () =>
      campaignResolvers.Mutation.deleteQuest(
        null,
        { id: "test-id" },
        unauthenticatedContext,
      ),
  },
  // Mutation.createTimelineEntry
  {
    name: "Mutation.createTimelineEntry",
    invoke: () =>
      campaignResolvers.Mutation.createTimelineEntry(
        null,
        { input: { description: "Day 1", inGameDate: "1490-01-01", campaignId: "camp-1" } },
        unauthenticatedContext,
      ),
  },
  // Mutation.updateTimelineEntry
  {
    name: "Mutation.updateTimelineEntry",
    invoke: () =>
      campaignResolvers.Mutation.updateTimelineEntry(
        null,
        { id: "test-id", input: { description: "Updated" } },
        unauthenticatedContext,
      ),
  },
  // Mutation.deleteTimelineEntry
  {
    name: "Mutation.deleteTimelineEntry",
    invoke: () =>
      campaignResolvers.Mutation.deleteTimelineEntry(
        null,
        { id: "test-id" },
        unauthenticatedContext,
      ),
  },
  // Mutation.createSession
  {
    name: "Mutation.createSession",
    invoke: () =>
      sessionResolvers.Mutation.createSession(
        null,
        { input: { sessionNumber: 1, realWorldDate: new Date("2024-01-01"), campaignId: "camp-1" } },
        unauthenticatedContext,
      ),
  },
  // Mutation.updateSession
  {
    name: "Mutation.updateSession",
    invoke: () =>
      sessionResolvers.Mutation.updateSession(
        null,
        { id: "test-id", input: { title: "Updated" } },
        unauthenticatedContext,
      ),
  },
  // Mutation.deleteSession
  {
    name: "Mutation.deleteSession",
    invoke: () =>
      sessionResolvers.Mutation.deleteSession(
        null,
        { id: "test-id" },
        unauthenticatedContext,
      ),
  },
  // Mutation.createSessionNote
  {
    name: "Mutation.createSessionNote",
    invoke: () =>
      sessionResolvers.Mutation.createSessionNote(
        null,
        { input: { content: "Notes", sessionId: "sess-1" } },
        unauthenticatedContext,
      ),
  },
  // Mutation.updateSessionNote
  {
    name: "Mutation.updateSessionNote",
    invoke: () =>
      sessionResolvers.Mutation.updateSessionNote(
        null,
        { id: "test-id", input: { content: "Updated" } },
        unauthenticatedContext,
      ),
  },
  // Mutation.deleteSessionNote
  {
    name: "Mutation.deleteSessionNote",
    invoke: () =>
      sessionResolvers.Mutation.deleteSessionNote(
        null,
        { id: "test-id" },
        unauthenticatedContext,
      ),
  },
  // Mutation.createCombatEncounter
  {
    name: "Mutation.createCombatEncounter",
    invoke: () =>
      encounterResolvers.Mutation.createCombatEncounter(
        null,
        { input: { name: "Boss Fight" } },
        unauthenticatedContext,
      ),
  },
  // Mutation.updateCombatEncounter
  {
    name: "Mutation.updateCombatEncounter",
    invoke: () =>
      encounterResolvers.Mutation.updateCombatEncounter(
        null,
        { id: "test-id", input: { name: "Updated" } },
        unauthenticatedContext,
      ),
  },
  // Mutation.deleteCombatEncounter
  {
    name: "Mutation.deleteCombatEncounter",
    invoke: () =>
      encounterResolvers.Mutation.deleteCombatEncounter(
        null,
        { id: "test-id" },
        unauthenticatedContext,
      ),
  },
  // Mutation.createCombatant
  {
    name: "Mutation.createCombatant",
    invoke: () =>
      combatantResolvers.Mutation.createCombatant(
        null,
        { input: { name: "Orc", initiative: 15, maxHp: 30, currentHp: 30, armorClass: 13, combatantType: "MONSTER", encounterId: "enc-1" } },
        unauthenticatedContext,
      ),
  },
  // Mutation.updateCombatant
  {
    name: "Mutation.updateCombatant",
    invoke: () =>
      combatantResolvers.Mutation.updateCombatant(
        null,
        { id: "test-id", input: { name: "Updated" } },
        unauthenticatedContext,
      ),
  },
  // Mutation.deleteCombatant
  {
    name: "Mutation.deleteCombatant",
    invoke: () =>
      combatantResolvers.Mutation.deleteCombatant(
        null,
        { id: "test-id" },
        unauthenticatedContext,
      ),
  },
  // Mutation.createMonster
  {
    name: "Mutation.createMonster",
    invoke: () =>
      statBlockResolvers.Mutation.createMonster(
        null,
        { input: { name: "Dragon", size: "Huge", type: "Dragon", armorClass: 19, hitPoints: 256, hitDice: "17d12+85", speed: "40 ft.", strength: 27, dexterity: 10, constitution: 25, intelligence: 16, wisdom: 13, charisma: 21, challengeRating: 17.0, abilities: "[]", actions: "[]" } },
        unauthenticatedContext,
      ),
  },
  // Mutation.updateMonster
  {
    name: "Mutation.updateMonster",
    invoke: () =>
      statBlockResolvers.Mutation.updateMonster(
        null,
        { id: "test-id", input: { name: "Updated" } },
        unauthenticatedContext,
      ),
  },
  // Mutation.deleteMonster
  {
    name: "Mutation.deleteMonster",
    invoke: () =>
      statBlockResolvers.Mutation.deleteMonster(
        null,
        { id: "test-id" },
        unauthenticatedContext,
      ),
  },
  // Mutation.createItem
  {
    name: "Mutation.createItem",
    invoke: () =>
      itemResolvers.Mutation.createItem(
        null,
        { input: { name: "Sword", description: "A sharp sword", itemType: "WEAPON", rarity: "COMMON" } },
        unauthenticatedContext,
      ),
  },
  // Mutation.updateItem
  {
    name: "Mutation.updateItem",
    invoke: () =>
      itemResolvers.Mutation.updateItem(
        null,
        { id: "test-id", input: { name: "Updated" } },
        unauthenticatedContext,
      ),
  },
  // Mutation.deleteItem
  {
    name: "Mutation.deleteItem",
    invoke: () =>
      itemResolvers.Mutation.deleteItem(
        null,
        { id: "test-id" },
        unauthenticatedContext,
      ),
  },
  // Mutation.createItemAssignment
  {
    name: "Mutation.createItemAssignment",
    invoke: () =>
      inventoryResolvers.Mutation.createItemAssignment(
        null,
        { input: { itemId: "item-1", characterId: "char-1" } },
        unauthenticatedContext,
      ),
  },
  // Mutation.updateItemAssignment
  {
    name: "Mutation.updateItemAssignment",
    invoke: () =>
      inventoryResolvers.Mutation.updateItemAssignment(
        null,
        { id: "test-id", input: { quantity: 2 } },
        unauthenticatedContext,
      ),
  },
  // Mutation.deleteItemAssignment
  {
    name: "Mutation.deleteItemAssignment",
    invoke: () =>
      inventoryResolvers.Mutation.deleteItemAssignment(
        null,
        { id: "test-id" },
        unauthenticatedContext,
      ),
  },
];

describe("Auth Rejection Property Tests", () => {
  it("Property 2: Protected resolvers reject unauthenticated requests", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 0, max: protectedOperations.length - 1 }),
        async (index) => {
          const operation = protectedOperations[index];

          try {
            await operation.invoke();
            // If we get here, the resolver didn't throw — property violated
            return false;
          } catch (error: unknown) {
            // Must be a GraphQLError with UNAUTHENTICATED code
            if (!(error instanceof GraphQLError)) {
              return false;
            }
            return error.extensions?.["code"] === "UNAUTHENTICATED";
          }
        },
      ),
      { numRuns: 200 },
    );
  }, 30_000);
});
