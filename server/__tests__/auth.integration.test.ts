/**
 * End-to-end authentication flow integration tests.
 *
 * Tests the full GraphQL authentication lifecycle:
 * - Registration → JWT → protected resource access
 * - Login → JWT → protected resource access
 * - Invalid/expired token rejection
 * - Concurrent authenticated requests
 *
 * Uses an in-memory mock Prisma store (same pattern as app.integration.test.ts)
 * with the full Express + Apollo Server stack and supertest for HTTP requests.
 *
 * Requirements: All requirements (user-registration spec)
 */

// @vitest-environment node

import http from "node:http";

import { ApolloServer } from "@apollo/server";
import { ApolloServerPluginDrainHttpServer } from "@apollo/server/plugin/drainHttpServer";
import { expressMiddleware } from "@as-integrations/express5";
import express from "express";
import jwt from "jsonwebtoken";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { createQueue } from "../db/operationQueue.ts";
import { formatGraphQLError } from "../errors/formatGraphQLError.ts";
import { createContextFactory } from "../graphql/context.ts";
import { schema } from "../graphql/schema/index.ts";

// ---------------------------------------------------------------------------
// Test Setup
// ---------------------------------------------------------------------------

const JWT_SECRET = "test-secret-key-for-auth-integration-tests";

let app: express.Express;
let apolloServer: ApolloServer;
let store: { users: Record<string, any> };

