import type { PrismaClient } from "@prisma/client";
import type { OperationQueue } from "../db/operationQueue.ts";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ServiceContext {
  prisma: PrismaClient;
  queue: OperationQueue;
}

export interface CreateCampaignInput {
  name: string;
  description?: string | null;
  setting?: string | null;
  status?: string | null;
}

export interface UpdateCampaignInput {
  name?: string | null;
  description?: string | null;
  setting?: string | null;
  status?: string | null;
}

// ---------------------------------------------------------------------------
// Service Functions
// ---------------------------------------------------------------------------

/**
 * Creates a new campaign. The ownerId is provided by the resolver (from currentUser).
 * Write goes through the queue for SQLite single-writer safety.
 */
export function createCampaign(
  ctx: ServiceContext,
  input: CreateCampaignInput & { ownerId: string },
) {
  const { ownerId, name, description, setting, status } = input;

  return ctx.queue.enqueue(() =>
    ctx.prisma.campaign.create({
      data: {
        name,
        description: description ?? undefined,
        setting: setting ?? undefined,
        status: status ?? undefined,
        ownerId,
      },
    }),
  );
}

/**
 * Retrieves a campaign by its ID.
 * Reads go directly through Prisma (no queue needed).
 */
export function getCampaignById(ctx: ServiceContext, id: string) {
  return ctx.prisma.campaign.findUnique({ where: { id } });
}

/**
 * Lists all campaigns owned by a specific user.
 * Reads go directly through Prisma (no queue needed).
 */
export function listCampaignsByOwner(ctx: ServiceContext, ownerId: string) {
  return ctx.prisma.campaign.findMany({ where: { ownerId } });
}

/**
 * Updates an existing campaign.
 * Write goes through the queue for SQLite single-writer safety.
 */
export function updateCampaign(
  ctx: ServiceContext,
  id: string,
  input: UpdateCampaignInput,
) {
  return ctx.queue.enqueue(() =>
    ctx.prisma.campaign.update({
      where: { id },
      data: {
        ...(input.name !== undefined && input.name !== null && { name: input.name }),
        ...(input.description !== undefined && { description: input.description }),
        ...(input.setting !== undefined && { setting: input.setting }),
        ...(input.status !== undefined && input.status !== null && { status: input.status }),
      },
    }),
  );
}

/**
 * Deletes a campaign by its ID.
 * Write goes through the queue for SQLite single-writer safety.
 */
export function deleteCampaign(ctx: ServiceContext, id: string) {
  return ctx.queue.enqueue(() =>
    ctx.prisma.campaign.delete({ where: { id } }),
  );
}
