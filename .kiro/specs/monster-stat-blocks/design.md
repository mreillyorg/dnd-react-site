# Design Document - Monster Stat Blocks

## Overview

Monster Stat Blocks provides DMs with access to SRD monsters, custom monster creation, stat block popovers during combat, and D&D Beyond integration links. It integrates tightly with the Combat Tracker.

## Architecture

```
┌──────────────────────────────────────────┐
│       React Monster UI                   │
│  (Stat Block Popover, Monster Library)   │
└──────────┬───────────────────────────────┘
           │
           ▼
┌──────────────────────────────────────────┐
│       Monster Hooks / State              │
│  (useMonster, useStatBlockPopover)       │
└──────────┬───────────────────────────────┘
           │
           ▼
┌──────────────────────────────────────────┐
│       GraphQL Monster API                │
│  (Query, CRUD, search/filter)            │
└──────────┬───────────────────────────────┘
           │
           ▼
┌──────────────────────────────────────────┐
│       Monster Service                    │
│  (Validation, search, filtering)         │
└──────────┬───────────────────────────────┘
           │
           ▼
┌──────────────────────────────────────────┐
│       Prisma / Database                  │
│  (Monster table with JSON fields)        │
└──────────────────────────────────────────┘
```

## Database Schema

Uses Monster model from data-storage-api design.

## Core Logic

```typescript
// src/services/monsterService.ts

export function validateHitDiceFormula(formula: string): boolean {
  return /^\d+d\d+(\+\d+)?$/.test(formula);
}

export function calculateAverageHp(formula: string): number {
  const match = formula.match(/^(\d+)d(\d+)(\+(\d+))?$/);
  if (!match) return 0;
  const [, count, sides, , bonus] = match;
  const avg = parseInt(count) * ((parseInt(sides) + 1) / 2);
  return Math.floor(avg + (bonus ? parseInt(bonus) : 0));
}

export function calculateXpByCr(cr: number): number {
  const xpTable: Record<number, number> = {
    0: 10, 0.125: 25, 0.25: 50, 0.5: 100,
    1: 200, 2: 450, 3: 700, 4: 1100, 5: 1800,
    6: 2300, 7: 2900, 8: 3900, 9: 5000, 10: 5900,
    // ... continues to CR 30
  };
  return xpTable[cr] ?? 0;
}
```

## GraphQL Schema

```graphql
type Query {
  monster(id: ID!): Monster
  monsterDatabase(filter: MonsterFilter): [Monster!]!
  myMonsterLibrary: [Monster!]!
}

type Mutation {
  createCustomMonster(input: CreateMonsterInput!): Monster!
  updateCustomMonster(id: ID!, input: UpdateMonsterInput!): Monster!
  deleteCustomMonster(id: ID!): Boolean!
  copyMonsterToLibrary(monsterId: ID!): Monster!
}
```

## Frontend Components

- `StatBlockPopover`: Hover-triggered full stat block display
- `StatBlockCard`: Formatted D&D-style stat block
- `MonsterBrowser`: Search/filter SRD monsters
- `MonsterLibrary`: User's custom and favorited monsters
- `CreateMonsterForm`: Multi-section custom monster creation
- `DnDBeyondLink`: External link button component

## Testing Strategy

### Required Tests

1. **Unit tests**:
   - Hit dice formula validation
   - Average HP calculation
   - XP by CR lookup
   - Monster filtering logic

2. **GraphQL tests**:
   - Monster queries with filters
   - Custom monster CRUD (owner only)
   - Copy to library
   - SRD monsters read-only

3. **Frontend tests**:
   - StatBlockPopover show/hide on hover
   - StatBlockCard rendering all sections
   - MonsterBrowser search and filter
   - CreateMonsterForm validation

4. **Integration tests**:
   - Custom monster creation flow
   - Monster linked to combatant in combat
   - Popover display from combat tracker

**Minimum coverage**: 80%
