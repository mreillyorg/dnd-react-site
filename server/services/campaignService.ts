import { eq } from "drizzle-orm";

import type { DrizzleDb } from "../db/drizzle.ts";
import type { OperationQueue } from "../db/operationQueue.ts";
import { campaigns } from "../db/schema.ts";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ServiceContext {
  db: DrizzleDb;
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

  return ctx.queue.enqueue(async () => {
    const [created] = await ctx.db
      .insert(campaigns)
      .values({
        name,
        description: description ?? undefined,
        setting: setting ?? undefined,
        status: status ?? undefined,
        ownerId,
      })
      .returning()
      .all();
    return created;
  });
}

/**
 * Retrieves a campaign by its ID.
 * Reads go directly through Drizzle (no queue needed).
 */
export function getCampaignById(ctx: ServiceContext, id: string) {
  return ctx.db.query.campaigns.findFirst({
    where: eq(campaigns.id, id),
  });
}

/**
 * Lists all campaigns owned by a specific user.
 * Reads go directly through Drizzle (no queue needed).
 */
export function listCampaignsByOwner(ctx: ServiceContext, ownerId: string) {
  return ctx.db.query.campaigns.findMany({
    where: eq(campaigns.ownerId, ownerId),
  });
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
  return ctx.queue.enqueue(async () => {
    const data: Record<string, unknown> = {};
    if (input.name !== undefined && input.name !== null) data.name = input.name;
    if (input.description !== undefined) data.description = input.description;
    if (input.setting !== undefined) data.setting = input.setting;
    if (input.status !== undefined && input.status !== null) data.status = input.status;

    const [updated] = await ctx.db
      .update(campaigns)
      .set(data)
      .where(eq(campaigns.id, id))
      .returning()
      .all();
    return updated;
  });
}

/**
 * Deletes a campaign by its ID.
 * Write goes through the queue for SQLite single-writer safety.
 */
export function deleteCampaign(ctx: ServiceContext, id: string) {
  return ctx.queue.enqueue(async () => {
    const [deleted] = await ctx.db
      .delete(campaigns)
      .where(eq(campaigns.id, id))
      .returning()
      .all();
    return deleted;
  });
}
