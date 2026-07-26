import { describe, it, expect, vi, beforeEach } from "vitest";
import type { GraphQLContext } from "../context.ts";

// Mock services
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

import { campaignResolvers } from "./campaign.resolver.ts";
import { sessionResolvers } from "./session.resolver.ts";
import { encounterResolvers } from "./encounter.resolver.ts";
import { combatantResolvers } from "./combatant.resolver.ts";
import { statBlockResolvers } from "./statBlock.resolver.ts";
import { itemResolvers } from "./item.resolver.ts";
import { inventoryResolvers } from "./inventory.resolver.ts";
import { userResolvers } from "./user.resolver.ts";
import { characterResolvers } from "./character.resolver.ts";

import * as campaignService from "../../services/campaignService.ts";
import * as sessionService from "../../services/sessionService.ts";
import * as encounterService from "../../services/encounterService.ts";
import { listCharactersByUser } from "../../services/characterService.ts";
import { listStatBlocks, updateStatBlock, deleteStatBlock } from "../../services/statBlockService.ts";
import { updateCombatant, deleteCombatant, listCombatantsByEncounter } from "../../services/combatantService.ts";
import { updateItemSlot, getInventoryByCharacter } from "../../services/inventoryService.ts";

function makeAuthCtx(): GraphQLContext {
  return {
    currentUser: { id: "user-1", email: "test@example.com" },
    prisma: {
      user: { findMany: vi.fn().mockResolvedValue([]) },
      character: { findMany: vi.fn().mockResolvedValue([]) },
      campaign: { findMany: vi.fn().mockResolvedValue([]) },
      combatEncounter: { findMany: vi.fn().mockResolvedValue([]) },
      combatant: { findUnique: vi.fn().mockResolvedValue(null) },
      item: { findUnique: vi.fn().mockResolvedValue(null), findMany: vi.fn().mockResolvedValue([]), create: vi.fn().mockResolvedValue({ id: "i1" }), update: vi.fn().mockResolvedValue({ id: "i1" }), delete: vi.fn().mockResolvedValue({ id: "i1" }) },
      monster: { findMany: vi.fn().mockResolvedValue([]) },
      nPC: { findUnique: vi.fn().mockResolvedValue(null), findMany: vi.fn().mockResolvedValue([]), create: vi.fn().mockResolvedValue({ id: "npc1" }), update: vi.fn().mockResolvedValue({ id: "npc1" }), delete: vi.fn().mockResolvedValue({ id: "npc1" }) },
      location: { findUnique: vi.fn().mockResolvedValue(null), findMany: vi.fn().mockResolvedValue([]), create: vi.fn().mockResolvedValue({ id: "loc1" }), update: vi.fn().mockResolvedValue({ id: "loc1" }), delete: vi.fn().mockResolvedValue({ id: "loc1" }) },
      quest: { findUnique: vi.fn().mockResolvedValue(null), findMany: vi.fn().mockResolvedValue([]), create: vi.fn().mockResolvedValue({ id: "q1" }), update: vi.fn().mockResolvedValue({ id: "q1" }), delete: vi.fn().mockResolvedValue({ id: "q1" }) },
      timelineEntry: { findUnique: vi.fn().mockResolvedValue(null), findMany: vi.fn().mockResolvedValue([]), create: vi.fn().mockResolvedValue({ id: "te1" }), update: vi.fn().mockResolvedValue({ id: "te1" }), delete: vi.fn().mockResolvedValue({ id: "te1" }) },
      sessionNote: { findUnique: vi.fn().mockResolvedValue(null), findMany: vi.fn().mockResolvedValue([]), create: vi.fn().mockResolvedValue({ id: "sn1" }), update: vi.fn().mockResolvedValue({ id: "sn1" }), delete: vi.fn().mockResolvedValue({ id: "sn1" }) },
      itemAssignment: { findUnique: vi.fn().mockResolvedValue(null) },
      $transaction: vi.fn((fn: Function) => fn({ user: { update: vi.fn().mockResolvedValue({ id: "user-1" }), delete: vi.fn().mockResolvedValue({ id: "user-1" }) } })),
    } as unknown as GraphQLContext["prisma"],
    queue: { enqueue: vi.fn((fn: Function) => fn()), drain: vi.fn(() => Promise.resolve()), pendingCount: 0 } as unknown as GraphQLContext["queue"],
  };
}

