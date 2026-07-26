/**
 * Graceful shutdown handler.
 *
 * Extracted from app.ts so that the shutdown sequence is independently testable:
 *   1. Stop accepting new HTTP connections (httpServer.close())
 *   2. Drain the operation queue (all queued writes must complete)
 *   3. Stop Apollo Server
 *   4. Disconnect Prisma
 *
 * The property test (12.3) verifies that all queued writes drain before
 * prisma.$disconnect() is called.
 */

import type http from 'node:http';

import type { ApolloServer } from '@apollo/server';

import type { OperationQueue } from './db/operationQueue.ts';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ShutdownDependencies {
  httpServer: http.Server;
  queue: OperationQueue;
  apolloServer: ApolloServer;
  prismaDisconnect: () => Promise<void>;
}

export interface ShutdownOptions {
  /** If true, calls process.exit(0) after shutdown completes. Defaults to true. */
  exit?: boolean;
}

// ---------------------------------------------------------------------------
// Graceful shutdown function
// ---------------------------------------------------------------------------

/**
 * Performs a graceful shutdown sequence:
 * 1. Stops accepting new HTTP connections
 * 2. Drains the operation queue (completes all pending writes)
 * 3. Stops Apollo Server
 * 4. Disconnects Prisma
 *
 * @param signal - The signal name that triggered shutdown (for logging)
 * @param deps - The server components to shut down
 * @param options - Additional options (e.g., whether to call process.exit)
 */
export async function gracefulShutdown(
  signal: string,
  deps: ShutdownDependencies,
  options: ShutdownOptions = {},
): Promise<void> {
  const { httpServer, queue, apolloServer, prismaDisconnect } = deps;
  const { exit = true } = options;

  console.log(`[shutdown] Received ${signal}. Starting graceful shutdown...`);

  // 1. Stop accepting new connections
  httpServer.close();

  // 2. Drain the operation queue (complete all pending writes)
  await queue.drain();

  // 3. Stop Apollo Server
  await apolloServer.stop();

  // 4. Disconnect Prisma
  await prismaDisconnect();

  console.log('[shutdown] Shutdown complete.');

  if (exit) {
    process.exit(0);
  }
}
