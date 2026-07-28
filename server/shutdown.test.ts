import { describe, it, expect, vi, beforeEach } from 'vitest';

import { gracefulShutdown } from './shutdown.ts';
import type { ShutdownDependencies } from './shutdown.ts';

describe('gracefulShutdown', () => {
  let deps: ShutdownDependencies;
  let callOrder: string[];

  beforeEach(() => {
    callOrder = [];
    deps = {
      httpServer: {
        close: vi.fn(() => {
          callOrder.push('httpServer.close');
        }),
      } as unknown as ShutdownDependencies['httpServer'],
      queue: {
        drain: vi.fn(async () => {
          callOrder.push('queue.drain');
        }),
        enqueue: vi.fn(),
        pendingCount: 0,
      },
      apolloServer: {
        stop: vi.fn(async () => {
          callOrder.push('apolloServer.stop');
        }),
      } as unknown as ShutdownDependencies['apolloServer'],
      closeDatabase: vi.fn(async () => {
        callOrder.push('closeDatabase');
      }),
    };
  });

  it('calls shutdown steps in the correct order', async () => {
    await gracefulShutdown('SIGTERM', deps, { exit: false });

    expect(callOrder).toEqual([
      'httpServer.close',
      'queue.drain',
      'apolloServer.stop',
      'closeDatabase',
    ]);
  });

  it('stops accepting connections before draining the queue', async () => {
    await gracefulShutdown('SIGINT', deps, { exit: false });

    expect(deps.httpServer.close).toHaveBeenCalled();
    const closeIndex = callOrder.indexOf('httpServer.close');
    const drainIndex = callOrder.indexOf('queue.drain');
    expect(closeIndex).toBeLessThan(drainIndex);
  });

  it('drains queue before closing database', async () => {
    await gracefulShutdown('SIGTERM', deps, { exit: false });

    const drainIndex = callOrder.indexOf('queue.drain');
    const disconnectIndex = callOrder.indexOf('closeDatabase');
    expect(drainIndex).toBeLessThan(disconnectIndex);
  });

  it('stops apollo server before closing database', async () => {
    await gracefulShutdown('SIGTERM', deps, { exit: false });

    const apolloIndex = callOrder.indexOf('apolloServer.stop');
    const disconnectIndex = callOrder.indexOf('closeDatabase');
    expect(apolloIndex).toBeLessThan(disconnectIndex);
  });

  it('does not call process.exit when exit option is false', async () => {
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);

    await gracefulShutdown('SIGTERM', deps, { exit: false });

    expect(exitSpy).not.toHaveBeenCalled();
    exitSpy.mockRestore();
  });

  it('waits for queue.drain() to complete before calling closeDatabase', async () => {
    let drainResolved = false;
    deps.queue.drain = vi.fn(async () => {
      await new Promise((resolve) => setTimeout(resolve, 50));
      drainResolved = true;
      callOrder.push('queue.drain');
    });

    deps.closeDatabase = vi.fn(async () => {
      expect(drainResolved).toBe(true);
      callOrder.push('closeDatabase');
    });

    await gracefulShutdown('SIGTERM', deps, { exit: false });

    expect(drainResolved).toBe(true);
    expect(deps.closeDatabase).toHaveBeenCalled();
  });
});