beforeEach(() => { vi.clearAllMocks(); });

describe("Campaign resolver - query branches", () => {
  it("campaigns with no ownerId returns all", async () => {
    const ctx = makeAuthCtx();
    await campaignResolvers.Query.campaigns(null, {}, ctx);
    expect(ctx.prisma.campaign.findMany).toHaveBeenCalled();
  });

  it("campaigns with ownerId calls listCampaignsByOwner", async () => {
    const ctx = makeAuthCtx();
    vi.mocked(campaignService.listCampaignsByOwner).mockResolvedValue([]);
    await campaignResolvers.Query.campaigns(null, { ownerId: "user-1" }, ctx);
    expect(campaignService.listCampaignsByOwner).toHaveBeenCalledWith(
      { prisma: ctx.prisma, queue: ctx.queue }, "user-1",
    );
  });

  it("npc query returns findUnique result", async () => {
    const ctx = makeAuthCtx();
    await campaignResolvers.Query.npc(null, { id: "npc1" }, ctx);
    expect(ctx.prisma.nPC.findUnique).toHaveBeenCalledWith({ where: { id: "npc1" } });
  });

  it("npcs query returns findMany result", async () => {
    const ctx = makeAuthCtx();
    await campaignResolvers.Query.npcs(null, { campaignId: "c1" }, ctx);
    expect(ctx.prisma.nPC.findMany).toHaveBeenCalledWith({ where: { campaignId: "c1" } });
  });

  it("location query", async () => {
    const ctx = makeAuthCtx();
    await campaignResolvers.Query.location(null, { id: "loc1" }, ctx);
    expect(ctx.prisma.location.findUnique).toHaveBeenCalled();
  });

  it("locations query", async () => {
    const ctx = makeAuthCtx();
    await campaignResolvers.Query.locations(null, { campaignId: "c1" }, ctx);
    expect(ctx.prisma.location.findMany).toHaveBeenCalled();
  });

  it("quest query", async () => {
    const ctx = makeAuthCtx();
    await campaignResolvers.Query.quest(null, { id: "q1" }, ctx);
    expect(ctx.prisma.quest.findUnique).toHaveBeenCalled();
  });

  it("quests query without status filter", async () => {
    const ctx = makeAuthCtx();
    await campaignResolvers.Query.quests(null, { campaignId: "c1" }, ctx);
    expect(ctx.prisma.quest.findMany).toHaveBeenCalledWith({ where: { campaignId: "c1" } });
  });

  it("quests query with status filter", async () => {
    const ctx = makeAuthCtx();
    await campaignResolvers.Query.quests(null, { campaignId: "c1", status: "ACTIVE" }, ctx);
    expect(ctx.prisma.quest.findMany).toHaveBeenCalledWith({ where: { campaignId: "c1", status: "ACTIVE" } });
  });

  it("timelineEntry query", async () => {
    const ctx = makeAuthCtx();
    await campaignResolvers.Query.timelineEntry(null, { id: "te1" }, ctx);
    expect(ctx.prisma.timelineEntry.findUnique).toHaveBeenCalled();
  });

  it("timelineEntries query", async () => {
    const ctx = makeAuthCtx();
    await campaignResolvers.Query.timelineEntries(null, { campaignId: "c1" }, ctx);
    expect(ctx.prisma.timelineEntry.findMany).toHaveBeenCalled();
  });
});

