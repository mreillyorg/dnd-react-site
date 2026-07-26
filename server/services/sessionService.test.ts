import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createSession,
  getSessionById,
  listSessionsByCampaign,
  updateSession,
  deleteSession,
  type ServiceContext,
} from "./sessionService.ts";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

function createMockContext(): ServiceContext {
  const prisma = {
    session: {
      create: vi.fn().mockResolvedValue({ id: "sess-1", sessionNumber: 1 }),
      findUnique: vi.fn().mockResolvedValue({ id: "sess-1", sessionNumber: 1 }),
      findMany: vi.fn().mockResolvedValue([{ id: "sess-1", sessionNumber: 1 }]),
      update: vi.fn().mockResolvedValue({ id: "sess-1", sessionNumber: 2 }),
      delete: vi.fn().mockResolvedValue({ id: "sess-1" }),
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

describe("sessionService", () => {
  let ctx: ServiceContext;
  const testDate = new Date("2024-06-15T18:00:00Z");

  beforeEach(() => {
    ctx = createMockContext();
  });

  describe("createSession", () => {
    it("creates a session through the queue", async () => {
      const result = await createSession(ctx, {
        dmId: "user-1",
        sessionNumber: 1,
        title: "The Beginning",
        realWorldDate: testDate,
        inGameDate: "Day 1, Year 1492 DR",
        duration: 3.5,
        campaignId: "camp-1",
      });

      expect(ctx.queue.enqueue).toHaveBeenCalledOnce();
      expect(ctx.prisma.session.create).toHaveBeenCalledWith({
        data: {
          sessionNumber: 1,
          title: "The Beginning",
          realWorldDate: testDate,
          inGameDate: "Day 1, Year 1492 DR",
          duration: 3.5,
          campaignId: "camp-1",
          dmId: "user-1",
        },
      });
      expect(result).toEqual({ id: "sess-1", sessionNumber: 1 });
    });

    it("omits optional fields when null", async () => {
      await createSession(ctx, {
        dmId: "user-1",
        sessionNumber: 1,
        realWorldDate: testDate,
        title: null,
        inGameDate: null,
        duration: null,
        campaignId: "camp-1",
      });

      expect(ctx.prisma.session.create).toHaveBeenCalledWith({
        data: {
          sessionNumber: 1,
          realWorldDate: testDate,
          campaignId: "camp-1",
          dmId: "user-1",
        },
      });
    });
  });

  describe("getSessionById", () => {
    it("reads directly through Prisma without the queue", async () => {
      const result = await getSessionById(ctx, "sess-1");

      expect(ctx.queue.enqueue).not.toHaveBeenCalled();
      expect(ctx.prisma.session.findUnique).toHaveBeenCalledWith({
        where: { id: "sess-1" },
      });
      expect(result).toEqual({ id: "sess-1", sessionNumber: 1 });
    });
  });

  describe("listSessionsByCampaign", () => {
    it("reads directly through Prisma without the queue", async () => {
      const result = await listSessionsByCampaign(ctx, "camp-1");

      expect(ctx.queue.enqueue).not.toHaveBeenCalled();
      expect(ctx.prisma.session.findMany).toHaveBeenCalledWith({
        where: { campaignId: "camp-1" },
      });
      expect(result).toEqual([{ id: "sess-1", sessionNumber: 1 }]);
    });
  });

  describe("updateSession", () => {
    it("updates a session through the queue", async () => {
      const newDate = new Date("2024-07-01T18:00:00Z");
      const result = await updateSession(ctx, "sess-1", {
        sessionNumber: 2,
        title: "Chapter Two",
        realWorldDate: newDate,
      });

      expect(ctx.queue.enqueue).toHaveBeenCalledOnce();
      expect(ctx.prisma.session.update).toHaveBeenCalledWith({
        where: { id: "sess-1" },
        data: {
          sessionNumber: 2,
          title: "Chapter Two",
          realWorldDate: newDate,
        },
      });
      expect(result).toEqual({ id: "sess-1", sessionNumber: 2 });
    });

    it("handles partial updates with only some fields", async () => {
      await updateSession(ctx, "sess-1", {
        duration: 4.0,
      });

      expect(ctx.prisma.session.update).toHaveBeenCalledWith({
        where: { id: "sess-1" },
        data: {
          duration: 4.0,
        },
      });
    });

    it("passes null values for nullable fields to clear them", async () => {
      await updateSession(ctx, "sess-1", {
        title: null,
        inGameDate: null,
        duration: null,
      });

      expect(ctx.prisma.session.update).toHaveBeenCalledWith({
        where: { id: "sess-1" },
        data: {
          title: null,
          inGameDate: null,
          duration: null,
        },
      });
    });
  });

  describe("deleteSession", () => {
    it("deletes a session through the queue", async () => {
      const result = await deleteSession(ctx, "sess-1");

      expect(ctx.queue.enqueue).toHaveBeenCalledOnce();
      expect(ctx.prisma.session.delete).toHaveBeenCalledWith({
        where: { id: "sess-1" },
      });
      expect(result).toEqual({ id: "sess-1" });
    });
  });
});
