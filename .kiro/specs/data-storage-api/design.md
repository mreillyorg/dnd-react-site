# Design Document - Data Storage & API

## Overview

This design implements a GraphQL API layer backed by Prisma ORM with SQLite as the default database provider. The system uses a serialized write queue to handle SQLite's single-writer constraint and is architected to support MySQL as a future provider without code changes.

## Architecture

### High-Level Components

```
┌─────────────────────────────────────────────────────────────┐
│                     GraphQL API Layer                        │
│  (Apollo Server / GraphQL Yoga / Pothos GraphQL)            │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│                   GraphQL Resolvers                          │
│  (Query/Mutation/Subscription handlers)                     │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│                  Business Logic Layer                        │
│  (Services for each feature domain)                         │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│                    Write Queue Layer                         │
│  (Serializes writes for SQLite, bypass for MySQL)          │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│                    Prisma Client                             │
│  (Type-safe database access)                                │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│                  Database Provider                           │
│  SQLite (default) | MySQL (future)                          │
└─────────────────────────────────────────────────────────────┘
```

## Technology Stack

### GraphQL Server
**Choice: GraphQL Yoga**
- Lightweight and modern
- Built-in support for subscriptions
- Easy integration with Prisma
- TypeScript-first design
- Better DX than Apollo Server for our use case

**Alternative considered:** Apollo Server (more features, heavier)

### Schema Definition
**Choice: Pothos GraphQL (Code-First)**
- Type-safe schema generation from TypeScript
- Integrates seamlessly with Prisma
- Better refactoring support than SDL-first
- Plugin ecosystem (validation, authorization, etc.)

**Alternative considered:** SDL-first with GraphQL Code Generator

### Database Layer
**Prisma Client** (already chosen in requirements)

## Database Schema Design

### Core Tables

