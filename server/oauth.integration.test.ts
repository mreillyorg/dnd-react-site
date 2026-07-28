/**
 * Integration tests for the full OAuth authentication flow.
 *
 * Tests cover:
 * - OAuth callback flow (code exchange → session creation → cookie set → redirect)
 * - GraphQL `me` query with valid session cookie
 * - GraphQL `me` query without cookie
 * - GraphQL `logout` mutation invalidates session
 * - Expired session token rejection
 *
 * Requirements: 5.4, 5.5, 5.6, 9.2, 9.3, 10.2
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
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { createQueue } from './db/operationQueue.ts';
import { formatGraphQLError } from './errors/formatGraphQLError.ts';
import { createContextFactory } from './graphql/context.ts';
import { schema } from './graphql/schema/index.ts';
import { createAuthRouter } from './routes/authRoutes.ts';

// Mock the exchangeCode function to avoid real HTTP calls to OAuth providers
vi.mock('./services/oauthService.ts', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./services/oauthService.ts')>();
  return {
    ...actual,
    exchangeCode: vi.fn(),
  };
});

import { exchangeCode } from './services/oauthService.ts';

const mockedExchangeCode = vi.mocked(exchangeCode);

// ---------------------------------------------------------------------------
// Shared test setup
// ---------------------------------------------------------------------------

let app: express.Express;
let apolloServer: ApolloServer;

// In-memory store for mock prisma
const store: {
  users: Record<string, any>;
  authSessions: Record<string, any>;
  oAuthIdentities: Record<string, any>;
} = {
  users: {},
  authSessions: {},
  oAuthIdentities: {},
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
        if (where.email)
          return Object.values(store.users).find((u: any) => u.email === where.email) || null;
        return null;
      },
      findMany: async () => Object.values(store.users),
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
        const session = Object.values(store.authSessions).find((s: any) => s.id === where.id) as any;
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
    oAuthIdentity: {
      findUnique: async ({ where, include }: any) => {
        if (where.provider_providerUserId) {
          const key = `${where.provider_providerUserId.provider}:${where.provider_providerUserId.providerUserId}`;
          const identity = store.oAuthIdentities[key] || null;
          if (identity && include?.user) {
            const user = store.users[identity.userId] || null;
            return { ...identity, user };
          }
          return identity;
        }
        return null;
      },
      create: async ({ data }: any) => {
        const identity = {
          id: nextId(),
          provider: data.provider,
          providerUserId: data.providerUserId,
          userId: data.userId,
          createdAt: new Date(),
        };
        const key = `${data.provider}:${data.providerUserId}`;
        store.oAuthIdentities[key] = identity;
        return identity;
      },
      findMany: async ({ where }: any) => {
        return Object.values(store.oAuthIdentities).filter(
          (i: any) => i.userId === where?.userId,
        );
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

  // Mount OAuth auth routes
  expressApp.use(createAuthRouter({ prisma: mockPrisma, queue }));

  expressApp.use(
    '/graphql',
    express.json(),
    expressMiddleware(apolloServer, {
      context: async ({ req }) => contextFactory({ req }),
    }),
  );

  app = expressApp;
});

beforeEach(() => {
  // Clear the store between tests
  for (const key of Object.keys(store.users)) delete store.users[key];
  for (const key of Object.keys(store.authSessions)) delete store.authSessions[key];
  for (const key of Object.keys(store.oAuthIdentities)) delete store.oAuthIdentities[key];
  idCounter = 0;
  vi.clearAllMocks();
});

afterAll(async () => {
  await apolloServer.stop();
});

// ---------------------------------------------------------------------------
// Helper: creates a user directly in the store and returns a session cookie
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Integration: OAuth callback flow
// ---------------------------------------------------------------------------

describe('Integration: OAuth callback flow', () => {
  it('exchanges code, creates session, sets cookie, and redirects to /', async () => {
    // Mock exchangeCode to return a fake profile
    mockedExchangeCode.mockResolvedValueOnce({
      email: 'hero@example.com',
      name: 'Hero',
      providerUserId: 'github-123',
      provider: 'github',
    });

    // First, initiate OAuth to get a state cookie
    const initiateRes = await request(app).get('/auth/initiate/github');
    expect(initiateRes.status).toBe(302);

    // Extract the state cookie from the initiate response
    const cookies = initiateRes.headers['set-cookie'] as string[];
    const stateCookie = cookies.find((c: string) => c.startsWith('oauth_state='));
    expect(stateCookie).toBeDefined();

    const stateValue = stateCookie!.split('=')[1].split(';')[0];

    // Now call the callback with the matching state and a code
    const callbackRes = await request(app)
      .get(`/auth/callback/github?code=test-auth-code&state=${stateValue}`)
      .set('Cookie', `oauth_state=${stateValue}`);

    // Should redirect to /
    expect(callbackRes.status).toBe(302);
    expect(callbackRes.headers.location).toBe('/');

    // Should set the session cookie
    const responseCookies = callbackRes.headers['set-cookie'] as string[];
    const sessionCookie = responseCookies.find((c: string) => c.startsWith('session='));
    expect(sessionCookie).toBeDefined();
    expect(sessionCookie).toContain('HttpOnly');

    // Verify user was created in the store
    const users = Object.values(store.users);
    expect(users).toHaveLength(1);
    expect((users[0] as any).email).toBe('hero@example.com');

    // Verify session was created
    const sessions = Object.values(store.authSessions);
    expect(sessions.length).toBeGreaterThanOrEqual(1);
  });

  it('redirects to /login?error=invalid_state when state does not match', async () => {
    const callbackRes = await request(app)
      .get('/auth/callback/github?code=test-code&state=bad-state')
      .set('Cookie', 'oauth_state=different-state');

    expect(callbackRes.status).toBe(302);
    expect(callbackRes.headers.location).toBe('/login?error=invalid_state');
  });

  it('redirects to /login?error=unsupported_provider for invalid provider', async () => {
    const callbackRes = await request(app)
      .get('/auth/callback/invalid_provider?code=test-code&state=some-state')
      .set('Cookie', 'oauth_state=some-state');

    expect(callbackRes.status).toBe(302);
    expect(callbackRes.headers.location).toBe('/login?error=unsupported_provider');
  });
});

// ---------------------------------------------------------------------------
// Integration: GraphQL me query
// ---------------------------------------------------------------------------

describe('Integration: GraphQL me query', () => {
  const ME_QUERY = `query { me { id email name } }`;

  it('returns user data when valid session cookie is present', async () => {
    const { cookie } = createAuthenticatedUser('wizard@example.com', 'Wizard');

    const res = await request(app)
      .post('/graphql')
      .set('Cookie', cookie)
      .send({ query: ME_QUERY });

    expect(res.status).toBe(200);
    expect(res.body.errors).toBeUndefined();
    expect(res.body.data.me).not.toBeNull();
    expect(res.body.data.me.email).toBe('wizard@example.com');
    expect(res.body.data.me.name).toBe('Wizard');
  });

  it('returns null when no session cookie is present', async () => {
    const res = await request(app)
      .post('/graphql')
      .send({ query: ME_QUERY });

    expect(res.status).toBe(200);
    expect(res.body.errors).toBeUndefined();
    expect(res.body.data.me).toBeNull();
  });

  it('returns null when session cookie has invalid token', async () => {
    const res = await request(app)
      .post('/graphql')
      .set('Cookie', 'session=invalid-nonexistent-token')
      .send({ query: ME_QUERY });

    expect(res.status).toBe(200);
    expect(res.body.errors).toBeUndefined();
    expect(res.body.data.me).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Integration: GraphQL logout mutation
// ---------------------------------------------------------------------------

describe('Integration: GraphQL logout mutation', () => {
  const LOGOUT_MUTATION = `mutation { logout }`;
  const ME_QUERY = `query { me { id email } }`;

  it('invalidates session and subsequent me query returns null', async () => {
    const { cookie, token } = createAuthenticatedUser('rogue@example.com', 'Rogue');

    // Verify user is authenticated first
    const meRes = await request(app)
      .post('/graphql')
      .set('Cookie', cookie)
      .send({ query: ME_QUERY });

    expect(meRes.body.data.me).not.toBeNull();
    expect(meRes.body.data.me.email).toBe('rogue@example.com');

    // Logout
    const logoutRes = await request(app)
      .post('/graphql')
      .set('Cookie', cookie)
      .send({ query: LOGOUT_MUTATION });

    expect(logoutRes.status).toBe(200);
    expect(logoutRes.body.errors).toBeUndefined();
    expect(logoutRes.body.data.logout).toBe(true);

    // Verify session was removed from the store
    expect(store.authSessions[token]).toBeUndefined();

    // Subsequent me query with the same cookie returns null
    const meAfterLogout = await request(app)
      .post('/graphql')
      .set('Cookie', cookie)
      .send({ query: ME_QUERY });

    expect(meAfterLogout.body.data.me).toBeNull();
  });

  it('returns UNAUTHENTICATED error when not logged in', async () => {
    const logoutRes = await request(app)
      .post('/graphql')
      .send({ query: LOGOUT_MUTATION });

    expect(logoutRes.status).toBe(200);
    expect(logoutRes.body.errors).toBeDefined();
    expect(logoutRes.body.errors[0].extensions.code).toBe('UNAUTHENTICATED');
  });
});

// ---------------------------------------------------------------------------
// Integration: Expired session handling
// ---------------------------------------------------------------------------

describe('Integration: Expired session handling', () => {
  const ME_QUERY = `query { me { id email } }`;

  it('returns null for me query when session has expired', async () => {
    // Create a user with an already-expired session
    const userId = nextId();
    store.users[userId] = {
      id: userId,
      email: 'expired@example.com',
      name: 'Expired User',
      themeMode: 'SYSTEM',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const token = crypto.randomBytes(32).toString('hex');
    store.authSessions[token] = {
      id: nextId(),
      token,
      userId,
      expiresAt: new Date(Date.now() - 1000), // expired 1 second ago
      createdAt: new Date(),
    };

    const res = await request(app)
      .post('/graphql')
      .set('Cookie', `session=${token}`)
      .send({ query: ME_QUERY });

    expect(res.status).toBe(200);
    expect(res.body.errors).toBeUndefined();
    expect(res.body.data.me).toBeNull();
  });

  it('cleans up expired session from the store', async () => {
    const userId = nextId();
    store.users[userId] = {
      id: userId,
      email: 'cleanup@example.com',
      name: 'Cleanup User',
      themeMode: 'SYSTEM',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const token = crypto.randomBytes(32).toString('hex');
    const sessionId = nextId();
    store.authSessions[token] = {
      id: sessionId,
      token,
      userId,
      expiresAt: new Date(Date.now() - 60000), // expired 1 minute ago
      createdAt: new Date(),
    };

    // Make the request which triggers session validation
    await request(app)
      .post('/graphql')
      .set('Cookie', `session=${token}`)
      .send({ query: ME_QUERY });

    // Give the async cleanup a moment to run
    await new Promise((resolve) => setTimeout(resolve, 50));

    // The expired session should be cleaned up
    expect(store.authSessions[token]).toBeUndefined();
  });
});
