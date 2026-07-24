/**
 * Property-based test for Operation_Queue serialisation order.
 *
 * **Validates: Requirements 4.1**
 *
 * Property 3: Operation_Queue serialises writes in FIFO order under SQLite.
 * - Generates arrays of 2–20 async operations with small random delays.
 * - Submits them all concurrently to a SerialOperationQueue.
 * - Asserts no two operations overlap in time (serial execution).
 * - Asserts the execution order matches the submission order (FIFO).
 */

import { createOperationQueue } from './operationQueue.ts';
import * as fc from 'fast-check';

describe('OperationQueue Property Tests', () => {
  it('Property 3: serialises writes in FIFO order under SQLite', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate an array of 2-20 delay values (0-5ms each) to simulate async work
        fc.array(fc.integer({ min: 0, max: 5 }), { minLength: 2, maxLength: 20 }),
        async (delays) => {
          const queue = createOperationQueue(100, 5000);

          // Track start/end timestamps and execution order
          const timings: { index: number; start: number; end: number }[] = [];

          // Submit all operations concurrently
          const promises = delays.map((delayMs, index) =>
            queue.enqueue(async () => {
              const start = performance.now();
              if (delayMs > 0) {
                await new Promise((resolve) => setTimeout(resolve, delayMs));
              }
              const end = performance.now();
              timings.push({ index, start, end });
              return index;
            }),
          );

          await Promise.all(promises);

          // Assert 1: Execution order matches submission order (FIFO)
          for (let i = 0; i < timings.length; i++) {
            if (timings[i].index !== i) {
              return false;
            }
          }

          // Assert 2: No two operations overlap in time
          // Since they execute in order, each operation's start should be >= previous end
          for (let i = 1; i < timings.length; i++) {
            if (timings[i].start < timings[i - 1].end) {
              return false;
            }
          }

          return true;
        },
      ),
      { numRuns: 100 },
    );
  }, 30_000); // Allow up to 30s for 100 property-based test runs
});
