import { describe, it, expect, vi, beforeEach } from "vitest";
import { GraphQLError } from "graphql";

import type { GraphQLContext } from "../context.ts";

// ---------------------------------------------------------------------------
// Mock service modules
// ---------------------------------------------------------------------------

vi.mock("../../services/userService.ts", () => ({
  createUser: vi.fn(),
  getUserById: vi.fn(),
  getUserByEmail: vi.fn(),
}));

vi.mock("../../services/characterService.ts", () => ({
  createCharacter: vi.fn(),
  getCharacterById: vi.fn(),
  listCharactersByUser: vi.fn(),
  updateCharacter: vi.fn(),
  deleteCharacter: vi.fn(),
}));

vi.mock("../../services/campaignService.ts", () => ({
  createCampaign: vi.fn(),
  getCampaignById: vi.fn(),
  listCampaignsByOwner: vi.fn(),
  updateCampaign: vi.fn(),
  deleteCampaign: vi.fn(),
}));

vi.mock("../../services/sessionService.ts", () => ({
  createSession: vi.fn(),
  getSessionById: vi.fn(),
  listSessionsByCampaign: vi.fn(),
  updateSession: vi.fn(),
  deleteSession: vi.fn(),
}));

vi.mock("../../services/encounterService.ts", () => ({
  createEncounter: vi.fn(),
  getEncounterById: vi.fn(),
  listEncountersBySession: vi.fn(),
  updateEncounter: vi.fn(),
  deleteEncounter: vi.fn(),
}));

vi.mock("../../services/combatantService.ts", () => ({
  createCombatant: vi.fn(),
  updateCombatant: vi.fn(),
  deleteCombatant: vi.fn(),
  listCombatantsByEncounter: vi.fn(),
}));

vi.mock("../../services/statBlockService.ts", () => ({
  createStatBlock: vi.fn(),
  getStatBlockById: vi.fn(),
  listStatBlocks: vi.fn(),
  updateStatBlock: vi.fn(),
  deleteStatBlock: vi.fn(),
}));

vi.mock("../../services/inventoryService.ts", () => ({
  addItemToInventory: vi.fn(),
  removeItemFromInventory: vi.fn(),
  updateItemSlot: vi.fn(),
  getInventoryByCharacter: vi.fn(),
}));

// ---------------------------------------------------------------------------
// Import resolvers (after mocks are set up)
// ---------------------------------------------------------------------------

import { userResolvers } from "./user.resolver.ts";
import { characterResolvers } from "./character.resolver.ts";
import { campaignResolvers } from "./campaign.resolver.ts";
import { sessionResolvers } from "./session.resolver.ts";
import { encounterResolvers } from "./encounter.resolver.ts";
import { combatantResolvers } from "./combatant.resolver.ts";
import { statBlockResolvers } from "./statBlock.resolver.ts";
import { inventoryResolvers } from "./inventory.resolver.ts";
import { itemResolvers } from "./item.resolver.ts";

// Import mocked service functions for assertions
import { createUser, getUserById } from "../../services/userService.ts";
import {
  createCharacter,
  getCharacterById,
  updateCharacter,
  deleteCharacter,
} from "../../services/characterService.ts";
import * as campaignService from "../../services/campaignService.ts";
import * as sessionService from "../../services/sessionService.ts";
import * as encounterService from "../../services/encounterService.ts";
import {
  createCombatant,
  updateCombatant,
  deleteCombatant,
} from "../../services/combatantService.ts";
import {
  createStatBlock,
  getStatBlockById,
} from "../../services/statBlockService.ts";
import {
  addItemToInventory,
  removeItemFromInventory,
} from "../../services/inventoryService.ts";

// ---------------------------------------------------------------------------
// Test Helpers
// ---------------------------------------------------------------------------

function makeUnauthCtx(): GraphQLContext {
  return {
    currentUser: null,
    prisma: {} as GraphQLContext["prisma"],
    queue: { enqueue: vi.fn((fn) => fn()), drain: vi.fn(() => Promise.resolve()), pendingCount: 0 } as unknown as GraphQLContext["queue"],
  };
}

