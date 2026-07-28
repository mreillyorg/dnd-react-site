import { PrismaClient } from "@prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import { createClient, type Client as LibSqlClient } from "@libsql/client";

/**
 * Resolves the libSQL connection URL from the DATABASE_URL env var.
 * Prisma uses "file:./dev.db" format, but libsql expects "file:dev.db"
 * or an absolute path.
 */
function resolveLibSQLUrl(databaseUrl: string): string {
  // libsql client accepts "file:<path>" but without the "./" relative prefix
  if (databaseUrl.startsWith("file:./")) {
    return `file:${databaseUrl.slice(7)}`;
  }
  return databaseUrl;
}

const databaseUrl = process.env["DATABASE_URL"] ?? "file:./dev.db";

const libsqlClient: LibSqlClient = createClient({ url: resolveLibSQLUrl(databaseUrl) });
const adapter = new PrismaLibSql(libsqlClient);

/**
 * Singleton PrismaClient instance.
 * Uses the libSQL driver adapter for SQLite connectivity in Prisma 7.
 * Configured with error and warn logging.
 */
export const prisma = new PrismaClient({
  adapter,
  log: ["error", "warn"],
});

/**
 * Connects the PrismaClient and applies SQLite-specific PRAGMAs
 * when DATABASE_URL starts with "file:" (indicating SQLite).
 * PRAGMAs are applied via the libSQL client directly since Prisma 7's
 * new client generator does not expose raw SQL methods.
 * For MySQL connections, no PRAGMAs are applied.
 */
export async function initializePrisma(): Promise<void> {
  await prisma.$connect();

  if (databaseUrl.startsWith("file:")) {
    await libsqlClient.execute("PRAGMA foreign_keys = ON");
    await libsqlClient.execute("PRAGMA synchronous = FULL");
  }
}
