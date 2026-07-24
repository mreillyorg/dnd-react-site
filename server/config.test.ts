import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('server/config', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.restoreAllMocks();
  });

  describe('fail-fast on missing DATABASE_URL', () => {
    it('calls process.exit(1) and logs a FATAL error when DATABASE_URL is not set', async () => {
      delete process.env.DATABASE_URL;

      const exitSpy = vi
        .spyOn(process, 'exit')
        .mockImplementation(() => {
          throw new Error('process.exit called');
        });
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      await expect(async () => {
        await import('./config.ts');
      }).rejects.toThrow('process.exit called');

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('DATABASE_URL'),
      );
      expect(exitSpy).toHaveBeenCalledWith(1);
    });
  });

  describe('correct defaults for optional vars', () => {
    it('defaults DATABASE_PROVIDER to sqlite', async () => {
      process.env.DATABASE_URL = 'file:./test.db';
      delete process.env.DATABASE_PROVIDER;

      const { config } = await import('./config.ts');

      expect(config.databaseProvider).toBe('sqlite');
    });

    it('defaults DB_QUEUE_MAX_DEPTH to 100', async () => {
      process.env.DATABASE_URL = 'file:./test.db';
      delete process.env.DB_QUEUE_MAX_DEPTH;

      const { config } = await import('./config.ts');

      expect(config.dbQueueMaxDepth).toBe(100);
    });

    it('defaults DB_QUEUE_WARN_MS to 500', async () => {
      process.env.DATABASE_URL = 'file:./test.db';
      delete process.env.DB_QUEUE_WARN_MS;

      const { config } = await import('./config.ts');

      expect(config.dbQueueWarnMs).toBe(500);
    });

    it('defaults NODE_ENV to development', async () => {
      process.env.DATABASE_URL = 'file:./test.db';
      delete process.env.NODE_ENV;

      const { config } = await import('./config.ts');

      expect(config.nodeEnv).toBe('development');
    });
  });

  describe('GRAPHQL_INTROSPECTION defaulting based on NODE_ENV', () => {
    it('defaults to true when NODE_ENV is development', async () => {
      process.env.DATABASE_URL = 'file:./test.db';
      process.env.NODE_ENV = 'development';
      delete process.env.GRAPHQL_INTROSPECTION;

      const { config } = await import('./config.ts');

      expect(config.graphqlIntrospection).toBe(true);
    });

    it('defaults to true when NODE_ENV is not set (defaults to development)', async () => {
      process.env.DATABASE_URL = 'file:./test.db';
      delete process.env.NODE_ENV;
      delete process.env.GRAPHQL_INTROSPECTION;

      const { config } = await import('./config.ts');

      expect(config.graphqlIntrospection).toBe(true);
    });

    it('defaults to false when NODE_ENV is production', async () => {
      process.env.DATABASE_URL = 'file:./test.db';
      process.env.NODE_ENV = 'production';
      delete process.env.GRAPHQL_INTROSPECTION;

      const { config } = await import('./config.ts');

      expect(config.graphqlIntrospection).toBe(false);
    });

    it('respects explicit GRAPHQL_INTROSPECTION=true in production', async () => {
      process.env.DATABASE_URL = 'file:./test.db';
      process.env.NODE_ENV = 'production';
      process.env.GRAPHQL_INTROSPECTION = 'true';

      const { config } = await import('./config.ts');

      expect(config.graphqlIntrospection).toBe(true);
    });

    it('respects explicit GRAPHQL_INTROSPECTION=false in development', async () => {
      process.env.DATABASE_URL = 'file:./test.db';
      process.env.NODE_ENV = 'development';
      process.env.GRAPHQL_INTROSPECTION = 'false';

      const { config } = await import('./config.ts');

      expect(config.graphqlIntrospection).toBe(false);
    });
  });
});
