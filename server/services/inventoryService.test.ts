import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  addItemToInventory,
  removeItemFromInventory,
  updateItemSlot,
  getInventoryByCharacter,
} from "./inventoryService.ts";
import type { ServiceDeps } from "./inventoryService.ts";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

function createMockDeps(): ServiceDeps {
  const mockPrisma = {
    itemAssignment: {
      create: vi.fn(),
      delete: vi.fn(),
      update: vi.fn(),
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

describe("inventoryService", () => {
  let deps: ServiceDeps;

  beforeEach(() => {
    deps = createMockDeps();
  });

  describe("addItemToInventory", () => {
    it("routes the write through the operation queue", async () => {
      (deps.prisma.itemAssignment.create as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "ia1" });

      await addItemToInventory(deps, { itemId: "item1", characterId: "char1" });

      expect(deps.queue.enqueue).toHaveBeenCalledTimes(1);
    });

    it("passes correct data to prisma create", async () => {
      (deps.prisma.itemAssignment.create as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "ia1" });

      await addItemToInventory(deps, {
        itemId: "item1",
        characterId: "char1",
        quantity: 3,
        equipped: true,
        attuned: true,
        identified: false,
      });

      expect(deps.prisma.itemAssignment.create).toHaveBeenCalledWith({
        data: {
          itemId: "item1",
          characterId: "char1",
          quantity: 3,
          equipped: true,
          attuned: true,
          identified: false,
        },
      });
    });

    it("defaults quantity to 1, equipped/attuned to false, identified to true", async () => {
      (deps.prisma.itemAssignment.create as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "ia1" });

      await addItemToInventory(deps, { itemId: "item1", characterId: "char1" });

      expect(deps.prisma.itemAssignment.create).toHaveBeenCalledWith({
        data: {
          itemId: "item1",
          characterId: "char1",
          quantity: 1,
          equipped: false,
          attuned: false,
          identified: true,
        },
      });
    });

    it("returns the created item assignment", async () => {
      const mockAssignment = { id: "ia1", itemId: "item1", characterId: "char1" };
      (deps.prisma.itemAssignment.create as ReturnType<typeof vi.fn>).mockResolvedValue(mockAssignment);

      const result = await addItemToInventory(deps, { itemId: "item1", characterId: "char1" });

      expect(result).toEqual(mockAssignment);
    });
  });

  describe("removeItemFromInventory", () => {
    it("routes the write through the operation queue", async () => {
      (deps.prisma.itemAssignment.delete as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "ia1" });

      await removeItemFromInventory(deps, "ia1");

      expect(deps.queue.enqueue).toHaveBeenCalledTimes(1);
    });

    it("calls prisma delete with correct id", async () => {
      (deps.prisma.itemAssignment.delete as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "ia1" });

      await removeItemFromInventory(deps, "ia1");

      expect(deps.prisma.itemAssignment.delete).toHaveBeenCalledWith({
        where: { id: "ia1" },
      });
    });

    it("returns the deleted item assignment", async () => {
      const deleted = { id: "ia1", itemId: "item1" };
      (deps.prisma.itemAssignment.delete as ReturnType<typeof vi.fn>).mockResolvedValue(deleted);

      const result = await removeItemFromInventory(deps, "ia1");

      expect(result).toEqual(deleted);
    });
  });

  describe("updateItemSlot", () => {
    it("routes the write through the operation queue", async () => {
      (deps.prisma.itemAssignment.update as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "ia1" });

      await updateItemSlot(deps, "ia1", { quantity: 5 });

      expect(deps.queue.enqueue).toHaveBeenCalledTimes(1);
    });

    it("passes only provided fields to prisma update", async () => {
      (deps.prisma.itemAssignment.update as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "ia1" });

      await updateItemSlot(deps, "ia1", { equipped: true, attuned: true });

      expect(deps.prisma.itemAssignment.update).toHaveBeenCalledWith({
        where: { id: "ia1" },
        data: { equipped: true, attuned: true },
      });
    });

    it("does not include undefined fields in update data", async () => {
      (deps.prisma.itemAssignment.update as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "ia1" });

      await updateItemSlot(deps, "ia1", { quantity: 2 });

      const callData = (deps.prisma.itemAssignment.update as ReturnType<typeof vi.fn>).mock.calls[0][0].data;
      expect(callData).toEqual({ quantity: 2 });
      expect(callData).not.toHaveProperty("equipped");
      expect(callData).not.toHaveProperty("attuned");
      expect(callData).not.toHaveProperty("identified");
    });

    it("returns the updated item assignment", async () => {
      const updated = { id: "ia1", quantity: 5 };
      (deps.prisma.itemAssignment.update as ReturnType<typeof vi.fn>).mockResolvedValue(updated);

      const result = await updateItemSlot(deps, "ia1", { quantity: 5 });

      expect(result).toEqual(updated);
    });
  });

  describe("getInventoryByCharacter", () => {
    it("reads directly through prisma (not through queue)", async () => {
      (deps.prisma.itemAssignment.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);

      await getInventoryByCharacter(deps, "char1");

      expect(deps.queue.enqueue).not.toHaveBeenCalled();
    });

    it("queries by characterId with item included", async () => {
      (deps.prisma.itemAssignment.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);

      await getInventoryByCharacter(deps, "char1");

      expect(deps.prisma.itemAssignment.findMany).toHaveBeenCalledWith({
        where: { characterId: "char1" },
        include: { item: true },
      });
    });

    it("returns all inventory items for the character", async () => {
      const items = [
        { id: "ia1", itemId: "item1", characterId: "char1", item: { name: "Sword" } },
        { id: "ia2", itemId: "item2", characterId: "char1", item: { name: "Shield" } },
      ];
      (deps.prisma.itemAssignment.findMany as ReturnType<typeof vi.fn>).mockResolvedValue(items);

      const result = await getInventoryByCharacter(deps, "char1");

      expect(result).toEqual(items);
    });

    it("returns empty array when character has no items", async () => {
      (deps.prisma.itemAssignment.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);

      const result = await getInventoryByCharacter(deps, "char-empty");

      expect(result).toEqual([]);
    });
  });
});