function makeAuthCtx(overrides?: Partial<GraphQLContext>): GraphQLContext {
  return {
    currentUser: { id: "user-1", email: "test@example.com" },
    prisma: {
      user: { findMany: vi.fn() },
      character: { findMany: vi.fn() },
      campaign: { findMany: vi.fn() },
      combatEncounter: { findMany: vi.fn() },
      combatant: { findUnique: vi.fn() },
      item: { findUnique: vi.fn(), findMany: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
      monster: { findMany: vi.fn() },
      nPC: { findUnique: vi.fn(), findMany: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
      location: { findUnique: vi.fn(), findMany: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
      quest: { findUnique: vi.fn(), findMany: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
      timelineEntry: { findUnique: vi.fn(), findMany: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
      sessionNote: { findUnique: vi.fn(), findMany: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
      itemAssignment: { findUnique: vi.fn() },
    } as unknown as GraphQLContext["prisma"],
    queue: { enqueue: vi.fn((fn) => fn()), drain: vi.fn(() => Promise.resolve()), pendingCount: 0 } as unknown as GraphQLContext["queue"],
    ...overrides,
  };
}

/**
 * Asserts that calling `fn` throws a GraphQLError with code UNAUTHENTICATED.
 * Handles both sync throws and async rejections.
 */
async function expectUnauthenticatedAsync(fn: () => unknown) {
  let error: unknown;
  try {
    const result = fn();
    // If it returns a promise, await it to catch async rejections
    if (result && typeof (result as Promise<unknown>).then === "function") {
      await (result as Promise<unknown>);
    }
    // If we get here, it didn't throw
    expect.fail("Expected function to throw UNAUTHENTICATED error");
  } catch (e) {
    error = e;
  }
  expect(error).toBeInstanceOf(GraphQLError);
  expect((error as GraphQLError).extensions?.code).toBe("UNAUTHENTICATED");
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("Resolver Auth Guards", () => {
  describe("userResolvers", () => {
    it("Query.me throws UNAUTHENTICATED when currentUser is null", async () => {
      const ctx = makeUnauthCtx();
      await expectUnauthenticatedAsync(() =>
        userResolvers.Query.me(null, {}, ctx),
      );
    });

    it("Mutation.updateUser throws UNAUTHENTICATED when currentUser is null", async () => {
      const ctx = makeUnauthCtx();
      await expectUnauthenticatedAsync(() =>
        userResolvers.Mutation.updateUser(null, { id: "u1", input: { name: "X" } }, ctx),
      );
    });

    it("Mutation.deleteUser throws UNAUTHENTICATED when currentUser is null", async () => {
      const ctx = makeUnauthCtx();
      await expectUnauthenticatedAsync(() =>
        userResolvers.Mutation.deleteUser(null, { id: "u1" }, ctx),
      );
    });

    it("Mutation.createUser does NOT require auth", async () => {
      const ctx = makeUnauthCtx();
      const fakeUser = { id: "u1", email: "a@b.com", name: "A" };
      vi.mocked(createUser).mockResolvedValue(fakeUser as never);

      const result = await userResolvers.Mutation.createUser(
        null,
        { input: { email: "a@b.com", password: "pass" } },
        ctx,
      );
      expect(result).toEqual(fakeUser);
    });
  });

  describe("characterResolvers", () => {
    it("Mutation.createCharacter throws UNAUTHENTICATED when currentUser is null", async () => {
      const ctx = makeUnauthCtx();
      await expectUnauthenticatedAsync(() =>
        characterResolvers.Mutation.createCharacter(null, { input: { name: "Hero", class: "Fighter", race: "Human", maxHp: 10, currentHp: 10, armorClass: 15 } }, ctx),
      );
    });

    it("Mutation.updateCharacter throws UNAUTHENTICATED when currentUser is null", async () => {
      const ctx = makeUnauthCtx();
      await expectUnauthenticatedAsync(() =>
        characterResolvers.Mutation.updateCharacter(null, { id: "c1", input: { name: "X" } }, ctx),
      );
    });

    it("Mutation.deleteCharacter throws UNAUTHENTICATED when currentUser is null", async () => {
      const ctx = makeUnauthCtx();
      await expectUnauthenticatedAsync(() =>
        characterResolvers.Mutation.deleteCharacter(null, { id: "c1" }, ctx),
      );
    });
  });

  describe("campaignResolvers", () => {
    it("Mutation.createCampaign throws UNAUTHENTICATED when currentUser is null", async () => {
      const ctx = makeUnauthCtx();
      await expectUnauthenticatedAsync(() =>
        campaignResolvers.Mutation.createCampaign(null, { input: { name: "Camp" } }, ctx),
      );
    });
  });

  describe("sessionResolvers", () => {
    it("Mutation.createSession throws UNAUTHENTICATED when currentUser is null", async () => {
      const ctx = makeUnauthCtx();
      await expectUnauthenticatedAsync(() =>
        sessionResolvers.Mutation.createSession(null, { input: { sessionNumber: 1, realWorldDate: new Date(), campaignId: "camp-1" } }, ctx),
      );
    });
  });

  describe("encounterResolvers", () => {
    it("Mutation.createCombatEncounter throws UNAUTHENTICATED when currentUser is null", async () => {
      const ctx = makeUnauthCtx();
      await expectUnauthenticatedAsync(() =>
        encounterResolvers.Mutation.createCombatEncounter(null, { input: { name: "Battle" } }, ctx),
      );
    });
  });

  describe("combatantResolvers", () => {
    it("Mutation.createCombatant throws UNAUTHENTICATED when currentUser is null", async () => {
      const ctx = makeUnauthCtx();
      await expectUnauthenticatedAsync(() =>
        combatantResolvers.Mutation.createCombatant(null, { input: { name: "Goblin", encounterId: "enc-1", type: "MONSTER", maxHp: 7, currentHp: 7, initiative: 12, armorClass: 13 } }, ctx),
      );
    });
  });

  describe("statBlockResolvers", () => {
    it("Mutation.createMonster throws UNAUTHENTICATED when currentUser is null", async () => {
      const ctx = makeUnauthCtx();
      await expectUnauthenticatedAsync(() =>
        statBlockResolvers.Mutation.createMonster(null, { input: { name: "Dragon", type: "DRAGON", challengeRating: "5", armorClass: 18, hitPoints: 100 } }, ctx),
      );
    });
  });

  describe("itemResolvers", () => {
    it("Mutation.createItem throws UNAUTHENTICATED when currentUser is null", async () => {
      const ctx = makeUnauthCtx();
      await expectUnauthenticatedAsync(() =>
        itemResolvers.Mutation.createItem(null, { input: { name: "Sword", description: "Sharp", itemType: "WEAPON", rarity: "COMMON" } }, ctx),
      );
    });
  });

  describe("inventoryResolvers", () => {
    it("Mutation.createItemAssignment throws UNAUTHENTICATED when currentUser is null", async () => {
      const ctx = makeUnauthCtx();
      await expectUnauthenticatedAsync(() =>
        inventoryResolvers.Mutation.createItemAssignment(null, { input: { characterId: "c1", itemId: "i1", quantity: 1 } }, ctx),
      );
    });
  });
});

describe("Resolver Service Delegation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("userResolvers", () => {
    it("Query.me calls getUserById with current user id", async () => {
      const ctx = makeAuthCtx();
      const fakeUser = { id: "user-1", email: "test@example.com", name: "Test" };
      vi.mocked(getUserById).mockResolvedValue(fakeUser as never);

      const result = await userResolvers.Query.me(null, {}, ctx);

      expect(getUserById).toHaveBeenCalledWith(
        { prisma: ctx.prisma, queue: ctx.queue },
        "user-1",
      );
      expect(result).toEqual(fakeUser);
    });

    it("Mutation.createUser calls createUser service with input", async () => {
      const ctx = makeAuthCtx();
      const input = { email: "new@test.com", password: "pass123" };
      const fakeUser = { id: "u2", email: "new@test.com" };
      vi.mocked(createUser).mockResolvedValue(fakeUser as never);

      const result = await userResolvers.Mutation.createUser(null, { input }, ctx);

      expect(createUser).toHaveBeenCalledWith(
        { prisma: ctx.prisma, queue: ctx.queue },
        input,
      );
      expect(result).toEqual(fakeUser);
    });
  });

  describe("characterResolvers", () => {
    it("Mutation.createCharacter passes currentUser.id as userId", async () => {
      const ctx = makeAuthCtx();
      const input = { name: "Hero", class: "Fighter", race: "Human", maxHp: 10, currentHp: 10, armorClass: 15 };
      const fakeChar = { id: "c1", ...input, userId: "user-1" };
      vi.mocked(createCharacter).mockResolvedValue(fakeChar as never);

      const result = await characterResolvers.Mutation.createCharacter(null, { input }, ctx);

      expect(createCharacter).toHaveBeenCalledWith(
        { prisma: ctx.prisma, queue: ctx.queue },
        "user-1",
        input,
      );
      expect(result).toEqual(fakeChar);
    });

    it("Mutation.updateCharacter requires ownership check", async () => {
      const ctx = makeAuthCtx();
      const fakeChar = { id: "c1", userId: "user-1", name: "Hero" };
      vi.mocked(getCharacterById).mockResolvedValue(fakeChar as never);
      vi.mocked(updateCharacter).mockResolvedValue({ ...fakeChar, name: "Updated" } as never);

      const result = await characterResolvers.Mutation.updateCharacter(
        null,
        { id: "c1", input: { name: "Updated" } },
        ctx,
      );

      expect(getCharacterById).toHaveBeenCalledWith(
        { prisma: ctx.prisma, queue: ctx.queue },
        "c1",
      );
      expect(updateCharacter).toHaveBeenCalledWith(
        { prisma: ctx.prisma, queue: ctx.queue },
        "c1",
        { name: "Updated" },
      );
      expect(result).toEqual({ ...fakeChar, name: "Updated" });
    });

    it("Mutation.updateCharacter throws FORBIDDEN when user does not own character", async () => {
      const ctx = makeAuthCtx();
      const fakeChar = { id: "c1", userId: "other-user", name: "Hero" };
      vi.mocked(getCharacterById).mockResolvedValue(fakeChar as never);

      await expect(
        characterResolvers.Mutation.updateCharacter(null, { id: "c1", input: { name: "X" } }, ctx),
      ).rejects.toThrow(GraphQLError);

      try {
        await characterResolvers.Mutation.updateCharacter(null, { id: "c1", input: { name: "X" } }, ctx);
      } catch (e) {
        expect((e as GraphQLError).extensions?.code).toBe("FORBIDDEN");
      }
    });

    it("Mutation.deleteCharacter requires ownership and calls deleteCharacter", async () => {
      const ctx = makeAuthCtx();
      const fakeChar = { id: "c1", userId: "user-1", name: "Hero" };
      vi.mocked(getCharacterById).mockResolvedValue(fakeChar as never);
      vi.mocked(deleteCharacter).mockResolvedValue(undefined as never);

      const result = await characterResolvers.Mutation.deleteCharacter(null, { id: "c1" }, ctx);

      expect(deleteCharacter).toHaveBeenCalledWith(
        { prisma: ctx.prisma, queue: ctx.queue },
        "c1",
      );
      expect(result).toBe(true);
    });
  });

  describe("campaignResolvers", () => {
    it("Mutation.createCampaign passes ownerId: currentUser.id", async () => {
      const ctx = makeAuthCtx();
      const input = { name: "My Campaign" };
      const fakeCampaign = { id: "camp-1", name: "My Campaign", ownerId: "user-1" };
      vi.mocked(campaignService.createCampaign).mockResolvedValue(fakeCampaign as never);

      const result = await campaignResolvers.Mutation.createCampaign(null, { input }, ctx);

      expect(campaignService.createCampaign).toHaveBeenCalledWith(
        { prisma: ctx.prisma, queue: ctx.queue },
        { ...input, ownerId: "user-1" },
      );
      expect(result).toEqual(fakeCampaign);
    });

    it("Query.campaign calls getCampaignById", async () => {
      const ctx = makeAuthCtx();
      const fakeCampaign = { id: "camp-1", name: "Test" };
      vi.mocked(campaignService.getCampaignById).mockResolvedValue(fakeCampaign as never);

      const result = await campaignResolvers.Query.campaign(null, { id: "camp-1" }, ctx);

      expect(campaignService.getCampaignById).toHaveBeenCalledWith(
        { prisma: ctx.prisma, queue: ctx.queue },
        "camp-1",
      );
      expect(result).toEqual(fakeCampaign);
    });
  });

  describe("sessionResolvers", () => {
    it("Mutation.createSession passes dmId: currentUser.id", async () => {
      const ctx = makeAuthCtx();
      const input = { sessionNumber: 1, realWorldDate: new Date("2024-01-01"), campaignId: "camp-1" };
      const fakeSession = { id: "sess-1", ...input, dmId: "user-1" };
      vi.mocked(sessionService.createSession).mockResolvedValue(fakeSession as never);

      const result = await sessionResolvers.Mutation.createSession(null, { input }, ctx);

      expect(sessionService.createSession).toHaveBeenCalledWith(
        { prisma: ctx.prisma, queue: ctx.queue },
        { ...input, dmId: "user-1" },
      );
      expect(result).toEqual(fakeSession);
    });

    it("Query.session calls getSessionById", async () => {
      const ctx = makeAuthCtx();
      const fakeSession = { id: "sess-1", sessionNumber: 1 };
      vi.mocked(sessionService.getSessionById).mockResolvedValue(fakeSession as never);

      const result = await sessionResolvers.Query.session(null, { id: "sess-1" }, ctx);

      expect(sessionService.getSessionById).toHaveBeenCalledWith(
        { prisma: ctx.prisma, queue: ctx.queue },
        "sess-1",
      );
      expect(result).toEqual(fakeSession);
    });
  });

  describe("encounterResolvers", () => {
    it("Mutation.createCombatEncounter calls createEncounter with input", async () => {
      const ctx = makeAuthCtx();
      const input = { name: "Boss Fight" };
      const fakeEncounter = { id: "enc-1", name: "Boss Fight" };
      vi.mocked(encounterService.createEncounter).mockResolvedValue(fakeEncounter as never);

      const result = await encounterResolvers.Mutation.createCombatEncounter(null, { input }, ctx);

      expect(encounterService.createEncounter).toHaveBeenCalledWith(
        { prisma: ctx.prisma, queue: ctx.queue },
        input,
      );
      expect(result).toEqual(fakeEncounter);
    });
  });

  describe("combatantResolvers", () => {
    it("Mutation.createCombatant calls createCombatant service with input", async () => {
      const ctx = makeAuthCtx();
      const input = { name: "Goblin", encounterId: "enc-1", type: "MONSTER", maxHp: 7, currentHp: 7, initiative: 12, armorClass: 13 };
      const fakeCombatant = { id: "comb-1", ...input };
      vi.mocked(createCombatant).mockResolvedValue(fakeCombatant as never);

      const result = await combatantResolvers.Mutation.createCombatant(null, { input }, ctx);

      expect(createCombatant).toHaveBeenCalledWith(
        { prisma: ctx.prisma, queue: ctx.queue },
        input,
      );
      expect(result).toEqual(fakeCombatant);
    });
  });

  describe("statBlockResolvers", () => {
    it("Mutation.createMonster calls createStatBlock with user.id", async () => {
      const ctx = makeAuthCtx();
      const input = { name: "Dragon", type: "DRAGON", challengeRating: "5", armorClass: 18, hitPoints: 100 };
      const fakeMonster = { id: "m-1", ...input };
      vi.mocked(createStatBlock).mockResolvedValue(fakeMonster as never);

      const result = await statBlockResolvers.Mutation.createMonster(null, { input }, ctx);

      expect(createStatBlock).toHaveBeenCalledWith(
        { prisma: ctx.prisma, queue: ctx.queue },
        input,
        "user-1",
      );
      expect(result).toEqual(fakeMonster);
    });

    it("Query.monster calls getStatBlockById", async () => {
      const ctx = makeAuthCtx();
      const fakeMonster = { id: "m-1", name: "Dragon" };
      vi.mocked(getStatBlockById).mockResolvedValue(fakeMonster as never);

      const result = await statBlockResolvers.Query.monster(null, { id: "m-1" }, ctx);

      expect(getStatBlockById).toHaveBeenCalledWith(
        { prisma: ctx.prisma, queue: ctx.queue },
        "m-1",
      );
      expect(result).toEqual(fakeMonster);
    });
  });

  describe("inventoryResolvers", () => {
    it("Mutation.createItemAssignment calls addItemToInventory", async () => {
      const ctx = makeAuthCtx();
      const input = { characterId: "c1", itemId: "i1", quantity: 2 };
      const fakeAssignment = { id: "ia-1", ...input };
      vi.mocked(addItemToInventory).mockResolvedValue(fakeAssignment as never);

      const result = await inventoryResolvers.Mutation.createItemAssignment(null, { input }, ctx);

      expect(addItemToInventory).toHaveBeenCalledWith(
        { prisma: ctx.prisma, queue: ctx.queue },
        input,
      );
      expect(result).toEqual(fakeAssignment);
    });

    it("Mutation.deleteItemAssignment calls removeItemFromInventory", async () => {
      const ctx = makeAuthCtx();
      vi.mocked(removeItemFromInventory).mockResolvedValue(undefined as never);

      const result = await inventoryResolvers.Mutation.deleteItemAssignment(null, { id: "ia-1" }, ctx);

      expect(removeItemFromInventory).toHaveBeenCalledWith(
        { prisma: ctx.prisma, queue: ctx.queue },
        "ia-1",
      );
      expect(result).toBe(true);
    });
  });

  describe("itemResolvers", () => {
    it("Mutation.createItem uses queue.enqueue and passes createdById", async () => {
      const ctx = makeAuthCtx();
      const input = { name: "Sword", description: "Sharp", itemType: "WEAPON", rarity: "COMMON" };
      const fakeItem = { id: "item-1", ...input, createdById: "user-1" };
      (ctx.prisma.item.create as ReturnType<typeof vi.fn>).mockResolvedValue(fakeItem);

      const result = await itemResolvers.Mutation.createItem(null, { input }, ctx);

      expect(ctx.queue.enqueue).toHaveBeenCalled();
      expect(result).toEqual(fakeItem);
    });
  });
});

describe("Resolver Error Propagation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("userResolvers.Query.me propagates service errors", async () => {
    const ctx = makeAuthCtx();
    const error = new Error("DB connection failed");
    vi.mocked(getUserById).mockRejectedValue(error);

    await expect(userResolvers.Query.me(null, {}, ctx)).rejects.toThrow("DB connection failed");
  });

  it("characterResolvers.Mutation.createCharacter propagates service errors", async () => {
    const ctx = makeAuthCtx();
    const error = new GraphQLError("Unique constraint failed", {
      extensions: { code: "CONFLICT" },
    });
    vi.mocked(createCharacter).mockRejectedValue(error);

    await expect(
      characterResolvers.Mutation.createCharacter(
        null,
        { input: { name: "Hero", class: "Fighter", race: "Human", maxHp: 10, currentHp: 10, armorClass: 15 } },
        ctx,
      ),
    ).rejects.toThrow("Unique constraint failed");
  });

  it("campaignResolvers.Mutation.createCampaign propagates service errors", async () => {
    const ctx = makeAuthCtx();
    const error = new Error("Internal server error");
    vi.mocked(campaignService.createCampaign).mockRejectedValue(error);

    await expect(
      campaignResolvers.Mutation.createCampaign(null, { input: { name: "Camp" } }, ctx),
    ).rejects.toThrow("Internal server error");
  });

  it("sessionResolvers.Mutation.createSession propagates service errors", async () => {
    const ctx = makeAuthCtx();
    const error = new Error("Campaign not found");
    vi.mocked(sessionService.createSession).mockRejectedValue(error);

    await expect(
      sessionResolvers.Mutation.createSession(
        null,
        { input: { sessionNumber: 1, realWorldDate: new Date(), campaignId: "camp-1" } },
        ctx,
      ),
    ).rejects.toThrow("Campaign not found");
  });

  it("combatantResolvers.Mutation.createCombatant propagates service errors", async () => {
    const ctx = makeAuthCtx();
    const error = new Error("Encounter not found");
    vi.mocked(createCombatant).mockRejectedValue(error);

    await expect(
      combatantResolvers.Mutation.createCombatant(
        null,
        { input: { name: "Goblin", encounterId: "enc-1", type: "MONSTER", maxHp: 7, currentHp: 7, initiative: 12, armorClass: 13 } },
        ctx,
      ),
    ).rejects.toThrow("Encounter not found");
  });

  it("statBlockResolvers.Mutation.createMonster propagates service errors", async () => {
    const ctx = makeAuthCtx();
    const error = new Error("Validation failed");
    vi.mocked(createStatBlock).mockRejectedValue(error);

    await expect(
      statBlockResolvers.Mutation.createMonster(
        null,
        { input: { name: "Dragon", type: "DRAGON", challengeRating: "5", armorClass: 18, hitPoints: 100 } },
        ctx,
      ),
    ).rejects.toThrow("Validation failed");
  });
});
