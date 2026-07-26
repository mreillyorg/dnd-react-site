import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createCampaign,
  getCampaignById,
  listCampaignsByOwner,
  updateCampaign,
  deleteCampaign,
  type ServiceContext,
} from "./campaignService.ts";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

function createMockContext(): ServiceContext {
  const prisma = {
    campaign: {
      create: vi.fn().mockResolvedValue({ id: "camp-1", name: "Test Campaign" }),
      findUnique: vi.fn().mockResolvedValue({ id: "camp-1", name: "Test Campaign" }),
      findMany: vi.fn().mockResolvedValue([{ id: "camp-1", name: "Test Campaign" }]),
      update: vi.fn().mockResolvedValue({ id: "camp-1", name: "Updated" }),
      delete: vi.fn().mockResolvedValue({ id: "camp-1" }),
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

describe("campaignService", () => {
  let ctx: ServiceContext;

  beforeEach(() => {
    ctx = createMockContext();
  });

  describe("createCampaign", () => {
    it("creates a campaign through the queue", async () => {
      const result = await createCampaign(ctx, {
        ownerId: "user-1",
        name: "Dragon's Lair",
        description: "A perilous campaign",
        setting: "Forgotten Realms",
      });

      expect(ctx.queue.enqueue).toHaveBeenCalledOnce();
      expect(ctx.prisma.campaign.create).toHaveBeenCalledWith({
        data: {
          name: "Dragon's Lair",
          description: "A perilous campaign",
          setting: "Forgotten Realms",
          ownerId: "user-1",
        },
      });
      expect(result).toEqual({ id: "camp-1", name: "Test Campaign" });
    });

    it("omits optional fields when null", async () => {
      await createCampaign(ctx, {
        ownerId: "user-1",
        name: "Bare Campaign",
        description: null,
        setting: null,
        status: null,
      });

      expect(ctx.prisma.campaign.create).toHaveBeenCalledWith({
        data: {
          name: "Bare Campaign",
          ownerId: "user-1",
        },
      });
    });

    it("passes status when provided", async () => {
      await createCampaign(ctx, {
        ownerId: "user-1",
        name: "Active Campaign",
        status: "ACTIVE",
      });

      expect(ctx.prisma.campaign.create).toHaveBeenCalledWith({
        data: {
          name: "Active Campaign",
          status: "ACTIVE",
          ownerId: "user-1",
        },
      });
    });
  });

  describe("getCampaignById", () => {
    it("reads directly through Prisma without the queue", async () => {
      const result = await getCampaignById(ctx, "camp-1");

      expect(ctx.queue.enqueue).not.toHaveBeenCalled();
      expect(ctx.prisma.campaign.findUnique).toHaveBeenCalledWith({
        where: { id: "camp-1" },
      });
      expect(result).toEqual({ id: "camp-1", name: "Test Campaign" });
    });
  });

  describe("listCampaignsByOwner", () => {
    it("reads directly through Prisma without the queue", async () => {
      const result = await listCampaignsByOwner(ctx, "user-1");

      expect(ctx.queue.enqueue).not.toHaveBeenCalled();
      expect(ctx.prisma.campaign.findMany).toHaveBeenCalledWith({
        where: { ownerId: "user-1" },
      });
      expect(result).toEqual([{ id: "camp-1", name: "Test Campaign" }]);
    });
  });

  describe("updateCampaign", () => {
    it("updates a campaign through the queue", async () => {
      const result = await updateCampaign(ctx, "camp-1", {
        name: "Updated Name",
        status: "ACTIVE",
      });

      expect(ctx.queue.enqueue).toHaveBeenCalledOnce();
      expect(ctx.prisma.campaign.update).toHaveBeenCalledWith({
        where: { id: "camp-1" },
        data: {
          name: "Updated Name",
          status: "ACTIVE",
        },
      });
      expect(result).toEqual({ id: "camp-1", name: "Updated" });
    });

    it("handles partial updates with only some fields", async () => {
      await updateCampaign(ctx, "camp-1", {
        description: "New description",
      });

      expect(ctx.prisma.campaign.update).toHaveBeenCalledWith({
        where: { id: "camp-1" },
        data: {
          description: "New description",
        },
      });
    });

    it("passes null values for nullable fields to clear them", async () => {
      await updateCampaign(ctx, "camp-1", {
        description: null,
        setting: null,
      });

      expect(ctx.prisma.campaign.update).toHaveBeenCalledWith({
        where: { id: "camp-1" },
        data: {
          description: null,
          setting: null,
        },
      });
    });
  });

  describe("deleteCampaign", () => {
    it("deletes a campaign through the queue", async () => {
      const result = await deleteCampaign(ctx, "camp-1");

      expect(ctx.queue.enqueue).toHaveBeenCalledOnce();
      expect(ctx.prisma.campaign.delete).toHaveBeenCalledWith({
        where: { id: "camp-1" },
      });
      expect(result).toEqual({ id: "camp-1" });
    });
  });
});
