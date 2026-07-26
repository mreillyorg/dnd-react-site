import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createCharacter,
  getCharacterById,
  listCharactersByUser,
  updateCharacter,
  deleteCharacter,
} from "./characterService.ts";
import type { ServiceDeps } from "./characterService.ts";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

function createMockDeps(): ServiceDeps {
  const mockPrisma = {
    $transaction: vi.fn((fn: (tx: any) => Promise<unknown>) => fn(mockTx())),
    character: {
      findUnique: vi.fn(),
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

function mockTx() {
  return {
    character: {
      create: vi.fn().mockResolvedValue({ id: "c1" }),
      update: vi.fn().mockResolvedValue({ id: "c1" }),
      delete: vi.fn().mockResolvedValue({ id: "c1" }),
    },
  };
}

const validInput = {
  name: "Aragorn",
  class: "Ranger",
  race: "Human",
  maxHp: 50,
  currentHp: 50,
  armorClass: 16,
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("characterService", () => {
  let deps: ServiceDeps;

  beforeEach(() => {
    deps = createMockDeps();
  });

  describe("createCharacter", () => {
    it("routes the write through the operation queue", async () => {
      const createFn = vi.fn().mockResolvedValue({ id: "c1", ...validInput, itemAssignments: [] });
      (deps.prisma.$transaction as ReturnType<typeof vi.fn>).mockImplementation(
        async (fn: (tx: any) => Promise<unknown>) => {
          return fn({ character: { create: createFn } });
        },
      );

      await createCharacter(deps, "u1", validInput);

      expect(deps.queue.enqueue).toHaveBeenCalledTimes(1);
    });

    it("wraps creation in a $transaction", async () => {
      const createFn = vi.fn().mockResolvedValue({ id: "c1", ...validInput, itemAssignments: [] });
      (deps.prisma.$transaction as ReturnType<typeof vi.fn>).mockImplementation(
        async (fn: (tx: any) => Promise<unknown>) => {
          return fn({ character: { create: createFn } });
        },
      );

      await createCharacter(deps, "u1", validInput);

      expect(deps.prisma.$transaction).toHaveBeenCalledTimes(1);
    });

    it("passes correct data including userId and defaults", async () => {
      const createFn = vi.fn().mockResolvedValue({ id: "c1", itemAssignments: [] });
      (deps.prisma.$transaction as ReturnType<typeof vi.fn>).mockImplementation(
        async (fn: (tx: any) => Promise<unknown>) => {
          return fn({ character: { create: createFn } });
        },
      );

      await createCharacter(deps, "user-123", validInput);

      expect(createFn).toHaveBeenCalledWith({
        data: {
          name: "Aragorn",
          level: 1,
          class: "Ranger",
          race: "Human",
          strength: 10,
          dexterity: 10,
          constitution: 10,
          intelligence: 10,
          wisdom: 10,
          charisma: 10,
          maxHp: 50,
          currentHp: 50,
          tempHp: 0,
          armorClass: 16,
          userId: "user-123",
          campaignId: undefined,
        },
        include: { itemAssignments: true },
      });
    });

    it("uses provided optional values instead of defaults", async () => {
      const createFn = vi.fn().mockResolvedValue({ id: "c1", itemAssignments: [] });
      (deps.prisma.$transaction as ReturnType<typeof vi.fn>).mockImplementation(
        async (fn: (tx: any) => Promise<unknown>) => {
          return fn({ character: { create: createFn } });
        },
      );

      await createCharacter(deps, "u1", {
        ...validInput,
        level: 5,
        strength: 18,
        dexterity: 14,
        tempHp: 5,
        campaignId: "camp-1",
      });

      expect(createFn).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            level: 5,
            strength: 18,
            dexterity: 14,
            tempHp: 5,
            campaignId: "camp-1",
          }),
        }),
      );
    });

    it("includes itemAssignments in the result", async () => {
      const createFn = vi.fn().mockResolvedValue({ id: "c1", itemAssignments: [] });
      (deps.prisma.$transaction as ReturnType<typeof vi.fn>).mockImplementation(
        async (fn: (tx: any) => Promise<unknown>) => {
          return fn({ character: { create: createFn } });
        },
      );

      await createCharacter(deps, "u1", validInput);

      expect(createFn).toHaveBeenCalledWith(
        expect.objectContaining({ include: { itemAssignments: true } }),
      );
    });
  });

  describe("getCharacterById", () => {
    it("reads directly through prisma (not through queue)", async () => {
      (deps.prisma.character.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "c1" });

      await getCharacterById(deps, "c1");

      expect(deps.queue.enqueue).not.toHaveBeenCalled();
      expect(deps.prisma.character.findUnique).toHaveBeenCalledWith({
        where: { id: "c1" },
        include: { itemAssignments: true },
      });
    });

    it("returns null when character not found", async () => {
      (deps.prisma.character.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      const result = await getCharacterById(deps, "nonexistent");

      expect(result).toBeNull();
    });
  });

  describe("listCharactersByUser", () => {
    it("reads directly through prisma (not through queue)", async () => {
      (deps.prisma.character.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);

      await listCharactersByUser(deps, "u1");

      expect(deps.queue.enqueue).not.toHaveBeenCalled();
      expect(deps.prisma.character.findMany).toHaveBeenCalledWith({
        where: { userId: "u1" },
        include: { itemAssignments: true },
      });
    });

    it("returns array of characters", async () => {
      const characters = [{ id: "c1", name: "Aragorn" }, { id: "c2", name: "Legolas" }];
      (deps.prisma.character.findMany as ReturnType<typeof vi.fn>).mockResolvedValue(characters);

      const result = await listCharactersByUser(deps, "u1");

      expect(result).toEqual(characters);
    });
  });

  describe("updateCharacter", () => {
    it("routes the write through the operation queue", async () => {
      const updateFn = vi.fn().mockResolvedValue({ id: "c1", name: "Updated" });
      (deps.prisma.$transaction as ReturnType<typeof vi.fn>).mockImplementation(
        async (fn: (tx: any) => Promise<unknown>) => {
          return fn({ character: { update: updateFn } });
        },
      );

      await updateCharacter(deps, "c1", { name: "Updated" });

      expect(deps.queue.enqueue).toHaveBeenCalledTimes(1);
    });

    it("wraps update in a $transaction", async () => {
      const updateFn = vi.fn().mockResolvedValue({ id: "c1" });
      (deps.prisma.$transaction as ReturnType<typeof vi.fn>).mockImplementation(
        async (fn: (tx: any) => Promise<unknown>) => {
          return fn({ character: { update: updateFn } });
        },
      );

      await updateCharacter(deps, "c1", { name: "Updated" });

      expect(deps.prisma.$transaction).toHaveBeenCalledTimes(1);
    });

    it("only includes provided fields in update data", async () => {
      const updateFn = vi.fn().mockResolvedValue({ id: "c1" });
      (deps.prisma.$transaction as ReturnType<typeof vi.fn>).mockImplementation(
        async (fn: (tx: any) => Promise<unknown>) => {
          return fn({ character: { update: updateFn } });
        },
      );

      await updateCharacter(deps, "c1", { name: "New Name", level: 5 });

      expect(updateFn).toHaveBeenCalledWith({
        where: { id: "c1" },
        data: { name: "New Name", level: 5 },
        include: { itemAssignments: true },
      });
    });

    it("does not include fields that are undefined", async () => {
      const updateFn = vi.fn().mockResolvedValue({ id: "c1" });
      (deps.prisma.$transaction as ReturnType<typeof vi.fn>).mockImplementation(
        async (fn: (tx: any) => Promise<unknown>) => {
          return fn({ character: { update: updateFn } });
        },
      );

      await updateCharacter(deps, "c1", { maxHp: 100 });

      const calledData = updateFn.mock.calls[0][0].data;
      expect(calledData).toEqual({ maxHp: 100 });
      expect(calledData).not.toHaveProperty("name");
      expect(calledData).not.toHaveProperty("level");
    });
  });

  describe("deleteCharacter", () => {
    it("routes the write through the operation queue", async () => {
      const deleteFn = vi.fn().mockResolvedValue({ id: "c1" });
      (deps.prisma.$transaction as ReturnType<typeof vi.fn>).mockImplementation(
        async (fn: (tx: any) => Promise<unknown>) => {
          return fn({ character: { delete: deleteFn } });
        },
      );

      await deleteCharacter(deps, "c1");

      expect(deps.queue.enqueue).toHaveBeenCalledTimes(1);
    });

    it("wraps delete in a $transaction", async () => {
      const deleteFn = vi.fn().mockResolvedValue({ id: "c1" });
      (deps.prisma.$transaction as ReturnType<typeof vi.fn>).mockImplementation(
        async (fn: (tx: any) => Promise<unknown>) => {
          return fn({ character: { delete: deleteFn } });
        },
      );

      await deleteCharacter(deps, "c1");

      expect(deps.prisma.$transaction).toHaveBeenCalledTimes(1);
      expect(deleteFn).toHaveBeenCalledWith({ where: { id: "c1" } });
    });
  });
});