```prisma
// schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlite" // or "mysql"
  url      = env("DATABASE_URL")
}

model User {
  id            String    @id @default(cuid())
  email         String    @unique
  passwordHash  String
  name          String?
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  
  // Theme preference
  themeMode     ThemeMode @default(SYSTEM)
  
  // Relations
  characters    Character[]
  campaigns     Campaign[]
  sessions      Session[]
  
  @@index([email])
}

enum ThemeMode {
  LIGHT
  DARK
  SYSTEM
}

model Character {
  id            String    @id @default(cuid())
  name          String
  level         Int       @default(1)
  class         String
  race          String
  
  // Core stats
  strength      Int       @default(10)
  dexterity     Int       @default(10)
  constitution  Int       @default(10)
  intelligence  Int       @default(10)
  wisdom        Int       @default(10)
  charisma      Int       @default(10)
  
  maxHp         Int
  currentHp     Int
  tempHp        Int       @default(0)
  armorClass    Int
  
  userId        String
  user          User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  campaignId    String?
  campaign      Campaign? @relation(fields: [campaignId], references: [id], onDelete: SetNull)
  
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  
  // Relations
  itemAssignments ItemAssignment[]
  
  @@index([userId])
  @@index([campaignId])
}

model Campaign {
  id            String    @id @default(cuid())
  name          String
  description   String?
  setting       String?
  status        CampaignStatus @default(PLANNING)
  
  ownerId       String
  owner         User      @relation(fields: [ownerId], references: [id], onDelete: Cascade)
  
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  
  // Relations
  characters    Character[]
  sessions      Session[]
  npcs          NPC[]
  locations     Location[]
  quests        Quest[]
  timelineEntries TimelineEntry[]
  
  @@index([ownerId])
}

enum CampaignStatus {
  PLANNING
  ACTIVE
  ON_HOLD
  COMPLETED
  ARCHIVED
}

// Combat & Initiative
model CombatEncounter {
  id            String    @id @default(cuid())
  name          String?
  isActive      Boolean   @default(true)
  currentRound  Int       @default(1)
  currentTurn   Int       @default(0)
  
  sessionId     String?
  session       Session?  @relation(fields: [sessionId], references: [id], onDelete: SetNull)
  
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  
  combatants    Combatant[]
  
  @@index([sessionId])
}

model Combatant {
  id            String    @id @default(cuid())
  name          String
  initiative    Int
  maxHp         Int
  currentHp     Int
  tempHp        Int       @default(0)
  armorClass    Int
  
  combatantType CombatantType
  
  // Link to character (for PCs)
  characterId   String?
  
  // Link to monster stat block (for NPCs/monsters)
  monsterId     String?
  monster       Monster?  @relation(fields: [monsterId], references: [id])
  
  encounterId   String
  encounter     CombatEncounter @relation(fields: [encounterId], references: [id], onDelete: Cascade)
  
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  
  @@index([encounterId])
}

enum CombatantType {
  PLAYER
  MONSTER
  NPC
}

// Sessions
model Session {
  id            String    @id @default(cuid())
  sessionNumber Int
  title         String?
  realWorldDate DateTime
  inGameDate    String?
  duration      Float?
  
  campaignId    String
  campaign      Campaign  @relation(fields: [campaignId], references: [id], onDelete: Cascade)
  
  dmId          String
  dm            User      @relation(fields: [dmId], references: [id], onDelete: Cascade)
  
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  
  notes         SessionNote[]
  encounters    CombatEncounter[]
  
  @@index([campaignId])
  @@index([dmId])
}

model SessionNote {
  id            String    @id @default(cuid())
  title         String?
  content       String    // Rich text
  isSummary     Boolean   @default(false)
  
  sessionId     String
  session       Session   @relation(fields: [sessionId], references: [id], onDelete: Cascade)
  
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  
  @@index([sessionId])
}

// NPCs
model NPC {
  id            String    @id @default(cuid())
  name          String
  description   String?
  race          String?
  class         String?
  level         Int?
  role          String?   // quest_giver, villain, merchant, ally
  
  locationId    String?
  location      Location? @relation(fields: [locationId], references: [id], onDelete: SetNull)
  
  campaignId    String
  campaign      Campaign  @relation(fields: [campaignId], references: [id], onDelete: Cascade)
  
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  
  @@index([campaignId])
  @@index([locationId])
}

// Locations
model Location {
  id            String    @id @default(cuid())
  name          String
  description   String?
  region        String?
  
  parentId      String?
  parent        Location? @relation("LocationHierarchy", fields: [parentId], references: [id], onDelete: SetNull)
  children      Location[] @relation("LocationHierarchy")
  
  campaignId    String
  campaign      Campaign  @relation(fields: [campaignId], references: [id], onDelete: Cascade)
  
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  
  npcs          NPC[]
  
  @@index([campaignId])
  @@index([parentId])
}

// Quests
model Quest {
  id            String    @id @default(cuid())
  name          String
  description   String?
  status        QuestStatus @default(NOT_STARTED)
  rewards       String?
  
  campaignId    String
  campaign      Campaign  @relation(fields: [campaignId], references: [id], onDelete: Cascade)
  
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  
  @@index([campaignId])
}

enum QuestStatus {
  NOT_STARTED
  ACTIVE
  COMPLETED
  FAILED
}

// Timeline
model TimelineEntry {
  id            String    @id @default(cuid())
  title         String?
  description   String
  inGameDate    String
  
  campaignId    String
  campaign      Campaign  @relation(fields: [campaignId], references: [id], onDelete: Cascade)
  
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  
  @@index([campaignId])
}

// Monsters
model Monster {
  id            String    @id @default(cuid())
  name          String
  size          String
  type          String
  alignment     String?
  armorClass    Int
  hitPoints     Int
  hitDice       String
  speed         String
  
  // Ability scores
  strength      Int
  dexterity     Int
  constitution  Int
  intelligence  Int
  wisdom        Int
  charisma      Int
  
  challengeRating Float
  source        MonsterSource @default(HOMEBREW)
  
  // JSON fields for complex data
  abilities     String    // JSON
  actions       String    // JSON
  reactions     String?   // JSON
  legendaryActions String? // JSON
  
  dndbeyondLink String?
  
  createdById   String?
  
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  
  combatants    Combatant[]
  
  @@index([type])
  @@index([challengeRating])
}

enum MonsterSource {
  SRD
  HOMEBREW
  THIRD_PARTY
}

// Items
model Item {
  id            String    @id @default(cuid())
  name          String
  description   String
  itemType      ItemType
  rarity        ItemRarity
  attunementRequired Boolean @default(false)
  weight        Float?
  value         Int?      // In gold pieces
  
  source        ItemSource @default(HOMEBREW)
  
  createdById   String?
  
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  
  assignments   ItemAssignment[]
  
  @@index([itemType])
  @@index([rarity])
}

enum ItemType {
  WEAPON
  ARMOR
  WONDROUS_ITEM
  POTION
  SCROLL
  RING
  ROD
  STAFF
  WAND
  OTHER
}

enum ItemRarity {
  COMMON
  UNCOMMON
  RARE
  VERY_RARE
  LEGENDARY
  ARTIFACT
}

enum ItemSource {
  SRD
  HOMEBREW
  THIRD_PARTY
}

model ItemAssignment {
  id            String    @id @default(cuid())
  quantity      Int       @default(1)
  equipped      Boolean   @default(false)
  attuned       Boolean   @default(false)
  identified    Boolean   @default(true)
  
  itemId        String
  item          Item      @relation(fields: [itemId], references: [id], onDelete: Cascade)
  
  characterId   String
  character     Character @relation(fields: [characterId], references: [id], onDelete: Cascade)
  
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  
  @@index([characterId])
  @@index([itemId])
}
```

