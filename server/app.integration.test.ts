/**
 * Integration tests for the Express app health endpoint and GraphQL round-trip.
 *
 * These tests use a lightweight Express setup that mounts the same health
 * endpoint and Apollo middleware as the real app, but skips migration
 * execution (handled by global test setup).
 *
 * Authentication uses cookie-based sessions (AuthSession model) instead of JWT.
 *
 * Requirements: 7.6, 1.1
 */

// @vitest-environment node

import http from 'node:http';
import crypto from 'node:crypto';

import { ApolloServer } from '@apollo/server';
import { ApolloServerPluginDrainHttpServer } from '@apollo/server/plugin/drainHttpServer';
import { expressMiddleware } from '@as-integrations/express5';
import cookieParser from 'cookie-parser';
import express from 'express';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createQueue } from './db/operationQueue.ts';
import { formatGraphQLError } from './errors/formatGraphQLError.ts';
import { createContextFactory } from './graphql/context.ts';
import { schema } from './graphql/schema/index.ts';

// ---------------------------------------------------------------------------
// Health endpoint tests
// ---------------------------------------------------------------------------

describe('Integration: Health endpoint', () => {
  function createHealthApp(prismaLike: { $queryRaw: (...args: unknown[]) => Promise<unknown> }) {
    const app = express();

    app.get('/health', async (_req, res) => {
      try {
        const healthCheck = prismaLike.$queryRaw`SELECT 1` as Promise<unknown>;
        const timeout = new Promise<never>((_resolve, reject) => {
          setTimeout(() => reject(new Error('Database health check timed out')), 3000);
        });
        await Promise.race([healthCheck, timeout]);
        res.status(200).json({ status: 'ok', database: 'connected' });
      } catch {
        res.status(503).json({ status: 'degraded', database: 'unreachable' });
      }
    });

    return app;
  }

  it('returns 200 when the database is reachable', async () => {
    const mockPrisma = {
      $queryRaw: () => Promise.resolve([{ '1': 1 }]),
    };
    const app = createHealthApp(mockPrisma);

    const res = await request(app).get('/health');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      status: 'ok',
      database: 'connected',
    });
  });

  it('returns 503 when the database is unreachable', async () => {
    const mockPrisma = {
      $queryRaw: () => Promise.reject(new Error('Connection refused')),
    };
    const app = createHealthApp(mockPrisma);

    const res = await request(app).get('/health');

    expect(res.status).toBe(503);
    expect(res.body).toEqual({
      status: 'degraded',
      database: 'unreachable',
    });
  });
});

// ---------------------------------------------------------------------------
// GraphQL round-trip test (cookie-based auth)
// ---------------------------------------------------------------------------