beforeAll(async () => {
  process.env.JWT_SECRET = JWT_SECRET;

  store = { users: {} };

  let idCounter = 0;
  const nextId = () => `cuid_${++idCounter}`;

  const mockPrisma = {
    $connect: () => Promise.resolve(),
    $disconnect: () => Promise.resolve(),
    $queryRaw: () => Promise.resolve([{ "1": 1 }]),
    $transaction: async (fn: Function) => fn(mockPrisma),
    $executeRawUnsafe: () => Promise.resolve(0),
    user: {
      create: async ({ data }: any) => {
        const user = {
          id: nextId(),
          email: data.email,
          passwordHash: data.passwordHash,
          name: data.name ?? null,
          themeMode: data.themeMode ?? "SYSTEM",
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        store.users[user.id] = user;
        return user;
      },
      findUnique: async ({ where, select }: any) => {
        let user: any = null;
        if (where.id) {
          user = store.users[where.id] || null;
        }
        if (where.email) {
          user =
            Object.values(store.users).find(
              (u: any) => u.email === where.email,
            ) || null;
        }
        if (user && select) {
          const result: any = {};
          for (const key of Object.keys(select)) {
            if (select[key]) result[key] = user[key];
          }
          return result;
        }
        return user;
      },
      findMany: async () => Object.values(store.users),
      deleteMany: async () => {
        store.users = {};
        return { count: 0 };
      },
      update: async ({ where, data }: any) => {
        const user = store.users[where.id];
        if (!user) throw new Error("User not found");
        Object.assign(user, data, { updatedAt: new Date() });
        return user;
      },
    },
  } as any;

  const queue = createQueue({
    databaseProvider: "sqlite",
    dbQueueMaxDepth: 100,
    dbQueueWarnMs: 500,
  });

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

  expressApp.use(
    "/graphql",
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

beforeEach(() => {
  // Clear the in-memory store between tests for isolation
  store.users = {};
});

// ---------------------------------------------------------------------------
// GraphQL Queries & Mutations
// ---------------------------------------------------------------------------

const REGISTER_MUTATION = `
  mutation Register($email: String!, $password: String!, $name: String) {
    register(email: $email, password: $password, name: $name) {
      token
      user {
        id
        email
        name
      }
    }
  }
`;

const LOGIN_MUTATION = `
  mutation Login($email: String!, $password: String!) {
    login(email: $email, password: $password) {
      token
      user {
        id
        email
        name
      }
    }
  }
`;

const ME_QUERY = `
  query Me {
    me {
      id
      email
      name
    }
  }
`;

// ---------------------------------------------------------------------------
// Test Helpers
// ---------------------------------------------------------------------------

const TEST_USER = {
  email: "testuser@example.com",
  password: "TestPassword123",
  name: "Test User",
};

async function registerUser(overrides: Partial<typeof TEST_USER> = {}) {
  const user = { ...TEST_USER, ...overrides };
  return request(app).post("/graphql").send({
    query: REGISTER_MUTATION,
    variables: user,
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("Integration: Full registration flow", () => {
  it("registers a new user and returns a valid JWT + user data", async () => {
    const res = await registerUser();

    expect(res.status).toBe(200);
    expect(res.body.errors).toBeUndefined();

    const { token, user } = res.body.data.register;

    // Verify user data
    expect(user.id).toBeDefined();
    expect(user.email).toBe(TEST_USER.email);
    expect(user.name).toBe(TEST_USER.name);

    // Verify token is a valid JWT
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
    expect(decoded.userId).toBe(user.id);

    // Verify user is persisted in the in-memory store
    const dbUser = Object.values(store.users).find(
      (u: any) => u.email === TEST_USER.email,
    ) as any;
    expect(dbUser).not.toBeNull();
    expect(dbUser.email).toBe(TEST_USER.email);
    expect(dbUser.name).toBe(TEST_USER.name);
    // Password should be hashed (bcrypt), not stored as plaintext
    expect(dbUser.passwordHash).not.toBe(TEST_USER.password);
    expect(dbUser.passwordHash).toMatch(/^\$2[aby]\$/);
  });
});

describe("Integration: Full login flow", () => {
  it("registers then logs in and returns a valid JWT", async () => {
    // First register the user
    await registerUser();

    // Then login
    const res = await request(app).post("/graphql").send({
      query: LOGIN_MUTATION,
      variables: {
        email: TEST_USER.email,
        password: TEST_USER.password,
      },
    });

    expect(res.status).toBe(200);
    expect(res.body.errors).toBeUndefined();

    const { token, user } = res.body.data.login;

    expect(user.email).toBe(TEST_USER.email);
    expect(user.name).toBe(TEST_USER.name);
    expect(user.id).toBeDefined();

    // Verify token is valid
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
    expect(decoded.userId).toBe(user.id);
  });
});

describe("Integration: Protected resource access (me query)", () => {
  it("returns user data when using token from registration", async () => {
    const registerRes = await registerUser();
    const { token, user: registeredUser } = registerRes.body.data.register;

    const res = await request(app)
      .post("/graphql")
      .set("Authorization", `Bearer ${token}`)
      .send({ query: ME_QUERY });

    expect(res.status).toBe(200);
    expect(res.body.errors).toBeUndefined();

    const me = res.body.data.me;
    expect(me.id).toBe(registeredUser.id);
    expect(me.email).toBe(registeredUser.email);
    expect(me.name).toBe(registeredUser.name);
  });
});

describe("Integration: Invalid token rejection", () => {
  it("rejects me query with a bad token and returns UNAUTHENTICATED error", async () => {
    const res = await request(app)
      .post("/graphql")
      .set("Authorization", "Bearer invalid-token-string")
      .send({ query: ME_QUERY });

    expect(res.status).toBe(200);
    expect(res.body.errors).toBeDefined();
    expect(res.body.errors[0].extensions.code).toBe("UNAUTHENTICATED");
  });
});

describe("Integration: Token expiration", () => {
  it("rejects me query with an expired JWT", async () => {
    // Register a user so we have a real userId in the store
    const registerRes = await registerUser();
    const userId = registerRes.body.data.register.user.id;

    // Create an expired token using expiresIn: '0s' (immediately expired)
    const expiredToken = jwt.sign({ userId }, JWT_SECRET, { expiresIn: "0s" });

    // Small delay to ensure the token has expired
    await new Promise((resolve) => setTimeout(resolve, 50));

    const res = await request(app)
      .post("/graphql")
      .set("Authorization", `Bearer ${expiredToken}`)
      .send({ query: ME_QUERY });

    expect(res.status).toBe(200);
    expect(res.body.errors).toBeDefined();
    expect(res.body.errors[0].extensions.code).toBe("UNAUTHENTICATED");
  });
});

describe("Integration: Concurrent requests", () => {
  it("multiple parallel requests with the same valid token all succeed", async () => {
    const registerRes = await registerUser();
    const { token, user: registeredUser } = registerRes.body.data.register;

    // Fire 5 concurrent me queries with the same token
    const requests = Array.from({ length: 5 }, () =>
      request(app)
        .post("/graphql")
        .set("Authorization", `Bearer ${token}`)
        .send({ query: ME_QUERY }),
    );

    const responses = await Promise.all(requests);

    // All should succeed with the same user data
    for (const res of responses) {
      expect(res.status).toBe(200);
      expect(res.body.errors).toBeUndefined();
      expect(res.body.data.me.id).toBe(registeredUser.id);
      expect(res.body.data.me.email).toBe(registeredUser.email);
    }
  });
});
