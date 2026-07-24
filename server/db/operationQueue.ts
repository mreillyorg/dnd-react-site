/**
 * Operation Queue — serialises write operations for SQLite's single-writer constraint.
 *
 * Uses a tail-chaining promise pattern (not shift-from-array) so that each
 * operation awaits the previous one before executing, guaranteeing strict FIFO
 * order without holding an ever-growing array in memory.
 */

// ---------------------------------------------------------------------------
// Interfaces
// ---------------------------------------------------------------------------

/**
 * Represents a serialised operation queue that processes async work one at a time.
 */
export interface OperationQueue {
  /**
   * Enqueue an async operation factory. The returned promise resolves with the
   * operation's result once it has been executed (after all previously queued
   * operations complete).
   */
  enqueue<T>(fn: () => Promise<T>): Promise<T>;

  /**
   * Resolves when all currently queued operations have completed.
   */
  drain(): Promise<void>;

  /**
   * Current number of operations waiting or executing in the queue.
   */
  readonly pendingCount: number;
}

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

/**
 * Thrown when the queue has reached its maximum configured depth and cannot
 * accept additional operations.
 */
export class QueueFullError extends Error {
  readonly code = 'QUEUE_FULL' as const;

  constructor(maxDepth: number) {
    super(
      `Operation queue is full (max depth: ${maxDepth}). The write operation was rejected.`,
    );
    this.name = 'QueueFullError';
  }
}

// ---------------------------------------------------------------------------
// Serial implementation
// ---------------------------------------------------------------------------

/**
 * A serial operation queue that chains promises tail-to-tail.
 * Each enqueued operation awaits the completion of the previous one, ensuring
 * strict FIFO execution order — critical for SQLite's single-writer model.
 */
export class SerialOperationQueue implements OperationQueue {
  private readonly maxDepth: number;
  private readonly warnMs: number;
  private depth = 0;
  private tail: Promise<unknown> = Promise.resolve();

  constructor(maxDepth: number, warnMs: number) {
    this.maxDepth = maxDepth;
    this.warnMs = warnMs;
  }

  get pendingCount(): number {
    return this.depth;
  }

  enqueue<T>(fn: () => Promise<T>): Promise<T> {
    if (this.depth >= this.maxDepth) {
      return Promise.reject(new QueueFullError(this.maxDepth));
    }

    this.depth++;
    const enqueueTime = performance.now();

    const result = this.tail.then(async () => {
      const waitTime = performance.now() - enqueueTime;
      const startTime = performance.now();

      try {
        const value = await fn();
        const executionDuration = performance.now() - startTime;

        console.debug(
          `[OperationQueue] operation completed — wait: ${waitTime.toFixed(1)}ms, exec: ${executionDuration.toFixed(1)}ms`,
        );

        if (waitTime > this.warnMs) {
          console.warn(
            `[OperationQueue] operation waited ${waitTime.toFixed(1)}ms (threshold: ${this.warnMs}ms)`,
          );
        }

        return value;
      } catch (error) {
        const executionDuration = performance.now() - startTime;

        console.debug(
          `[OperationQueue] operation failed — wait: ${waitTime.toFixed(1)}ms, exec: ${executionDuration.toFixed(1)}ms`,
        );

        if (waitTime > this.warnMs) {
          console.warn(
            `[OperationQueue] operation waited ${waitTime.toFixed(1)}ms (threshold: ${this.warnMs}ms)`,
          );
        }

        throw error;
      } finally {
        this.depth--;
      }
    });

    // Chain: the next operation waits for this one to settle (succeed or fail)
    // We use .then/.catch to ensure the tail always resolves so the chain continues.
    this.tail = result.then(
      () => undefined,
      () => undefined,
    );

    return result;
  }

  drain(): Promise<void> {
    return this.tail.then(() => undefined);
  }
}

// ---------------------------------------------------------------------------
// Passthrough implementation (MySQL / non-SQLite providers)
// ---------------------------------------------------------------------------

/**
 * A no-op queue that executes operations immediately without serialisation.
 * Used when the active database provider (e.g. MySQL) handles write concurrency
 * natively and does not require single-writer protection.
 */
export class PassthroughOperationQueue implements OperationQueue {
  get pendingCount(): number {
    return 0;
  }

  enqueue<T>(fn: () => Promise<T>): Promise<T> {
    return fn();
  }

  drain(): Promise<void> {
    return Promise.resolve();
  }
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

/**
 * Creates a new SerialOperationQueue with the given configuration.
 *
 * @param maxDepth - Maximum number of operations allowed in the queue before
 *                   new enqueue calls are rejected with QueueFullError.
 * @param warnMs   - If an operation waits longer than this threshold (in ms)
 *                   before executing, a warning is logged.
 */
export function createOperationQueue(
  maxDepth: number,
  warnMs: number,
): OperationQueue {
  return new SerialOperationQueue(maxDepth, warnMs);
}

/**
 * Creates the appropriate OperationQueue based on the database provider.
 *
 * - SQLite: returns a SerialOperationQueue (single-writer protection)
 * - MySQL (or any other provider): returns a PassthroughOperationQueue
 *   (the database handles concurrency natively)
 */
export function createQueue(config: {
  databaseProvider: string;
  dbQueueMaxDepth: number;
  dbQueueWarnMs: number;
}): OperationQueue {
  if (config.databaseProvider === 'sqlite') {
    return new SerialOperationQueue(config.dbQueueMaxDepth, config.dbQueueWarnMs);
  }
  return new PassthroughOperationQueue();
}
