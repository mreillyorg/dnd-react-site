import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createEncounter,
  getEncounterById,
  listEncountersBySession,
  updateEncounter,
  deleteEncounter,
  type ServiceContext,
} from "./encounterService.ts";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

function createMockContext(): ServiceContext {
  const prisma = {
    combatEncounter: {
      create: vi.fn().mockResolvedValue({ id: "enc-1", name: "Boss Fight" }),
      findUnique: vi.fn().mockResolvedValue({ id: "enc-1", name: "Boss Fight" }),
      findMany: vi.fn().mockResolvedValue([{ id: "enc-1", name: "Boss Fight" }]),
      update: vi.fn().mockResolvedValue({ id: "enc-1", name: "Updated Encounter" }),
      delete: vi.fn().mockResolvedValue({ id: "enc-1" }),
    },
  } as unknown as ServiceContext["prisma"];

  const queue = {
    enqueue: vi.fn((fn: () => Promise<unknown>) => fn()),
    drain: vi.fn().mockResolvedValue(undefined),
    pendingCount: 0,
  } satisfies ServiceContext["queue"];

  return { prisma, queue };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("encounterService", () => {
  let ctx: ServiceContext;

  beforeEach(() => {
    ctx = createMockContext();
  });

  describe("createEncounter", () => {
    it("creates an encounter through the queue", async () => {
      const result = await createEncounter(ctx, {
        name: "Boss Fight",
        isActive: true,
        sessionId: "sess-1",
      });

      expect(ctx.queue.enqueue).toHaveBeenCalledOnce();
      expect(ctx.prisma.combatEncounter.create).toHaveBeenCalledWith({
        data: {
          name: "Boss Fight",
          isActive: true,
          sessionId: "sess-1",
        },
      });
      expect(result).toEqual({ id: "enc-1", name: "Boss Fight" });
    });

    it("omits optional fields when null", async () => {
      await createEncounter(ctx, {
        name: null,
        isActive: null,
        sessionId: null,
      });

      expect(ctx.prisma.combatEncounter.create).toHaveBeenCalledWith({
        data: {},
      });
    });

    it("creates an encounter with no input fields", async () => {
      await createEncounter(ctx, {});

      expect(ctx.prisma.combatEncounter.create).toHaveBeenCalledWith({
        data: {},
      });
    });
  });

  describe("getEncounterById", () => {
    it("reads directly through Prisma without the queue", async () => {
      const result = await getEncounterById(ctx, "enc-1");

      expect(ctx.queue.enqueue).not.toHaveBeenCalled();
      expect(ctx.prisma.combatEncounter.findUnique).toHaveBeenCalledWith({
        where: { id: "enc-1" },
      });
      expect(result).toEqual({ id: "enc-1", name: "Boss Fight" });
    });
  });

  describe("listEncountersBySession", () => {
    it("reads directly through Prisma without the queue", async () => {
      const result = await listEncountersBySession(ctx, "sess-1");

      expect(ctx.queue.enqueue).not.toHaveBeenCalled();
      expect(ctx.prisma.combatEncounter.findMany).toHaveBeenCalledWith({
        where: { sessionId: "sess-1" },
      });
      expect(result).toEqual([{ id: "enc-1", name: "Boss Fight" }]);
    });
  });

  describe("updateEncounter", () => {
    it("updates an encounter through the queue", async () => {
      const result = await updateEncounter(ctx, "enc-1", {
        name: "Updated Encounter",
        isActive: false,
        currentRound: 3,
        currentTurn: 2,
      });

      expect(ctx.queue.enqueue).toHaveBeenCalledOnce();
      expect(ctx.prisma.combatEncounter.update).toHaveBeenCalledWith({
        where: { id: "enc-1" },
        data: {
          name: "Updated Encounter",
          isActive: false,
          currentRound: 3,
          currentTurn: 2,
        },
      });
      expect(result).toEqual({ id: "enc-1", name: "Updated Encounter" });
    });

    it("handles partial updates with only some fields", async () => {
      await updateEncounter(ctx, "enc-1", {
        currentRound: 5,
      });

      expect(ctx.prisma.combatEncounter.update).toHaveBeenCalledWith({
        where: { id: "enc-1" },
        data: {
          currentRound: 5,
        },
      });
    });

    it("passes null for name to clear it", async () => {
      await updateEncounter(ctx, "enc-1", {
        name: null,
      });

      expect(ctx.prisma.combatEncounter.update).toHaveBeenCalledWith({
        where: { id: "enc-1" },
        data: {
          name: null,
        },
      });
    });
  });

  describe("deleteEncounter", () => {
    it("deletes an encounter through the queue", async () => {
      const result = await deleteEncounter(ctx, "enc-1");

      expect(ctx.queue.enqueue).toHaveBeenCalledOnce();
      expect(ctx.prisma.combatEncounter.delete).toHaveBeenCalledWith({
        where: { id: "enc-1" },
      });
      expect(result).toEqual({ id: "enc-1" });
    });
  });
});
