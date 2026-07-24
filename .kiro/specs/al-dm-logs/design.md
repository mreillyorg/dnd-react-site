# Design Document - Adventurer's League DM Logs

## Overview

AL DM Logs enables Dungeon Masters to generate formatted documentation for official D&D Adventurer's League organized play. The system tracks player rosters, advancement, treasure, magic items, and DM rewards, then exports formatted PDF logs.

## Architecture

```
┌──────────────────────────────────────────┐
│       React AL Log UI                    │
│  (Session form, player roster, export)   │
└──────────┬───────────────────────────────┘
           │
           ▼
┌──────────────────────────────────────────┐
│       AL Log Hooks / State               │
│  (useAlSession, useExport)               │
└──────────┬───────────────────────────────┘
           │
           ▼
┌──────────────────────────────────────────┐
│       GraphQL AL Log API                 │
│  (AL Session CRUD, Player Roster, Export)│
└──────────┬───────────────────────────────┘
           │
           ▼
┌──────────────────────────────────────────┐
│       AL Log Service                     │
│  (Calculations, validation, PDF gen)     │
└──────────┬───────────────────────────────┘
           │
           ▼
┌──────────────────────────────────────────┐
│       Prisma / Database                  │
│  (AlSession, AlPlayer, AlReward tables)  │
└──────────────────────────────────────────┘
```

## Database Schema

```prisma
model AlSession {
  id             String   @id @default(cuid())
  alCode         String   // e.g., "DDAL09-01"
  adventureTitle String
  sessionDate    DateTime
  sessionDuration Float    // hours (2 or 4 standard)
  location       String?
  alSeason       Int      @default(9)
  notes          String?

  campaignId     String
  campaign       Campaign @relation(fields: [campaignId], references: [id], onDelete: Cascade)

  dmId           String
  dm             User     @relation(fields: [dmId], references: [id])

  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  players        AlPlayer[]
  rewards        AlReward[]

  @@index([campaignId])
  @@index([dmId])
}

model AlPlayer {
  id              String   @id @default(cuid())
  playerName      String
  dciNumber       String?
  characterName   String
  characterClass  String
  startingLevel   Int
  endingLevel     Int

  alSessionId     String
  alSession       AlSession @relation(fields: [alSessionId], references: [id], onDelete: Cascade)

  rewards         AlReward[]

  @@index([alSessionId])
}

model AlReward {
  id              String  @id @default(cuid())
  rewardType      String  // "advancement", "treasure", "magic_item", "downtime", "story_award"
  description     String?
  quantity        Float?  // checkpoints, gold, days

  alSessionId     String
  alSession       AlSession @relation(fields: [alSessionId], references: [id], onDelete: Cascade)

  alPlayerId      String?
  alPlayer        AlPlayer? @relation(fields: [alPlayerId], references: [id], onDelete: SetNull)

  @@index([alSessionId])
  @@index([alPlayerId])
}
```

## Core Logic

```typescript
// src/services/alLogService.ts

export function calculateAdvancementCheckpoints(
  durationHours: number,
  season: number
): number {
  if (season < 9) return 0; // Pre-season 9 uses XP
  return durationHours >= 4 ? 2 : 1;
}

export function calculateTreasureCheckpoints(
  durationHours: number,
  season: number
): number {
  if (season < 9) return 0; // Pre-season 9 uses gold directly
  return durationHours >= 4 ? 2 : 1;
}

export function calculateDowntimeDays(durationHours: number): number {
  return durationHours >= 4 ? 10 : 5;
}

export function validateAlCode(code: string): boolean {
  return /^(DDAL|CCC|DDEP|DDHC)\d{2}-\d{2,3}$/i.test(code) || /^CCC-[A-Z]+-\d{2}-\d{2}$/i.test(code);
}

export function validateDciNumber(dci: string): boolean {
  return /^\d{10}$/.test(dci);
}

export function validatePlayerCount(count: number): { valid: boolean; warning?: string } {
  if (count < 3) return { valid: false, warning: 'AL requires minimum 3 players' };
  if (count > 7) return { valid: false, warning: 'AL allows maximum 7 players' };
  return { valid: true };
}
```

## GraphQL Schema

```graphql
type Mutation {
  createAlSession(campaignId: ID!, input: AlSessionInput!): AlSession!
  updateAlSession(id: ID!, input: AlSessionInput!): AlSession!
  deleteAlSession(id: ID!): Boolean!
  addAlPlayer(sessionId: ID!, input: AlPlayerInput!): AlPlayer!
  removeAlPlayer(playerId: ID!): Boolean!
  addAlReward(sessionId: ID!, input: AlRewardInput!): AlReward!
  exportAlLog(sessionId: ID!): AlLogExport!
}

type Query {
  alSession(id: ID!): AlSession
  alSessionHistory(campaignId: ID!): [AlSession!]!
  dmLogSummary: DmLogSummary!
}

type AlLogExport {
  url: String!
  expiresAt: DateTime!
}
```

## Frontend Components

- `AlSessionForm`: AL code, title, date, duration, location
- `PlayerRosterEditor`: Add/remove players with DCI validation
- `RewardDistributor`: Assign rewards to players
- `AlLogPreview`: Preview formatted log before export
- `AlLogHistory`: Past sessions with re-export option
- `DmSummaryDashboard`: Total sessions, advancement awarded

## Testing Strategy

### Required Tests

1. **Unit tests**:
   - Advancement checkpoint calculation
   - Treasure checkpoint calculation
   - Downtime days calculation
   - AL code validation
   - DCI number validation
   - Player count validation

2. **GraphQL tests**:
   - AL session CRUD
   - Player roster management
   - Reward distribution
   - Export generation
   - DM-only authorization

3. **Frontend tests**:
   - Session form with validation
   - Player roster editor
   - Reward distributor
   - Log preview rendering
   - History list

4. **Integration tests**:
   - Full session creation flow
   - Export generation and download
   - Session duplication for repeat runs

**Minimum coverage**: 80%