describe("Campaign resolver - mutation branches", () => {
  it("updateCampaign calls service", async () => {
    const ctx = makeAuthCtx();
    vi.mocked(campaignService.updateCampaign).mockResolvedValue({ id: "c1" } as never);
    await campaignResolvers.Mutation.updateCampaign(null, { id: "c1", input: { name: "New" } }, ctx);
    expect(campaignService.updateCampaign).toHaveBeenCalled();
  });

  it("deleteCampaign calls service and returns true", async () => {
    const ctx = makeAuthCtx();
    vi.mocked(campaignService.deleteCampaign).mockResolvedValue(undefined as never);
    const result = await campaignResolvers.Mutation.deleteCampaign(null, { id: "c1" }, ctx);
    expect(result).toBe(true);
  });

  it("createNPC creates npc through queue", async () => {
    const ctx = makeAuthCtx();
    await campaignResolvers.Mutation.createNPC(null, { input: { name: "Bob", campaignId: "c1" } }, ctx);
    expect(ctx.queue.enqueue).toHaveBeenCalled();
  });

  it("updateNPC updates npc through queue", async () => {
    const ctx = makeAuthCtx();
    await campaignResolvers.Mutation.updateNPC(null, { id: "npc1", input: { name: "Updated" } }, ctx);
    expect(ctx.queue.enqueue).toHaveBeenCalled();
  });

  it("deleteNPC returns true", async () => {
    const ctx = makeAuthCtx();
    const result = await campaignResolvers.Mutation.deleteNPC(null, { id: "npc1" }, ctx);
    expect(result).toBe(true);
  });

  it("createLocation creates through queue", async () => {
    const ctx = makeAuthCtx();
    await campaignResolvers.Mutation.createLocation(null, { input: { name: "Tavern", campaignId: "c1" } }, ctx);
    expect(ctx.queue.enqueue).toHaveBeenCalled();
  });

  it("updateLocation updates through queue", async () => {
    const ctx = makeAuthCtx();
    await campaignResolvers.Mutation.updateLocation(null, { id: "loc1", input: { name: "Updated" } }, ctx);
    expect(ctx.queue.enqueue).toHaveBeenCalled();
  });

  it("deleteLocation returns true", async () => {
    const ctx = makeAuthCtx();
    const result = await campaignResolvers.Mutation.deleteLocation(null, { id: "loc1" }, ctx);
    expect(result).toBe(true);
  });

  it("createQuest creates through queue", async () => {
    const ctx = makeAuthCtx();
    await campaignResolvers.Mutation.createQuest(null, { input: { name: "Save the world", campaignId: "c1" } }, ctx);
    expect(ctx.queue.enqueue).toHaveBeenCalled();
  });

  it("updateQuest updates through queue", async () => {
    const ctx = makeAuthCtx();
    await campaignResolvers.Mutation.updateQuest(null, { id: "q1", input: { name: "Updated", status: "COMPLETED" } }, ctx);
    expect(ctx.queue.enqueue).toHaveBeenCalled();
  });

  it("deleteQuest returns true", async () => {
    const ctx = makeAuthCtx();
    const result = await campaignResolvers.Mutation.deleteQuest(null, { id: "q1" }, ctx);
    expect(result).toBe(true);
  });

  it("createTimelineEntry creates through queue", async () => {
    const ctx = makeAuthCtx();
    await campaignResolvers.Mutation.createTimelineEntry(null, { input: { description: "Event", inGameDate: "Day 1", campaignId: "c1" } }, ctx);
    expect(ctx.queue.enqueue).toHaveBeenCalled();
  });

  it("updateTimelineEntry updates through queue", async () => {
    const ctx = makeAuthCtx();
    await campaignResolvers.Mutation.updateTimelineEntry(null, { id: "te1", input: { title: "New Title" } }, ctx);
    expect(ctx.queue.enqueue).toHaveBeenCalled();
  });

  it("deleteTimelineEntry returns true", async () => {
    const ctx = makeAuthCtx();
    const result = await campaignResolvers.Mutation.deleteTimelineEntry(null, { id: "te1" }, ctx);
    expect(result).toBe(true);
  });
});

