import { PrismaClient } from "@prisma/client";

/**
 * Singleton PrismaClient instance.
 * Configured with error and warn logging.
 */
export const prisma = new PrismaClient({
  log: ["error", "warn"],
});

/**
 * Connects the PrismaClient and applies SQLite-specific PRAGMAs
 * when DATABASE_URL starts with "file:" (indicating SQLite).
 * For MySQL connections, no PRAGMAs are applied.
 */
export async function initializePrisma(): Promise<void> {
  await prisma.$connect();

  const databaseUrl = process.env["DATABASE_URL"] ?? "";

  if (databaseUrl.startsWith("file:")) {
    await prisma.$executeRawUnsafe("PRAGMA foreign_keys = ON");
    await prisma.$executeRawUnsafe("PRAGMA synchronous = FULL");
  }
}
