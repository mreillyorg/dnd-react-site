/**
 * Property 4: Operation_Queue rejects operations when at capacity
 *
 * Validates: Requirements 4.3, 4.4
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';
import { createOperationQueue, QueueFullError } from './operationQueue.ts';

describe('Property 4: Operation_Queue rejects operations when at capacity', () => {
  beforeEach(() => {
    vi.spyOn(console, 'debug').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('rejects with QUEUE_FULL when queue is at maxDepth', async () => {
    /**
     * Validates: Requirements 4.3, 4.4
     */
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 50 }),
        async (maxDepth) => {
          const queue = createOperationQueue(maxDepth, 500);

          // Fill the queue to capacity with never-resolving operations
          for (let i = 0; i < maxDepth; i++) {
            queue.enqueue(() => new Promise(() => {}));
          }

          // Assert the queue is at capacity
          expect(queue.pendingCount).toBe(maxDepth);

          // The next enqueue should reject with QueueFullError
          try {
            await queue.enqueue(() => new Promise(() => {}));
            expect.fail('Expected enqueue to reject with QueueFullError');
          } catch (err) {
            expect(err).toBeInstanceOf(QueueFullError);
            expect((err as QueueFullError).code).toBe('QUEUE_FULL');
          }

          // Assert pendingCount did NOT increase beyond maxDepth
          expect(queue.pendingCount).toBe(maxDepth);
        },
      ),
    );
  });
});
