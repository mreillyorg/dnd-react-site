import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createStatBlock,
  getStatBlockById,
  listStatBlocks,
  updateStatBlock,
  deleteStatBlock,
} from "./statBlockService.ts";
import type { ServiceDeps } from "./statBlockService.ts";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

function createMockDeps(): ServiceDeps {
  const mockPrisma = {
    monster: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  } as unknown as ServiceDeps["prisma"];

  const mockQueue = {
    enqueue: vi.fn((fn: () => Promise<unknown>) => fn()),
    drain: vi.fn(),
    pendingCount: 0,
  } as unknown as ServiceDeps["queue"];

  return { prisma: mockPrisma, queue: mockQueue };
}

const sampleInput = {
  name: "Adult Red Dragon",
  size: "Huge",
  type: "dragon",
  alignment: "Chaotic Evil",
  armorClass: 19,
  hitPoints: 256,
  hitDice: "17d12+85",
  speed: "40 ft., climb 40 ft., fly 80 ft.",
  strength: 27,
  dexterity: 10,
  constitution: 25,
  intelligence: 16,
  wisdom: 13,
  charisma: 21,
  challengeRating: 17,
  source: "SRD",
  abilities: '["Legendary Resistance (3/Day)"]',
  actions: '["Multiattack","Bite","Claw","Tail","Frightful Presence","Fire Breath"]',
  reactions: '["Tail Attack"]',
  legendaryActions: '["Detect","Tail Attack","Wing Attack"]',
  dndbeyondLink: "https://www.dndbeyond.com/monsters/adult-red-dragon",
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("statBlockService", () => {
  let deps: ServiceDeps;

  beforeEach(() => {
    deps = createMockDeps();
  });

  describe("createStatBlock", () => {
    it("routes the write through the operation queue", async () => {
      (deps.prisma.monster.create as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "m1" });

      await createStatBlock(deps, sampleInput, "user1");

      expect(deps.queue.enqueue).toHaveBeenCalledTimes(1);
    });

    it("passes correct data to prisma create", async () => {
      (deps.prisma.monster.create as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "m1" });

      await createStatBlock(deps, sampleInput, "user1");

      expect(deps.prisma.monster.create).toHaveBeenCalledWith({
        data: {
          name: "Adult Red Dragon",
          size: "Huge",
          type: "dragon",
          alignment: "Chaotic Evil",
          armorClass: 19,
          hitPoints: 256,
          hitDice: "17d12+85",
          speed: "40 ft., climb 40 ft., fly 80 ft.",
          strength: 27,
          dexterity: 10,
          constitution: 25,
          intelligence: 16,
          wisdom: 13,
          charisma: 21,
          challengeRating: 17,
          source: "SRD",
          abilities: '["Legendary Resistance (3/Day)"]',
          actions: '["Multiattack","Bite","Claw","Tail","Frightful Presence","Fire Breath"]',
          reactions: '["Tail Attack"]',
          legendaryActions: '["Detect","Tail Attack","Wing Attack"]',
          dndbeyondLink: "https://www.dndbeyond.com/monsters/adult-red-dragon",
          createdById: "user1",
        },
      });
    });

    it("defaults source to HOMEBREW when not provided", async () => {
      (deps.prisma.monster.create as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "m1" });

      const { source, ...inputWithoutSource } = sampleInput;
      await createStatBlock(deps, inputWithoutSource);

      expect(deps.prisma.monster.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ source: "HOMEBREW" }),
        }),
      );
    });

    it("sets createdById to undefined when not provided", async () => {
      (deps.prisma.monster.create as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "m1" });

      await createStatBlock(deps, sampleInput);

      expect(deps.prisma.monster.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ createdById: undefined }),
        }),
      );
    });

    it("returns the created stat block", async () => {
      const mockMonster = { id: "m1", name: "Adult Red Dragon" };
      (deps.prisma.monster.create as ReturnType<typeof vi.fn>).mockResolvedValue(mockMonster);

      const result = await createStatBlock(deps, sampleInput);

      expect(result).toEqual(mockMonster);
    });
  });

  describe("getStatBlockById", () => {
    it("reads directly through prisma (not through queue)", async () => {
      (deps.prisma.monster.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      await getStatBlockById(deps, "m1");

      expect(deps.queue.enqueue).not.toHaveBeenCalled();
    });

    it("queries by id", async () => {
      (deps.prisma.monster.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      await getStatBlockById(deps, "m1");

      expect(deps.prisma.monster.findUnique).toHaveBeenCalledWith({
        where: { id: "m1" },
      });
    });

    it("returns null when not found", async () => {
      (deps.prisma.monster.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      const result = await getStatBlockById(deps, "nonexistent");

      expect(result).toBeNull();
    });

    it("returns the stat block when found", async () => {
      const mockMonster = { id: "m1", name: "Goblin" };
      (deps.prisma.monster.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(mockMonster);

      const result = await getStatBlockById(deps, "m1");

      expect(result).toEqual(mockMonster);
    });
  });

  describe("listStatBlocks", () => {
    it("reads directly through prisma (not through queue)", async () => {
      (deps.prisma.monster.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);

      await listStatBlocks(deps);

      expect(deps.queue.enqueue).not.toHaveBeenCalled();
    });

    it("returns all stat blocks", async () => {
      const monsters = [
        { id: "m1", name: "Goblin" },
        { id: "m2", name: "Orc" },
      ];
      (deps.prisma.monster.findMany as ReturnType<typeof vi.fn>).mockResolvedValue(monsters);

      const result = await listStatBlocks(deps);

      expect(result).toEqual(monsters);
    });

    it("returns empty array when none exist", async () => {
      (deps.prisma.monster.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);

      const result = await listStatBlocks(deps);

      expect(result).toEqual([]);
    });
  });

  describe("updateStatBlock", () => {
    it("routes the write through the operation queue", async () => {
      (deps.prisma.monster.update as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "m1" });

      await updateStatBlock(deps, "m1", { name: "Ancient Red Dragon" });

      expect(deps.queue.enqueue).toHaveBeenCalledTimes(1);
    });

    it("passes only provided fields to prisma update", async () => {
      (deps.prisma.monster.update as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "m1" });

      await updateStatBlock(deps, "m1", { hitPoints: 300, armorClass: 21 });

      expect(deps.prisma.monster.update).toHaveBeenCalledWith({
        where: { id: "m1" },
        data: { hitPoints: 300, armorClass: 21 },
      });
    });

    it("does not include undefined fields in update data", async () => {
      (deps.prisma.monster.update as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "m1" });

      await updateStatBlock(deps, "m1", { name: "Updated Dragon" });

      const callData = (deps.prisma.monster.update as ReturnType<typeof vi.fn>).mock.calls[0][0].data;
      expect(callData).toEqual({ name: "Updated Dragon" });
      expect(callData).not.toHaveProperty("hitPoints");
    });

    it("returns the updated stat block", async () => {
      const updated = { id: "m1", name: "Ancient Red Dragon" };
      (deps.prisma.monster.update as ReturnType<typeof vi.fn>).mockResolvedValue(updated);

      const result = await updateStatBlock(deps, "m1", { name: "Ancient Red Dragon" });

      expect(result).toEqual(updated);
    });
  });

  describe("deleteStatBlock", () => {
    it("routes the write through the operation queue", async () => {
      (deps.prisma.monster.delete as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "m1" });

      await deleteStatBlock(deps, "m1");

      expect(deps.queue.enqueue).toHaveBeenCalledTimes(1);
    });

    it("calls prisma delete with correct id", async () => {
      (deps.prisma.monster.delete as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "m1" });

      await deleteStatBlock(deps, "m1");

      expect(deps.prisma.monster.delete).toHaveBeenCalledWith({
        where: { id: "m1" },
      });
    });

    it("returns the deleted stat block", async () => {
      const deleted = { id: "m1", name: "Goblin" };
      (deps.prisma.monster.delete as ReturnType<typeof vi.fn>).mockResolvedValue(deleted);

      const result = await deleteStatBlock(deps, "m1");

      expect(result).toEqual(deleted);
    });
  });
});
