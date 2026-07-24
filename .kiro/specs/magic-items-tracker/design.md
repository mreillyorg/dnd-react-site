# Design Document - Magic Items Tracker

## Overview

The Magic Items Tracker manages item inventory for characters including magic items, consumables, attunement, and campaign-level item sharing. It integrates with Character and Campaign systems.

## Architecture

```
┌──────────────────────────────────────────┐
│       React Item Management UI           │
│  (Inventory, Item Library, Attunement)   │
└──────────┬───────────────────────────────┘
           │
           ▼
┌──────────────────────────────────────────┐
│       Item State / Hooks                 │
│  (useInventory, useItemLibrary)          │
└──────────┬───────────────────────────────┘
           │
           ▼
┌──────────────────────────────────────────┐
│       GraphQL Item API                   │
│  (CRUD, attunement, transfers)           │
└──────────┬───────────────────────────────┘
           │
           ▼
┌──────────────────────────────────────────┐
│       Item Service Layer                 │
│  (Attunement rules, weight calc)         │
└──────────┬───────────────────────────────┘
           │
           ▼
┌──────────────────────────────────────────┐
│       Prisma / Database                  │
│  (Item, ItemAssignment tables)           │
└──────────────────────────────────────────┘
```

## Database Schema

Uses Item and ItemAssignment models from data-storage-api design.

## Core Logic

```typescript
// src/services/itemService.ts

export const MAX_ATTUNEMENT_SLOTS = 3;
export const CARRYING_CAPACITY_MULTIPLIER = 15; // Strength * 15

export function calculateCarryingCapacity(strengthScore: number): number {
  return strengthScore * CARRYING_CAPACITY_MULTIPLIER;
}

export function calculateTotalWeight(assignments: { weight: number; quantity: number }[]): number {
  return assignments.reduce((total, item) => total + (item.weight * item.quantity), 0);
}

export function canAttune(currentAttuned: number): boolean {
  return currentAttuned < MAX_ATTUNEMENT_SLOTS;
}

export function isEncumbered(totalWeight: number, carryingCapacity: number): boolean {
  return totalWeight > carryingCapacity;
}
```

## GraphQL Schema

```graphql
type Mutation {
  assignItemToCharacter(characterId: ID!, itemId: ID!, quantity: Int): ItemAssignment!
  removeItemAssignment(assignmentId: ID!): Boolean!
  updateQuantity(assignmentId: ID!, quantity: Int!): ItemAssignment!
  toggleEquipped(assignmentId: ID!): ItemAssignment!
  toggleAttuned(assignmentId: ID!): ItemAssignment!
  createCustomItem(input: CreateItemInput!): Item!
  updateCustomItem(id: ID!, input: UpdateItemInput!): Item!
  deleteCustomItem(id: ID!): Boolean!
}

type Query {
  characterInventory(characterId: ID!): [ItemAssignment!]!
  itemDatabase(filter: ItemFilter): [Item!]!
  myItemLibrary: [Item!]!
}
```

## Frontend Components

- `InventoryList`: Character's items with filters
- `AttunementSlots`: Visual 3-slot attunement display
- `ItemCard`: Individual item with controls
- `ItemLibrary`: Browse/search items
- `CustomItemForm`: Create homebrew items

## Testing Strategy

### Required Tests

1. **Unit tests for item logic**:
   - Carrying capacity calculation
   - Total weight calculation
   - Attunement limit enforcement
   - Encumbrance detection

2. **GraphQL tests**:
   - Assign/remove items
   - Quantity updates (no negatives)
   - Attunement toggle (max 3 enforcement)
   - Custom item CRUD
   - Authorization checks

3. **Frontend tests**:
   - Inventory list rendering
   - Attunement slot display
   - Item card interactions
   - Custom item form

4. **Integration tests**:
   - Full item assignment flow
   - Attunement limit hit
   - Weight/encumbrance tracking

**Minimum coverage**: 80%
