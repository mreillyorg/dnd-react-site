/**
 * HP Tracker integration tests.
 *
 * Tests the full GraphQL mutation flow for damage, healing, temp HP,
 * and combatant management through the Express + Apollo Server stack
 * with an in-memory mock Prisma store.
 *
 * Authentication uses cookie-based sessions (AuthSession model) instead of JWT.
 */

// @vitest-environment node

import http from "node:http";
import crypto from "node:crypto";

import { ApolloServer } from "@apollo/server";
import { ApolloServerPluginDrainHttpServer } from "@apollo/server/plugin/drainHttpServer";
import { expressMiddleware } from "@as-integrations/express5";
import cookieParser from "cookie-parser";
import express from "express";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { createQueue } from "../db/operationQueue.ts";
import { formatGraphQLError } from "../errors/formatGraphQLError.ts";
import { createContextFactory } from "../graphql/context.ts";
import { schema } from "../graphql/schema/index.ts";

// ---------------------------------------------------------------------------
// Test Setup
// ---------------------------------------------------------------------------

let app: express.Express;
let apolloServer: ApolloServer;
let store: {
  users: Record<string, any>;
  combatants: Record<string, any>;
  encounters: Record<string, any>;
  authSessions: Record<string, any>;
};

let idCounter = 0;
const nextId = () => `cuid_${++idCounter}`;