## Write Queue Implementation

### SQLite Write Queue

```typescript
// src/lib/db/writeQueue.ts

import { PrismaClient } from '@prisma/client';

type WriteOperation<T = any> = {
  id: string;
  operation: () => Promise<T>;
  resolve: (value: T) => void;
  reject: (error: Error) => void;
};

class WriteQueue {
  private queue: WriteOperation[] = [];
  private processing = false;
  private readonly enabled: boolean;

  constructor(enabled: boolean) {
    this.enabled = enabled;
  }

  async enqueue<T>(operation: () => Promise<T>): Promise<T> {
    // Bypass queue for MySQL
    if (!this.enabled) {
      return operation();
    }

    return new Promise<T>((resolve, reject) => {
      const op: WriteOperation<T> = {
        id: crypto.randomUUID(),
        operation,
        resolve,
        reject,
      };

      this.queue.push(op);
      this.processQueue();
    });
  }

  private async processQueue(): Promise<void> {
    if (this.processing || this.queue.length === 0) {
      return;
    }

    this.processing = true;

    while (this.queue.length > 0) {
      const op = this.queue.shift()!;

      try {
        const result = await op.operation();
        op.resolve(result);
      } catch (error) {
        op.reject(error as Error);
      }
    }

    this.processing = false;
  }
}

// Singleton instance
export const writeQueue = new WriteQueue(
  process.env.DATABASE_PROVIDER === 'sqlite'
);
```

### Prisma Client Setup

```typescript
// src/lib/db/prisma.ts

import { PrismaClient } from '@prisma/client';

const prismaClientSingleton = () => {
  const prisma = new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

  // SQLite-specific configuration
  if (process.env.DATABASE_PROVIDER === 'sqlite') {
    prisma.$executeRawUnsafe('PRAGMA foreign_keys = ON');
    prisma.$executeRawUnsafe('PRAGMA synchronous = FULL');
  }

  return prisma;
};

declare global {
  var prismaGlobal: undefined | ReturnType<typeof prismaClientSingleton>;
}

export const prisma = globalThis.prismaGlobal ?? prismaClientSingleton();

if (process.env.NODE_ENV !== 'production') {
  globalThis.prismaGlobal = prisma;
}

// Run migrations on startup
export async function initializeDatabase() {
  try {
    await prisma.$executeRawUnsafe('SELECT 1');
    console.log('Database connection established');
    
    // Run pending migrations
    if (process.env.NODE_ENV === 'production') {
      const { execSync } = require('child_process');
      execSync('npx prisma migrate deploy', { stdio: 'inherit' });
    }
  } catch (error) {
    console.error('Failed to initialize database:', error);
    throw error;
  }
}
```

## GraphQL Schema Design

### Type Definitions (Pothos)

```typescript
// src/graphql/schema.ts

import SchemaBuilder from '@pothos/core';
import PrismaPlugin from '@pothos/plugin-prisma';
import type PrismaTypes from '@pothos/plugin-prisma/generated';
import { prisma } from '../lib/db/prisma';

export const builder = new SchemaBuilder<{
  PrismaTypes: PrismaTypes;
  Context: {
    prisma: typeof prisma;
    userId?: string;
  };
}>({
  plugins: [PrismaPlugin],
  prisma: {
    client: prisma,
  },
});

// Root types
builder.queryType({});
builder.mutationType({});

export const schema = builder.toSchema();
```

### Example Types