describe("Session resolver - additional branches", () => {
  it("sessions query calls listSessionsByCampaign", async () => {
    const ctx = makeAuthCtx();
    vi.mocked(sessionService.listSessionsByCampaign).mockResolvedValue([]);
    await sessionResolvers.Query.sessions(null, { campaignId: "c1" }, ctx);
    expect(sessionService.listSessionsByCampaign).toHaveBeenCalled();
  });

  it("sessionNote query", async () => {
    const ctx = makeAuthCtx();
    await sessionResolvers.Query.sessionNote(null, { id: "sn1" }, ctx);
    expect(ctx.prisma.sessionNote.findUnique).toHaveBeenCalled();
  });

  it("sessionNotes query", async () => {
    const ctx = makeAuthCtx();
    await sessionResolvers.Query.sessionNotes(null, { sessionId: "s1" }, ctx);
    expect(ctx.prisma.sessionNote.findMany).toHaveBeenCalled();
  });

  it("updateSession calls service", async () => {
    const ctx = makeAuthCtx();
    vi.mocked(sessionService.updateSession).mockResolvedValue({ id: "s1" } as never);
    await sessionResolvers.Mutation.updateSession(null, { id: "s1", input: { title: "New" } }, ctx);
    expect(sessionService.updateSession).toHaveBeenCalled();
  });

  it("deleteSession returns true", async () => {
    const ctx = makeAuthCtx();
    vi.mocked(sessionService.deleteSession).mockResolvedValue(undefined as never);
    const result = await sessionResolvers.Mutation.deleteSession(null, { id: "s1" }, ctx);
    expect(result).toBe(true);
  });

  it("createSessionNote creates through queue", async () => {
    const ctx = makeAuthCtx();
    await sessionResolvers.Mutation.createSessionNote(null, { input: { content: "Notes", sessionId: "s1" } }, ctx);
    expect(ctx.queue.enqueue).toHaveBeenCalled();
  });

  it("updateSessionNote updates through queue", async () => {
    const ctx = makeAuthCtx();
    await sessionResolvers.Mutation.updateSessionNote(null, { id: "sn1", input: { content: "Updated" } }, ctx);
    expect(ctx.queue.enqueue).toHaveBeenCalled();
  });

  it("deleteSessionNote returns true", async () => {
    const ctx = makeAuthCtx();
    const result = await sessionResolvers.Mutation.deleteSessionNote(null, { id: "sn1" }, ctx);
    expect(result).toBe(true);
  });
});

describe("Encounter resolver - additional branches", () => {
  it("combatEncounters with sessionId calls listEncountersBySession", async () => {
    const ctx = makeAuthCtx();
    vi.mocked(encounterService.listEncountersBySession).mockResolvedValue([]);
    await encounterResolvers.Query.combatEncounters(null, { sessionId: "s1" }, ctx);
    expect(encounterService.listEncountersBySession).toHaveBeenCalled();
  });

  it("combatEncounters without sessionId returns all", async () => {
    const ctx = makeAuthCtx();
    await encounterResolvers.Query.combatEncounters(null, {}, ctx);
    expect(ctx.prisma.combatEncounter.findMany).toHaveBeenCalled();
  });

  it("updateCombatEncounter calls updateEncounter", async () => {
    const ctx = makeAuthCtx();
    vi.mocked(encounterService.updateEncounter).mockResolvedValue({ id: "e1" } as never);
    await encounterResolvers.Mutation.updateCombatEncounter(null, { id: "e1", input: { name: "Updated" } }, ctx);
    expect(encounterService.updateEncounter).toHaveBeenCalled();
  });

  it("deleteCombatEncounter returns true", async () => {
    const ctx = makeAuthCtx();
    vi.mocked(encounterService.deleteEncounter).mockResolvedValue(undefined as never);
    const result = await encounterResolvers.Mutation.deleteCombatEncounter(null, { id: "e1" }, ctx);
    expect(result).toBe(true);
  });
});