beforeAll(async () => {
  store = { users: {}, combatants: {}, encounters: {}, authSessions: {} };

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
    combatant: {
      create: async ({ data }: any) => {
        const combatant = {
          id: nextId(),
          name: data.name,
          initiative: data.initiative,
          maxHp: data.maxHp,
          currentHp: data.currentHp,
          tempHp: data.tempHp ?? 0,
          armorClass: data.armorClass,
          combatantType: data.combatantType,
          characterId: data.characterId ?? null,
          monsterId: data.monsterId ?? null,
          encounterId: data.encounterId,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        store.combatants[combatant.id] = combatant;
        return combatant;
      },
      findUnique: async ({ where }: any) => {
        return store.combatants[where.id] || null;
      },
      findMany: async ({ where }: any) => {
        if (where?.encounterId) {
          return Object.values(store.combatants).filter(
            (c: any) => c.encounterId === where.encounterId,
          );
        }
        return Object.values(store.combatants);
      },
      update: async ({ where, data }: any) => {
        const combatant = store.combatants[where.id];
        if (!combatant) throw new Error("Combatant not found");
        Object.assign(combatant, data, { updatedAt: new Date() });
        return combatant;
      },
      delete: async ({ where }: any) => {
        const combatant = store.combatants[where.id];
        if (!combatant) throw new Error("Combatant not found");
        delete store.combatants[where.id];
        return combatant;
      },
    },
    combatEncounter: {
      create: async ({ data }: any) => {
        const encounter = {
          id: nextId(),
          name: data.name ?? null,
          isActive: data.isActive ?? false,
          currentRound: data.currentRound ?? 1,
          currentTurn: data.currentTurn ?? 0,
          sessionId: data.sessionId ?? null,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        store.encounters[encounter.id] = encounter;
        return encounter;
      },
      findUnique: async ({ where }: any) => {
        return store.encounters[where.id] || null;
      },
      findMany: async ({ where }: any) => {
        if (where?.sessionId) {
          return Object.values(store.encounters).filter(
            (e: any) => e.sessionId === where.sessionId,
          );
        }
        return Object.values(store.encounters);
      },
      update: async ({ where, data }: any) => {
        const encounter = store.encounters[where.id];
        if (!encounter) throw new Error("Encounter not found");
        Object.assign(encounter, data, { updatedAt: new Date() });
        return encounter;
      },
      delete: async ({ where }: any) => {
        const encounter = store.encounters[where.id];
        if (!encounter) throw new Error("Encounter not found");
        delete store.encounters[where.id];
        return encounter;
      },
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

  expressApp.use(cookieParser());
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
  store.users = {};
  store.combatants = {};
  store.encounters = {};
  store.authSessions = {};
});

// ---------------------------------------------------------------------------
// GraphQL Queries & Mutations
// ---------------------------------------------------------------------------

const CREATE_ENCOUNTER_MUTATION = `
  mutation CreateEncounter($input: CreateCombatEncounterInput!) {
    createCombatEncounter(input: $input) {
      id name isActive currentRound currentTurn
    }
  }
`;

const CREATE_COMBATANT_MUTATION = `
  mutation CreateCombatant($input: CreateCombatantInput!) {
    createCombatant(input: $input) {
      id name initiative maxHp currentHp tempHp armorClass combatantType encounterId
    }
  }
`;

const APPLY_DAMAGE_MUTATION = `
  mutation ApplyDamage($combatantId: ID!, $damage: Int!) {
    applyDamage(combatantId: $combatantId, damage: $damage) {
      id name maxHp currentHp tempHp
    }
  }
`;

const APPLY_HEALING_MUTATION = `
  mutation ApplyHealing($combatantId: ID!, $healing: Int!) {
    applyHealing(combatantId: $combatantId, healing: $healing) {
      id name maxHp currentHp tempHp
    }
  }
`;

const SET_TEMP_HP_MUTATION = `
  mutation SetTempHp($combatantId: ID!, $tempHp: Int!) {
    setTempHp(combatantId: $combatantId, tempHp: $tempHp) {
      id name maxHp currentHp tempHp
    }
  }
`;

const GET_COMBATANT_QUERY = `
  query GetCombatant($id: ID!) {
    combatant(id: $id) {
      id name maxHp currentHp tempHp
    }
  }
`;

const GET_COMBATANTS_QUERY = `
  query GetCombatants($encounterId: ID!) {
    combatants(encounterId: $encounterId) {
      id name initiative maxHp currentHp tempHp armorClass combatantType encounterId
    }
  }
`;

// ---------------------------------------------------------------------------
// Test Helpers
// ---------------------------------------------------------------------------

/**
 * Creates a user directly in the store and returns a session cookie string.
 */
function createAuthenticatedUser(email = "hptest@example.com", name = "HP Tester") {
  const userId = nextId();
  store.users[userId] = {
    id: userId,
    email,
    name,
    themeMode: "SYSTEM",
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const token = crypto.randomBytes(32).toString("hex");
  store.authSessions[token] = {
    id: nextId(),
    token,
    userId,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    createdAt: new Date(),
  };

  return { userId, token, cookie: `session=${token}` };
}

async function createEncounter(cookie: string, name = "Test Encounter") {
  const res = await request(app)
    .post("/graphql")
    .set("Cookie", cookie)
    .send({
      query: CREATE_ENCOUNTER_MUTATION,
      variables: { input: { name } },
    });
  return res.body.data.createCombatEncounter;
}

async function createCombatant(
  cookie: string,
  encounterId: string,
  overrides: Partial<{
    name: string;
    initiative: number;
    maxHp: number;
    currentHp: number;
    tempHp: number;
    armorClass: number;
    combatantType: string;
  }> = {},
) {
  const input = {
    name: "Test Combatant",
    initiative: 15,
    maxHp: 50,
    currentHp: 50,
    tempHp: 0,
    armorClass: 14,
    combatantType: "PLAYER",
    encounterId,
    ...overrides,
  };

  const res = await request(app)
    .post("/graphql")
    .set("Cookie", cookie)
    .send({
      query: CREATE_COMBATANT_MUTATION,
      variables: { input },
    });

  return res.body.data.createCombatant;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("Integration: Full damage flow", () => {
  it("applies damage and updates the combatant HP in the store", async () => {
    const { cookie } = createAuthenticatedUser();
    const encounter = await createEncounter(cookie);
    const combatant = await createCombatant(cookie, encounter.id, {
      maxHp: 50,
      currentHp: 50,
    });

    // Apply 20 damage
    const damageRes = await request(app)
      .post("/graphql")
      .set("Cookie", cookie)
      .send({
        query: APPLY_DAMAGE_MUTATION,
        variables: { combatantId: combatant.id, damage: 20 },
      });

    expect(damageRes.status).toBe(200);
    expect(damageRes.body.errors).toBeUndefined();

    const updated = damageRes.body.data.applyDamage;
    expect(updated.currentHp).toBe(30);
    expect(updated.maxHp).toBe(50);
    expect(updated.tempHp).toBe(0);

    // Verify via query that the DB reflects the change
    const queryRes = await request(app)
      .post("/graphql")
      .send({
        query: GET_COMBATANT_QUERY,
        variables: { id: combatant.id },
      });

    expect(queryRes.body.data.combatant.currentHp).toBe(30);
    expect(queryRes.body.data.combatant.maxHp).toBe(50);
  });
});

describe("Integration: Full healing flow", () => {
  it("applies healing and caps HP at maxHp", async () => {
    const { cookie } = createAuthenticatedUser();
    const encounter = await createEncounter(cookie);
    const combatant = await createCombatant(cookie, encounter.id, {
      maxHp: 50,
      currentHp: 30,
    });

    // Apply 10 healing
    const healRes = await request(app)
      .post("/graphql")
      .set("Cookie", cookie)
      .send({
        query: APPLY_HEALING_MUTATION,
        variables: { combatantId: combatant.id, healing: 10 },
      });

    expect(healRes.status).toBe(200);
    expect(healRes.body.errors).toBeUndefined();

    const updated = healRes.body.data.applyHealing;
    expect(updated.currentHp).toBe(40);
    expect(updated.maxHp).toBe(50);

    // Verify via query
    const queryRes = await request(app)
      .post("/graphql")
      .send({
        query: GET_COMBATANT_QUERY,
        variables: { id: combatant.id },
      });

    expect(queryRes.body.data.combatant.currentHp).toBe(40);
  });

  it("does not heal above maxHp", async () => {
    const { cookie } = createAuthenticatedUser();
    const encounter = await createEncounter(cookie);
    const combatant = await createCombatant(cookie, encounter.id, {
      maxHp: 50,
      currentHp: 45,
    });

    // Apply 20 healing (would exceed max)
    const healRes = await request(app)
      .post("/graphql")
      .set("Cookie", cookie)
      .send({
        query: APPLY_HEALING_MUTATION,
        variables: { combatantId: combatant.id, healing: 20 },
      });

    expect(healRes.body.data.applyHealing.currentHp).toBe(50);
  });
});

describe("Integration: Temp HP flow", () => {
  it("sets temp HP and temp absorbs damage before current HP", async () => {
    const { cookie } = createAuthenticatedUser();
    const encounter = await createEncounter(cookie);
    const combatant = await createCombatant(cookie, encounter.id, {
      maxHp: 50,
      currentHp: 50,
      tempHp: 0,
    });

    // Set temp HP to 10
    const tempRes = await request(app)
      .post("/graphql")
      .set("Cookie", cookie)
      .send({
        query: SET_TEMP_HP_MUTATION,
        variables: { combatantId: combatant.id, tempHp: 10 },
      });

    expect(tempRes.status).toBe(200);
    expect(tempRes.body.errors).toBeUndefined();
    expect(tempRes.body.data.setTempHp.tempHp).toBe(10);

    // Apply 15 damage: 10 absorbed by temp, 5 from current HP
    const damageRes = await request(app)
      .post("/graphql")
      .set("Cookie", cookie)
      .send({
        query: APPLY_DAMAGE_MUTATION,
        variables: { combatantId: combatant.id, damage: 15 },
      });

    expect(damageRes.body.errors).toBeUndefined();

    const updated = damageRes.body.data.applyDamage;
    expect(updated.tempHp).toBe(0);
    expect(updated.currentHp).toBe(45);
    expect(updated.maxHp).toBe(50);
  });
});

describe("Integration: Multiple combatants", () => {
  it("damaging one combatant does not affect the other", async () => {
    const { cookie } = createAuthenticatedUser();
    const encounter = await createEncounter(cookie);

    const combatant1 = await createCombatant(cookie, encounter.id, {
      name: "Fighter",
      maxHp: 50,
      currentHp: 50,
    });
    const combatant2 = await createCombatant(cookie, encounter.id, {
      name: "Wizard",
      maxHp: 30,
      currentHp: 30,
    });

    // Damage only combatant1
    await request(app)
      .post("/graphql")
      .set("Cookie", cookie)
      .send({
        query: APPLY_DAMAGE_MUTATION,
        variables: { combatantId: combatant1.id, damage: 10 },
      });

    // Verify combatant1 is damaged
    const query1 = await request(app)
      .post("/graphql")
      .send({
        query: GET_COMBATANT_QUERY,
        variables: { id: combatant1.id },
      });
    expect(query1.body.data.combatant.currentHp).toBe(40);

    // Verify combatant2 is unchanged
    const query2 = await request(app)
      .post("/graphql")
      .send({
        query: GET_COMBATANT_QUERY,
        variables: { id: combatant2.id },
      });
    expect(query2.body.data.combatant.currentHp).toBe(30);
  });
});

describe("Integration: Encounter creation with combatants", () => {
  it("creates an encounter, adds multiple combatants, and queries them all back", async () => {
    const { cookie } = createAuthenticatedUser();
    const encounter = await createEncounter(cookie, "Boss Fight");

    expect(encounter.name).toBe("Boss Fight");
    expect(encounter.isActive).toBe(false);

    // Add multiple combatants with different initiatives
    const paladin = await createCombatant(cookie, encounter.id, {
      name: "Paladin",
      initiative: 18,
      maxHp: 60,
      currentHp: 60,
      armorClass: 18,
      combatantType: "PLAYER",
    });
    const goblin = await createCombatant(cookie, encounter.id, {
      name: "Goblin",
      initiative: 12,
      maxHp: 7,
      currentHp: 7,
      armorClass: 13,
      combatantType: "MONSTER",
    });
    const npc = await createCombatant(cookie, encounter.id, {
      name: "Friendly NPC",
      initiative: 8,
      maxHp: 20,
      currentHp: 20,
      armorClass: 10,
      combatantType: "NPC",
    });

    // Query combatants by encounterId
    const queryRes = await request(app)
      .post("/graphql")
      .send({
        query: GET_COMBATANTS_QUERY,
        variables: { encounterId: encounter.id },
      });

    expect(queryRes.status).toBe(200);
    expect(queryRes.body.errors).toBeUndefined();

    const combatants = queryRes.body.data.combatants;
    expect(combatants).toHaveLength(3);

    // Verify all combatants are present
    const names = combatants.map((c: any) => c.name).sort();
    expect(names).toEqual(["Friendly NPC", "Goblin", "Paladin"]);

    // Verify each combatant has correct data
    const paladinResult = combatants.find((c: any) => c.name === "Paladin");
    expect(paladinResult.maxHp).toBe(60);
    expect(paladinResult.initiative).toBe(18);
    expect(paladinResult.combatantType).toBe("PLAYER");
    expect(paladinResult.encounterId).toBe(encounter.id);

    const goblinResult = combatants.find((c: any) => c.name === "Goblin");
    expect(goblinResult.maxHp).toBe(7);
    expect(goblinResult.combatantType).toBe("MONSTER");

    const npcResult = combatants.find((c: any) => c.name === "Friendly NPC");
    expect(npcResult.maxHp).toBe(20);
    expect(npcResult.combatantType).toBe("NPC");
  });
});