```typescript
// src/graphql/types/User.ts

import { builder } from '../schema';

builder.prismaObject('User', {
  fields: (t) => ({
    id: t.exposeID('id'),
    email: t.exposeString('email'),
    name: t.exposeString('name', { nullable: true }),
    themeMode: t.expose('themeMode', { type: ThemeModeEnum }),
    createdAt: t.expose('createdAt', { type: 'DateTime' }),
    characters: t.relation('characters'),
    campaigns: t.relation('campaigns'),
  }),
});

const ThemeModeEnum = builder.enumType('ThemeMode', {
  values: ['LIGHT', 'DARK', 'SYSTEM'] as const,
});

// Queries
builder.queryField('me', (t) =>
  t.prismaField({
    type: 'User',
    nullable: true,
    resolve: async (query, _root, _args, ctx) => {
      if (!ctx.userId) return null;
      return ctx.prisma.user.findUnique({
        ...query,
        where: { id: ctx.userId },
      });
    },
  })
);

// Mutations
builder.mutationField('updateThemeMode', (t) =>
  t.prismaField({
    type: 'User',
    args: {
      mode: t.arg({ type: ThemeModeEnum, required: true }),
    },
    resolve: async (query, _root, args, ctx) => {
      if (!ctx.userId) throw new Error('Not authenticated');
      
      return ctx.prisma.user.update({
        ...query,
        where: { id: ctx.userId },
        data: { themeMode: args.mode },
      });
    },
  })
);
```

## GraphQL Server Setup

```typescript
// src/graphql/server.ts

import { createYoga } from 'graphql-yoga';
import { schema } from './schema';
import { prisma } from '../lib/db/prisma';

export const yoga = createYoga({
  schema,
  context: async ({ request }) => {
    // Extract user from JWT/session
    const userId = await getUserIdFromRequest(request);
    
    return {
      prisma,
      userId,
    };
  },
  graphiql: process.env.NODE_ENV === 'development',
});

async function getUserIdFromRequest(request: Request): Promise<string | undefined> {
  // TODO: Implement JWT/session parsing
  const authHeader = request.headers.get('authorization');
  if (!authHeader) return undefined;
  
  // Parse JWT and extract userId
  // ...
  
  return undefined;
}
```

## File Structure

```
src/
├── lib/
│   └── db/
│       ├── prisma.ts           # Prisma client setup
│       └── writeQueue.ts       # Write queue for SQLite
├── graphql/
│   ├── schema.ts               # Schema builder setup
│   ├── server.ts               # GraphQL Yoga server
│   └── types/
│       ├── User.ts
│       ├── Character.ts
│       ├── Campaign.ts
│       ├── Combat.ts
│       ├── Item.ts
│       └── Monster.ts
├── services/                   # Business logic
│   ├── userService.ts
│   ├── characterService.ts
│   ├── campaignService.ts
│   └── ...
└── main.tsx                    # Entry point

prisma/
├── schema.prisma
└── migrations/
```

## Environment Variables

```bash
# .env
DATABASE_URL="file:./dev.db"
DATABASE_PROVIDER="sqlite"  # or "mysql"
NODE_ENV="development"
JWT_SECRET="your-secret-key"
```

## Migration Strategy

### Initial Setup
```bash
npx prisma migrate dev --name init
npx prisma generate
```

### Provider Switching
To switch from SQLite to MySQL:
1. Update `DATABASE_URL` in `.env`
2. Update `provider` in `schema.prisma` to `"mysql"`
3. Run `npx prisma migrate deploy`
4. Restart application (write queue will automatically disable)

## Testing Strategy

### Unit Tests

**Test Framework:** Vitest
**Test Location:** Co-located with source files

#### Prisma Service Tests

```typescript
// src/lib/db/prisma.test.ts

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { prisma } from './prisma';

describe('Prisma Client', () => {
  beforeEach(async () => {
    // Clear test database
    await prisma.user.deleteMany();
  });

  afterEach(async () => {
    await prisma.$disconnect();
  });

  it('should connect to database', async () => {
    const result = await prisma.$queryRaw`SELECT 1 as value`;
    expect(result).toBeDefined();
  });

  it('should create a user', async () => {
    const user = await prisma.user.create({
      data: {
        email: 'test@example.com',
        passwordHash: 'hashedpassword',
        name: 'Test User',
      },
    });

    expect(user.id).toBeDefined();
    expect(user.email).toBe('test@example.com');
  });

  it('should enforce unique email constraint', async () => {
    await prisma.user.create({
      data: {
        email: 'test@example.com',
        passwordHash: 'hashedpassword',
      },
    });

    await expect(
      prisma.user.create({
        data: {
          email: 'test@example.com',
          passwordHash: 'hashedpassword',
        },
      })
    ).rejects.toThrow();
  });
});
```