describe("Combatant resolver - additional branches", () => {
  it("combatant query uses findUnique", async () => {
    const ctx = makeAuthCtx();
    await combatantResolvers.Query.combatant(null, { id: "comb1" }, ctx);
    expect(ctx.prisma.combatant.findUnique).toHaveBeenCalledWith({ where: { id: "comb1" } });
  });

  it("combatants query calls listCombatantsByEncounter", async () => {
    const ctx = makeAuthCtx();
    vi.mocked(listCombatantsByEncounter).mockResolvedValue([]);
    await combatantResolvers.Query.combatants(null, { encounterId: "e1" }, ctx);
    expect(listCombatantsByEncounter).toHaveBeenCalled();
  });

  it("updateCombatant calls service", async () => {
    const ctx = makeAuthCtx();
    vi.mocked(updateCombatant).mockResolvedValue({ id: "comb1" } as never);
    await combatantResolvers.Mutation.updateCombatant(null, { id: "comb1", input: { currentHp: 5 } }, ctx);
    expect(updateCombatant).toHaveBeenCalled();
  });

  it("deleteCombatant returns true", async () => {
    const ctx = makeAuthCtx();
    vi.mocked(deleteCombatant).mockResolvedValue(undefined as never);
    const result = await combatantResolvers.Mutation.deleteCombatant(null, { id: "comb1" }, ctx);
    expect(result).toBe(true);
  });
});

describe("StatBlock resolver - additional branches", () => {
  it("monsters with type filter uses prisma findMany", async () => {
    const ctx = makeAuthCtx();
    await statBlockResolvers.Query.monsters(null, { type: "DRAGON" }, ctx);
    expect(ctx.prisma.monster.findMany).toHaveBeenCalledWith({ where: { type: "DRAGON" } });
  });

  it("monsters with no filter calls listStatBlocks", async () => {
    const ctx = makeAuthCtx();
    vi.mocked(listStatBlocks).mockResolvedValue([]);
    await statBlockResolvers.Query.monsters(null, {}, ctx);
    expect(listStatBlocks).toHaveBeenCalled();
  });

  it("updateMonster calls updateStatBlock", async () => {
    const ctx = makeAuthCtx();
    vi.mocked(updateStatBlock).mockResolvedValue({ id: "m1" } as never);
    await statBlockResolvers.Mutation.updateMonster(null, { id: "m1", input: { name: "Elder Dragon" } }, ctx);
    expect(updateStatBlock).toHaveBeenCalled();
  });

  it("deleteMonster returns true", async () => {
    const ctx = makeAuthCtx();
    vi.mocked(deleteStatBlock).mockResolvedValue(undefined as never);
    const result = await statBlockResolvers.Mutation.deleteMonster(null, { id: "m1" }, ctx);
    expect(result).toBe(true);
  });
});

describe("Item resolver - additional branches", () => {
  it("item query uses findUnique", async () => {
    const ctx = makeAuthCtx();
    await itemResolvers.Query.item(null, { id: "i1" }, ctx);
    expect(ctx.prisma.item.findUnique).toHaveBeenCalledWith({ where: { id: "i1" } });
  });

  it("items query with filters", async () => {
    const ctx = makeAuthCtx();
    await itemResolvers.Query.items(null, { itemType: "WEAPON", rarity: "RARE", source: "PHB" }, ctx);
    expect(ctx.prisma.item.findMany).toHaveBeenCalledWith({ where: { itemType: "WEAPON", rarity: "RARE", source: "PHB" } });
  });

  it("items query with no filters", async () => {
    const ctx = makeAuthCtx();
    await itemResolvers.Query.items(null, {}, ctx);
    expect(ctx.prisma.item.findMany).toHaveBeenCalledWith({ where: {} });
  });

  it("updateItem calls prisma through queue", async () => {
    const ctx = makeAuthCtx();
    await itemResolvers.Mutation.updateItem(null, { id: "i1", input: { name: "Better Sword" } }, ctx);
    expect(ctx.queue.enqueue).toHaveBeenCalled();
  });

  it("deleteItem returns true", async () => {
    const ctx = makeAuthCtx();
    const result = await itemResolvers.Mutation.deleteItem(null, { id: "i1" }, ctx);
    expect(result).toBe(true);
  });
});

