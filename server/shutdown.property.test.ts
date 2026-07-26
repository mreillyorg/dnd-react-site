/**
 * Property-based test for graceful shutdown drain.
 *
 * **Validates: Requirements 4.7**
 *
 * Property 6: Graceful shutdown drains all queued writes.
 * - Generates N (1–20) async write operations with small delays.
 * - Enqueues them into a real SerialOperationQueue.
 * - Calls gracefulShutdown with { exit: false }.
 * - Asserts all N operations complete BEFORE prismaDisconnect is called.
 */

import { describe, it, vi } from 'vitest';
import * as fc from 'fast-check';

import { gracefulShutdown } from './shutdown.ts';
import type { ShutdownDependencies } from './shutdown.ts';
import { SerialOperationQueue } from './db/operationQueue.ts';

describe('Graceful Shutdown Property Tests', () => {
  it('Property 6: graceful shutdown drains all queued writes before prismaDisconnect', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 20 }),
        async (n) => {
          // Track completions and disconnect timing
          const completedOps: number[] = [];
          let disconnectCalledAt = -1;
          let operationCounter = 0;

          // Create a real SerialOperationQueue (large enough to hold N ops)
          const queue = new SerialOperationQueue(100, 5000);

          // Enqueue N operations that each record their completion order
          const promises: Promise<void>[] = [];
          for (let i = 0; i < n; i++) {
            const opIndex = i;
            promises.push(
              queue.enqueue(async () => {
                // Small delay to simulate async work
                await new Promise((resolve) => setTimeout(resolve, 1));
                operationCounter++;
                completedOps.push(opIndex);
              }),
            );
          }

          // Build shutdown dependencies with the real queue
          const deps: ShutdownDependencies = {
            httpServer: {
              close: vi.fn(),
            } as unknown as ShutdownDependencies['httpServer'],
            queue,
            apolloServer: {
              stop: vi.fn(async () => {}),
            } as unknown as ShutdownDependencies['apolloServer'],
            prismaDisconnect: vi.fn(async () => {
              disconnectCalledAt = operationCounter;
            }),
          };

          // Call graceful shutdown — it should drain the queue before disconnecting
          await gracefulShutdown('SIGTERM', deps, { exit: false });

          // Wait for all enqueued operation promises to settle (they should already be done)
          await Promise.all(promises);

          // Assert: all N operations completed
          if (completedOps.length !== n) {
            return false;
          }

          // Assert: prismaDisconnect was called after all operations completed
          if (disconnectCalledAt !== n) {
            return false;
          }

          return true;
        },
      ),
      { numRuns: 100 },
    );
  }, 60_000); // Allow up to 60s for 100 property-based test runs with delays
});
