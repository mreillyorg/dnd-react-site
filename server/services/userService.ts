import { eq } from "drizzle-orm";

import type { DrizzleDb } from "../db/drizzle.ts";
import type { OperationQueue } from "../db/operationQueue.ts";
import { users } from "../db/schema.ts";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CreateUserInput {
  email: string;
  password: string;
  name?: string;
  themeMode?: string;
}

export interface ServiceDeps {
  db: DrizzleDb;
  queue: OperationQueue;
}

// ---------------------------------------------------------------------------
// User Service Functions
// ---------------------------------------------------------------------------

/**
 * Creates a new user. The write goes through the operation queue.
 */
export async function createUser(
  deps: ServiceDeps,
  input: CreateUserInput,
) {
  return deps.queue.enqueue(() => {
    const [created] = deps.db
      .insert(users)
      .values({
        email: input.email,
        name: input.name,
        themeMode: input.themeMode ?? "SYSTEM",
      })
      .returning()
      .all();
    return Promise.resolve(created);
  });
}

/**
 * Retrieves a user by their unique ID.
 * Reads go directly through Drizzle (no queue needed).
 */
export async function getUserById(deps: ServiceDeps, id: string) {
  return deps.db.query.users.findFirst({
    where: eq(users.id, id),
  }) ?? null;
}

/**
 * Retrieves a user by their email address.
 * Reads go directly through Drizzle (no queue needed).
 */
export async function getUserByEmail(deps: ServiceDeps, email: string) {
  return deps.db.query.users.findFirst({
    where: eq(users.email, email),
  }) ?? null;
}