describe("Inventory resolver - additional branches", () => {
  it("itemAssignment query uses findUnique with includes", async () => {
    const ctx = makeAuthCtx();
    await inventoryResolvers.Query.itemAssignment(null, { id: "ia1" }, ctx);
    expect(ctx.prisma.itemAssignment.findUnique).toHaveBeenCalledWith({
      where: { id: "ia1" },
      include: { item: true, character: true },
    });
  });

  it("itemAssignments calls getInventoryByCharacter", async () => {
    const ctx = makeAuthCtx();
    vi.mocked(getInventoryByCharacter).mockResolvedValue([]);
    await inventoryResolvers.Query.itemAssignments(null, { characterId: "c1" }, ctx);
    expect(getInventoryByCharacter).toHaveBeenCalled();
  });

  it("updateItemAssignment calls updateItemSlot", async () => {
    const ctx = makeAuthCtx();
    vi.mocked(updateItemSlot).mockResolvedValue({ id: "ia1" } as never);
    await inventoryResolvers.Mutation.updateItemAssignment(null, { id: "ia1", input: { quantity: 5 } }, ctx);
    expect(updateItemSlot).toHaveBeenCalled();
  });
});

describe("User resolver - additional branches", () => {
  it("user query calls getUserById", async () => {
    const ctx = makeAuthCtx();
    const { getUserById } = await import("../../services/userService.ts");
    vi.mocked(getUserById).mockResolvedValue({ id: "u2", email: "other@test.com" } as never);
    await userResolvers.Query.user(null, { id: "u2" }, ctx);
    expect(getUserById).toHaveBeenCalled();
  });

  it("users query returns findMany result", async () => {
    const ctx = makeAuthCtx();
    await userResolvers.Query.users(null, {}, ctx);
    expect(ctx.prisma.user.findMany).toHaveBeenCalled();
  });

  it("updateUser calls prisma through queue/transaction", async () => {
    const ctx = makeAuthCtx();
    await userResolvers.Mutation.updateUser(null, { id: "user-1", input: { name: "New Name" } }, ctx);
    expect(ctx.queue.enqueue).toHaveBeenCalled();
  });

  it("deleteUser returns true", async () => {
    const ctx = makeAuthCtx();
    const result = await userResolvers.Mutation.deleteUser(null, { id: "user-1" }, ctx);
    expect(result).toBe(true);
  });
});

describe("Character resolver - additional branches", () => {
  it("character query calls getCharacterById", async () => {
    const ctx = makeAuthCtx();
    const { getCharacterById } = await import("../../services/characterService.ts");
    vi.mocked(getCharacterById).mockResolvedValue({ id: "c1", userId: "user-1" } as never);
    await characterResolvers.Query.character(null, { id: "c1" }, ctx);
    expect(getCharacterById).toHaveBeenCalled();
  });

  it("characters with userId calls listCharactersByUser", async () => {
    const ctx = makeAuthCtx();
    vi.mocked(listCharactersByUser).mockResolvedValue([]);
    await characterResolvers.Query.characters(null, { userId: "user-1" }, ctx);
    expect(listCharactersByUser).toHaveBeenCalled();
  });

  it("characters with campaignId uses prisma findMany", async () => {
    const ctx = makeAuthCtx();
    await characterResolvers.Query.characters(null, { campaignId: "camp1" }, ctx);
    expect(ctx.prisma.character.findMany).toHaveBeenCalledWith({
      where: { campaignId: "camp1" },
      include: { itemAssignments: true },
    });
  });

  it("characters with no filter returns all", async () => {
    const ctx = makeAuthCtx();
    await characterResolvers.Query.characters(null, {}, ctx);
    expect(ctx.prisma.character.findMany).toHaveBeenCalledWith({
      include: { itemAssignments: true },
    });
  });
});
