import type { PrismaClient } from "@prisma/client";
import type { OperationQueue } from "../db/operationQueue.ts";

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
  prisma: PrismaClient;
  queue: OperationQueue;
}

// ---------------------------------------------------------------------------
// User Service Functions
// ---------------------------------------------------------------------------

/**
 * Creates a new user. The write goes through the operation queue and is
 * wrapped in a Prisma transaction for consistency.
 */
export async function createUser(
  deps: ServiceDeps,
  input: CreateUserInput,
) {
  return deps.queue.enqueue(() =>
    deps.prisma.$transaction(async (tx) => {
      return tx.user.create({
        data: {
          email: input.email,
          passwordHash: input.password, // Hashing is the caller's responsibility
          name: input.name,
          themeMode: input.themeMode ?? "SYSTEM",
        },
      });
    }),
  );
}

/**
 * Retrieves a user by their unique ID.
 * Reads go directly through Prisma (no queue needed).
 */
export async function getUserById(deps: ServiceDeps, id: string) {
  return deps.prisma.user.findUnique({
    where: { id },
  });
}

/**
 * Retrieves a user by their email address.
 * Reads go directly through Prisma (no queue needed).
 */
export async function getUserByEmail(deps: ServiceDeps, email: string) {
  return deps.prisma.user.findUnique({
    where: { email },
  });
}
