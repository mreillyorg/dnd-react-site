import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createOperationQueue,
  createQueue,
  PassthroughOperationQueue,
  QueueFullError,
  SerialOperationQueue,
} from './operationQueue.ts';
import type { OperationQueue } from './operationQueue.ts';

describe('server/db/operationQueue', () => {
  let queue: OperationQueue;

  beforeEach(() => {
    vi.spyOn(console, 'debug').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('createOperationQueue factory', () => {
    it('returns a SerialOperationQueue instance', () => {
      queue = createOperationQueue(10, 500);
      expect(queue).toBeInstanceOf(SerialOperationQueue);
    });
  });

  describe('QueueFullError', () => {
    it('has code property set to QUEUE_FULL', () => {
      const error = new QueueFullError(5);
      expect(error.code).toBe('QUEUE_FULL');
    });

    it('is an instance of Error', () => {
      const error = new QueueFullError(5);
      expect(error).toBeInstanceOf(Error);
    });

    it('includes maxDepth in the error message', () => {
      const error = new QueueFullError(42);
      expect(error.message).toContain('42');
    });

    it('has name set to QueueFullError', () => {
      const error = new QueueFullError(5);
      expect(error.name).toBe('QueueFullError');
    });
  });

  describe('SerialOperationQueue', () => {
    beforeEach(() => {
      queue = createOperationQueue(5, 100);
    });

    describe('enqueue', () => {
      it('resolves with the operation result', async () => {
        const result = await queue.enqueue(async () => 'hello');
        expect(result).toBe('hello');
      });

      it('propagates operation errors', async () => {
        await expect(
          queue.enqueue(async () => {
            throw new Error('boom');
          }),
        ).rejects.toThrow('boom');
      });

      it('executes operations in FIFO order', async () => {
        const results: number[] = [];

        const p1 = queue.enqueue(async () => {
          await new Promise((r) => setTimeout(r, 30));
          results.push(1);
          return 1;
        });
        const p2 = queue.enqueue(async () => {
          results.push(2);
          return 2;
        });
        const p3 = queue.enqueue(async () => {
          results.push(3);
          return 3;
        });

        await Promise.all([p1, p2, p3]);
        expect(results).toEqual([1, 2, 3]);
      });

      it('continues processing after an operation fails', async () => {
        const p1 = queue.enqueue(async () => 'first');
        const p2 = queue.enqueue(async () => {
          throw new Error('fail');
        });
        const p3 = queue.enqueue(async () => 'third');

        expect(await p1).toBe('first');
        await expect(p2).rejects.toThrow('fail');
        expect(await p3).toBe('third');
      });
    });

    describe('pendingCount', () => {
      it('starts at 0', () => {
        expect(queue.pendingCount).toBe(0);
      });

      it('increments when operations are enqueued', () => {
        // Enqueue a blocking operation that won't resolve immediately
        queue.enqueue(
          () => new Promise((resolve) => setTimeout(resolve, 100)),
        );
        expect(queue.pendingCount).toBe(1);

        queue.enqueue(
          () => new Promise((resolve) => setTimeout(resolve, 100)),
        );
        expect(queue.pendingCount).toBe(2);
      });

      it('decrements after operations complete', async () => {
        await queue.enqueue(async () => 'done');
        expect(queue.pendingCount).toBe(0);
      });
    });

    describe('queue-full rejection', () => {
      it('rejects with QueueFullError when maxDepth is exceeded', () => {
        const smallQueue = createOperationQueue(2, 500);

        // Fill with blocking operations
        smallQueue.enqueue(
          () => new Promise((resolve) => setTimeout(resolve, 200)),
        );
        smallQueue.enqueue(
          () => new Promise((resolve) => setTimeout(resolve, 200)),
        );

        // Third should be rejected
        const rejected = smallQueue.enqueue(async () => 'overflow');
        return expect(rejected).rejects.toBeInstanceOf(QueueFullError);
      });

      it('rejected operations have code QUEUE_FULL', async () => {
        const smallQueue = createOperationQueue(1, 500);

        smallQueue.enqueue(
          () => new Promise((resolve) => setTimeout(resolve, 200)),
        );

        try {
          await smallQueue.enqueue(async () => 'overflow');
          expect.fail('should have thrown');
        } catch (err) {
          expect(err).toBeInstanceOf(QueueFullError);
          expect((err as QueueFullError).code).toBe('QUEUE_FULL');
        }
      });

      it('does not count rejected operations toward depth', () => {
        const smallQueue = createOperationQueue(1, 500);

        smallQueue.enqueue(
          () => new Promise((resolve) => setTimeout(resolve, 200)),
        );

        // This is rejected, should not affect depth
        smallQueue.enqueue(async () => 'overflow').catch(() => {});

        expect(smallQueue.pendingCount).toBe(1);
      });
    });

    describe('drain', () => {
      it('resolves immediately when queue is empty', async () => {
        await expect(queue.drain()).resolves.toBeUndefined();
      });

      it('resolves after all queued operations complete', async () => {
        const results: number[] = [];

        queue.enqueue(async () => {
          await new Promise((r) => setTimeout(r, 20));
          results.push(1);
        });
        queue.enqueue(async () => {
          results.push(2);
        });

        await queue.drain();
        expect(results).toEqual([1, 2]);
      });

      it('resolves after failed operations settle', async () => {
        queue.enqueue(async () => {
          throw new Error('fail');
        }).catch(() => {});

        queue.enqueue(async () => 'ok');

        await expect(queue.drain()).resolves.toBeUndefined();
      });
    });

    describe('passthrough mode', () => {
      it('PassthroughOperationQueue executes operations immediately', async () => {
        const passthrough = new PassthroughOperationQueue();
        const result = await passthrough.enqueue(async () => 'immediate');
        expect(result).toBe('immediate');
      });

      it('PassthroughOperationQueue pendingCount is always 0', async () => {
        const passthrough = new PassthroughOperationQueue();
        expect(passthrough.pendingCount).toBe(0);

        // Even while an operation is "in flight", pendingCount stays 0
        const op = passthrough.enqueue(async () => {
          expect(passthrough.pendingCount).toBe(0);
          return 'done';
        });

        expect(passthrough.pendingCount).toBe(0);
        await op;
        expect(passthrough.pendingCount).toBe(0);
      });

      it('createQueue returns PassthroughOperationQueue for mysql provider', () => {
        const q = createQueue({
          databaseProvider: 'mysql',
          dbQueueMaxDepth: 10,
          dbQueueWarnMs: 500,
        });
        expect(q).toBeInstanceOf(PassthroughOperationQueue);
      });

      it('createQueue returns SerialOperationQueue for sqlite provider', () => {
        const q = createQueue({
          databaseProvider: 'sqlite',
          dbQueueMaxDepth: 10,
          dbQueueWarnMs: 500,
        });
        expect(q).toBeInstanceOf(SerialOperationQueue);
      });
    });

    describe('per-operation timing and logging', () => {
      it('logs debug message for each operation', async () => {
        await queue.enqueue(async () => 'test');

        expect(console.debug).toHaveBeenCalledWith(
          expect.stringContaining('[OperationQueue] operation completed'),
        );
      });

      it('logs debug message even when operation fails', async () => {
        await queue.enqueue(async () => {
          throw new Error('oops');
        }).catch(() => {});

        expect(console.debug).toHaveBeenCalledWith(
          expect.stringContaining('[OperationQueue] operation failed'),
        );
      });

      it('logs a warning when wait time exceeds warnMs threshold', async () => {
        // Create a queue with a very low warn threshold
        const warnQueue = createOperationQueue(10, 1);

        // First op blocks for a bit, causing the second to wait
        warnQueue.enqueue(
          () => new Promise((resolve) => setTimeout(resolve, 20)),
        );
        await warnQueue.enqueue(async () => 'waited');

        expect(console.warn).toHaveBeenCalledWith(
          expect.stringContaining('[OperationQueue] operation waited'),
        );
      });

      it('does not log a warning when wait time is below warnMs', async () => {
        // Queue with high threshold — no warning expected
        const noWarnQueue = createOperationQueue(10, 10000);

        await noWarnQueue.enqueue(async () => 'fast');

        expect(console.warn).not.toHaveBeenCalled();
      });
    });
  });
});