describe('Integration: GraphQL round-trip', () => {
  let app: express.Express;
  let apolloServer: ApolloServer;

  // In-memory store for mock prisma
  const store: {
    users: Record<string, any>;
    characters: Record<string, any>;
    authSessions: Record<string, any>;
  } = {
    users: {},
    characters: {},
    authSessions: {},
  };

  let idCounter = 0;
  const nextId = () => `cuid_${++idCounter}`;

  beforeAll(async () => {
    const mockPrisma = {
      $connect: () => Promise.resolve(),
      $disconnect: () => Promise.resolve(),
      $queryRaw: () => Promise.resolve([{ '1': 1 }]),
      $transaction: async (fn: Function) => fn(mockPrisma),
      $executeRawUnsafe: () => Promise.resolve(0),
      user: {
        create: async ({ data }: any) => {
          const user = {
            id: nextId(),
            ...data,
            createdAt: new Date(),
            updatedAt: new Date(),
          };
          store.users[user.id] = user;
          return user;
        },
        findUnique: async ({ where }: any) => {
          if (where.id) return store.users[where.id] || null;
          if (where.email) return Object.values(store.users).find((u: any) => u.email === where.email) || null;
          return null;
        },
        findMany: async () => Object.values(store.users),
        deleteMany: async () => ({ count: 0 }),
      },
      character: {
        create: async ({ data, include }: any) => {
          const char = {
            id: nextId(),
            name: data.name,
            level: data.level ?? 1,
            class: data.class,
            race: data.race,
            strength: data.strength ?? 10,
            dexterity: data.dexterity ?? 10,
            constitution: data.constitution ?? 10,
            intelligence: data.intelligence ?? 10,
            wisdom: data.wisdom ?? 10,
            charisma: data.charisma ?? 10,
            maxHp: data.maxHp,
            currentHp: data.currentHp,
            tempHp: data.tempHp ?? 0,
            armorClass: data.armorClass,
            userId: data.userId,
            campaignId: data.campaignId || null,
            createdAt: new Date(),
            updatedAt: new Date(),
            itemAssignments: [],
          };
          store.characters[char.id] = char;
          return char;
        },
        findUnique: async ({ where, include }: any) => {
          const char = store.characters[where.id] || null;
          if (char && include?.itemAssignments) {
            return { ...char, itemAssignments: char.itemAssignments || [] };
          }
          return char;
        },
        findMany: async ({ where, include }: any) => {
          let chars = Object.values(store.characters) as any[];
          if (where?.userId) chars = chars.filter((c: any) => c.userId === where.userId);
          if (where?.campaignId) chars = chars.filter((c: any) => c.campaignId === where.campaignId);
          return chars.map((c: any) => ({ ...c, itemAssignments: c.itemAssignments || [] }));
        },
        deleteMany: async () => ({ count: 0 }),
      },
      authSession: {
        create: async ({ data }: any) => {
          const session = {
            id: nextId(),
            token: data.token,
            userId: data.userId,
            expiresAt: data.expiresAt,
            createdAt: new Date(),
          };
          store.authSessions[session.token] = session;
          return session;
        },
        findUnique: async ({ where, include }: any) => {
          const session = where.token
            ? store.authSessions[where.token] || null
            : Object.values(store.authSessions).find((s: any) => s.id === where.id) || null;
          if (session && include?.user) {
            const user = store.users[session.userId] || null;
            return { ...session, user };
          }
          return session;
        },
        delete: async ({ where }: any) => {
          const session = store.authSessions[where.id];
          if (session) delete store.authSessions[session.token];
          return session;
        },
        deleteMany: async ({ where }: any) => {
          if (where?.token) {
            delete store.authSessions[where.token];
          }
          return { count: 1 };
        },
      },
    } as any;

    const queue = createQueue({ databaseProvider: 'sqlite', dbQueueMaxDepth: 100, dbQueueWarnMs: 500 });

    const expressApp = express();
    const httpServer = http.createServer(expressApp);

    apolloServer = new ApolloServer({
      schema,
      formatError: formatGraphQLError,
      introspection: true,
      plugins: [ApolloServerPluginDrainHttpServer({ httpServer })],
    });

    await apolloServer.start();

    const contextFactory = createContextFactory({ prisma: mockPrisma, queue });

    expressApp.use(cookieParser());
    expressApp.use(
      '/graphql',
      express.json(),
      expressMiddleware(apolloServer, {
        context: async ({ req }) => contextFactory({ req }),
      }),
    );

    app = expressApp;
  });

  afterAll(async () => {
    await apolloServer.stop();
  });

  /**
   * Helper: creates a user directly in the store and returns a session cookie string.
   */
  function createAuthenticatedUser(email: string, name: string) {
    const userId = nextId();
    store.users[userId] = {
      id: userId,
      email,
      name,
      themeMode: 'SYSTEM',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const token = crypto.randomBytes(32).toString('hex');
    store.authSessions[token] = {
      id: nextId(),
      token,
      userId,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      createdAt: new Date(),
    };

    return { userId, token, cookie: `session=${token}` };
  }

  it('createCharacter mutation followed by character query returns persisted data', async () => {
    // Step 1: Create a user with a session cookie directly in the store
    const { userId, cookie } = createAuthenticatedUser('gandalf@middleearth.com', 'Gandalf the Grey');

    // Step 2: Execute createCharacter mutation (requires auth via session cookie)
    const createCharacterMutation = `
      mutation CreateCharacter($input: CreateCharacterInput!) {
        createCharacter(input: $input) {
          id
          name
          level
          class
          race
          maxHp
          currentHp
          armorClass
          userId
        }
      }
    `;

    const characterInput = {
      name: 'Gandalf',
      class: 'Wizard',
      race: 'Human',
      maxHp: 45,
      currentHp: 45,
      armorClass: 12,
      level: 5,
    };

    const createCharRes = await request(app)
      .post('/graphql')
      .set('Cookie', cookie)
      .send({
        query: createCharacterMutation,
        variables: { input: characterInput },
      });

    expect(createCharRes.status).toBe(200);
    expect(createCharRes.body.errors).toBeUndefined();

    const createdCharacter = createCharRes.body.data.createCharacter;
    expect(createdCharacter.name).toBe('Gandalf');
    expect(createdCharacter.class).toBe('Wizard');
    expect(createdCharacter.race).toBe('Human');
    expect(createdCharacter.maxHp).toBe(45);
    expect(createdCharacter.currentHp).toBe(45);
    expect(createdCharacter.armorClass).toBe(12);
    expect(createdCharacter.level).toBe(5);
    expect(createdCharacter.userId).toBe(userId);
    expect(createdCharacter.id).toBeDefined();

    // Step 3: Query the character back to verify persistence
    const queryCharacter = `
      query GetCharacter($id: ID!) {
        character(id: $id) {
          id
          name
          level
          class
          race
          maxHp
          currentHp
          armorClass
          userId
        }
      }
    `;

    const queryRes = await request(app)
      .post('/graphql')
      .set('Cookie', cookie)
      .send({
        query: queryCharacter,
        variables: { id: createdCharacter.id },
      });

    expect(queryRes.status).toBe(200);
    expect(queryRes.body.errors).toBeUndefined();

    const queriedCharacter = queryRes.body.data.character;
    expect(queriedCharacter.id).toBe(createdCharacter.id);
    expect(queriedCharacter.name).toBe('Gandalf');
    expect(queriedCharacter.class).toBe('Wizard');
    expect(queriedCharacter.race).toBe('Human');
    expect(queriedCharacter.maxHp).toBe(45);
    expect(queriedCharacter.currentHp).toBe(45);
    expect(queriedCharacter.armorClass).toBe(12);
    expect(queriedCharacter.level).toBe(5);
    expect(queriedCharacter.userId).toBe(userId);
  });
});