#### Write Queue Tests

```typescript
// src/lib/db/writeQueue.test.ts

import { describe, it, expect, vi } from 'vitest';
import { writeQueue } from './writeQueue';

describe('Write Queue', () => {
  it('should execute operations in order', async () => {
    const results: number[] = [];

    const promises = [
      writeQueue.enqueue(async () => {
        await new Promise((resolve) => setTimeout(resolve, 50));
        results.push(1);
        return 1;
      }),
      writeQueue.enqueue(async () => {
        results.push(2);
        return 2;
      }),
      writeQueue.enqueue(async () => {
        results.push(3);
        return 3;
      }),
    ];

    await Promise.all(promises);

    expect(results).toEqual([1, 2, 3]);
  });

  it('should handle errors without breaking the queue', async () => {
    const successOp = vi.fn().mockResolvedValue('success');
    const errorOp = vi.fn().mockRejectedValue(new Error('test error'));

    await writeQueue.enqueue(successOp);

    await expect(writeQueue.enqueue(errorOp)).rejects.toThrow('test error');

    await writeQueue.enqueue(successOp);

    expect(successOp).toHaveBeenCalledTimes(2);
  });
});
```

### Integration Tests

#### GraphQL API Tests

```typescript
// src/graphql/__tests__/integration.test.ts

import { describe, it, expect, beforeEach } from 'vitest';
import { yoga } from '../server';
import { prisma } from '../../lib/db/prisma';

describe('GraphQL API Integration', () => {
  beforeEach(async () => {
    await prisma.user.deleteMany();
  });

  it('should execute a simple query', async () => {
    const response = await yoga.fetch('http://localhost/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: `
          query {
            __typename
          }
        `,
      }),
    });

    const result = await response.json();
    expect(result.data.__typename).toBe('Query');
  });

  it('should handle mutations', async () => {
    const response = await yoga.fetch('http://localhost/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: `
          mutation Register($email: String!, $password: String!) {
            register(email: $email, password: $password) {
              token
              user {
                email
              }
            }
          }
        `,
        variables: {
          email: 'test@example.com',
          password: 'TestPassword123',
        },
      }),
    });

    const result = await response.json();
    expect(result.data.register.user.email).toBe('test@example.com');
    expect(result.data.register.token).toBeDefined();
  });

  it('should require authentication for protected queries', async () => {
    const response = await yoga.fetch('http://localhost/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: `
          query {
            me {
              email
            }
          }
        `,
      }),
    });

    const result = await response.json();
    expect(result.data.me).toBeNull();
  });
});
```

### Test Database Setup

```typescript
// src/test/setup.ts

import { PrismaClient } from '@prisma/client';
import { beforeAll, afterAll } from 'vitest';

const testPrisma = new PrismaClient({
  datasources: {
    db: {
      url: 'file:./test.db',
    },
  },
});

beforeAll(async () => {
  // Run migrations on test database
  const { execSync } = require('child_process');
  execSync('DATABASE_URL="file:./test.db" npx prisma migrate deploy', {
    stdio: 'inherit',
  });
});

afterAll(async () => {
  await testPrisma.$disconnect();
});
```

### Test Configuration

```typescript
// vitest.config.ts

import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./src/test/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'html'],
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.test.ts', 'src/test/**'],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 80,
        statements: 80,
      },
    },
  },
});
```

### Required Test Coverage

All implementations MUST include:

1. **Unit tests** for:
   - Database operations (CRUD)
   - Business logic services
   - Write queue operations
   - Data validation

2. **Integration tests** for:
   - GraphQL queries and mutations
   - Authentication flow
   - Database transactions
   - Error handling

3. **Minimum coverage**: 80% across lines, functions, branches, and statements

4. **Test commands**:
   ```bash
   # Run tests
   npm run test

   # Run tests with coverage
   npm run test:coverage

   # Run tests in watch mode during development
   npm run test:watch
   ```

## Next Steps

1. Implement authentication/authorization layer (with tests)
2. Add data validation with Zod or similar (with tests)
3. Implement error handling middleware (with tests)
4. Add GraphQL subscriptions for real-time features (with tests)
5. Add rate limiting and security middleware (with tests)
