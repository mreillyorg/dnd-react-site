import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createCombatant,
  updateCombatant,
  deleteCombatant,
  listCombatantsByEncounter,
} from "./combatantService.ts";
import type { ServiceDeps } from "./combatantService.ts";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

function createMockDeps(): ServiceDeps {
  const mockPrisma = {
    combatant: {
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      findMany: vi.fn(),
    },
  } as unknown as ServiceDeps["prisma"];

  const mockQueue = {
    enqueue: vi.fn((fn: () => Promise<unknown>) => fn()),
    drain: vi.fn(),
    pendingCount: 0,
  } as unknown as ServiceDeps["queue"];

  return { prisma: mockPrisma, queue: mockQueue };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("combatantService", () => {
  let deps: ServiceDeps;

  beforeEach(() => {
    deps = createMockDeps();
  });

  describe("createCombatant", () => {
    it("routes the write through the operation queue", async () => {
      const mockCombatant = { id: "c1", name: "Goblin" };
      (deps.prisma.combatant.create as ReturnType<typeof vi.fn>).mockResolvedValue(mockCombatant);

      await createCombatant(deps, {
        name: "Goblin",
        initiative: 15,
        maxHp: 7,
        currentHp: 7,
        armorClass: 15,
        combatantType: "MONSTER",
        encounterId: "enc1",
      });

      expect(deps.queue.enqueue).toHaveBeenCalledTimes(1);
    });

    it("does not use $transaction (single-model write)", async () => {
      const mockCombatant = { id: "c1", name: "Goblin" };
      (deps.prisma.combatant.create as ReturnType<typeof vi.fn>).mockResolvedValue(mockCombatant);

      await createCombatant(deps, {
        name: "Goblin",
        initiative: 15,
        maxHp: 7,
        currentHp: 7,
        armorClass: 15,
        combatantType: "MONSTER",
        encounterId: "enc1",
      });

      expect(deps.prisma.combatant.create).toHaveBeenCalledTimes(1);
    });

    it("passes correct data to prisma create", async () => {
      (deps.prisma.combatant.create as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "c1" });

      await createCombatant(deps, {
        name: "Aragorn",
        initiative: 18,
        maxHp: 50,
        currentHp: 45,
        tempHp: 5,
        armorClass: 16,
        combatantType: "PLAYER",
        characterId: "char1",
        encounterId: "enc1",
      });

      expect(deps.prisma.combatant.create).toHaveBeenCalledWith({
        data: {
          name: "Aragorn",
          initiative: 18,
          maxHp: 50,
          currentHp: 45,
          tempHp: 5,
          armorClass: 16,
          combatantType: "PLAYER",
          characterId: "char1",
          monsterId: undefined,
          encounterId: "enc1",
        },
      });
    });

    it("defaults tempHp to 0 when not provided", async () => {
      (deps.prisma.combatant.create as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "c1" });

      await createCombatant(deps, {
        name: "Goblin",
        initiative: 15,
        maxHp: 7,
        currentHp: 7,
        armorClass: 15,
        combatantType: "MONSTER",
        encounterId: "enc1",
      });

      expect(deps.prisma.combatant.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ tempHp: 0 }),
        }),
      );
    });

    it("returns the created combatant", async () => {
      const mockCombatant = { id: "c1", name: "Goblin", initiative: 15 };
      (deps.prisma.combatant.create as ReturnType<typeof vi.fn>).mockResolvedValue(mockCombatant);

      const result = await createCombatant(deps, {
        name: "Goblin",
        initiative: 15,
        maxHp: 7,
        currentHp: 7,
        armorClass: 15,
        combatantType: "MONSTER",
        encounterId: "enc1",
      });

      expect(result).toEqual(mockCombatant);
    });
  });

  describe("updateCombatant", () => {
    it("routes the write through the operation queue", async () => {
      (deps.prisma.combatant.update as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "c1" });

      await updateCombatant(deps, "c1", { currentHp: 3 });

      expect(deps.queue.enqueue).toHaveBeenCalledTimes(1);
    });

    it("passes only provided fields to prisma update", async () => {
      (deps.prisma.combatant.update as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "c1" });

      await updateCombatant(deps, "c1", { currentHp: 3, initiative: 20 });

      expect(deps.prisma.combatant.update).toHaveBeenCalledWith({
        where: { id: "c1" },
        data: { currentHp: 3, initiative: 20 },
      });
    });

    it("does not include undefined fields in update data", async () => {
      (deps.prisma.combatant.update as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "c1" });

      await updateCombatant(deps, "c1", { tempHp: 10 });

      const callData = (deps.prisma.combatant.update as ReturnType<typeof vi.fn>).mock.calls[0][0].data;
      expect(callData).toEqual({ tempHp: 10 });
      expect(callData).not.toHaveProperty("name");
      expect(callData).not.toHaveProperty("initiative");
    });

    it("returns the updated combatant", async () => {
      const updated = { id: "c1", currentHp: 3 };
      (deps.prisma.combatant.update as ReturnType<typeof vi.fn>).mockResolvedValue(updated);

      const result = await updateCombatant(deps, "c1", { currentHp: 3 });

      expect(result).toEqual(updated);
    });
  });

  describe("deleteCombatant", () => {
    it("routes the write through the operation queue", async () => {
      (deps.prisma.combatant.delete as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "c1" });

      await deleteCombatant(deps, "c1");

      expect(deps.queue.enqueue).toHaveBeenCalledTimes(1);
    });

    it("calls prisma delete with correct id", async () => {
      (deps.prisma.combatant.delete as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "c1" });

      await deleteCombatant(deps, "c1");

      expect(deps.prisma.combatant.delete).toHaveBeenCalledWith({
        where: { id: "c1" },
      });
    });

    it("returns the deleted combatant", async () => {
      const deleted = { id: "c1", name: "Goblin" };
      (deps.prisma.combatant.delete as ReturnType<typeof vi.fn>).mockResolvedValue(deleted);

      const result = await deleteCombatant(deps, "c1");

      expect(result).toEqual(deleted);
    });
  });

  describe("listCombatantsByEncounter", () => {
    it("reads directly through prisma (not through queue)", async () => {
      (deps.prisma.combatant.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);

      await listCombatantsByEncounter(deps, "enc1");

      expect(deps.queue.enqueue).not.toHaveBeenCalled();
    });

    it("queries by encounterId", async () => {
      (deps.prisma.combatant.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);

      await listCombatantsByEncounter(deps, "enc1");

      expect(deps.prisma.combatant.findMany).toHaveBeenCalledWith({
        where: { encounterId: "enc1" },
      });
    });

    it("returns all combatants for the encounter", async () => {
      const combatants = [
        { id: "c1", name: "Goblin", encounterId: "enc1" },
        { id: "c2", name: "Orc", encounterId: "enc1" },
      ];
      (deps.prisma.combatant.findMany as ReturnType<typeof vi.fn>).mockResolvedValue(combatants);

      const result = await listCombatantsByEncounter(deps, "enc1");

      expect(result).toEqual(combatants);
    });

    it("returns empty array when no combatants exist", async () => {
      (deps.prisma.combatant.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);

      const result = await listCombatantsByEncounter(deps, "enc-empty");

      expect(result).toEqual([]);
    });
  });
});
