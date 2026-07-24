# Design Document - Initiative Tracker

## Overview

The Initiative Tracker manages turn order during combat encounters. It handles initiative rolling, turn progression, round counting, and combatant management. It integrates with the HP Tracker to share combatant state.

## Architecture

Shares the same `CombatEncounter` and `Combatant` tables from the HP Tracker. The initiative tracker adds turn management logic and UI for round/turn progression.

## Core Logic

```typescript
// src/services/initiativeService.ts

export interface InitiativeEntry {
  combatantId: string;
  name: string;
  initiative: number;
  dexterityModifier: number;
}

export function sortByInitiative(entries: InitiativeEntry[]): InitiativeEntry[] {
  return [...entries].sort((a, b) => {
    if (b.initiative !== a.initiative) return b.initiative - a.initiative;
    return b.dexterityModifier - a.dexterityModifier; // Tiebreaker
  });
}

export function rollInitiative(dexterityModifier: number): number {
  const d20 = Math.floor(Math.random() * 20) + 1;
  return d20 + dexterityModifier;
}

export function nextTurn(currentTurn: number, combatantCount: number): { turn: number; newRound: boolean } {
  const nextIndex = (currentTurn + 1) % combatantCount;
  return { turn: nextIndex, newRound: nextIndex === 0 };
}

export function previousTurn(currentTurn: number, combatantCount: number): { turn: number; prevRound: boolean } {
  const prevIndex = currentTurn === 0 ? combatantCount - 1 : currentTurn - 1;
  return { turn: prevIndex, prevRound: currentTurn === 0 };
}
```

## GraphQL Schema

```graphql
type CombatEncounter {
  id: ID!
  name: String
  isActive: Boolean!
  currentRound: Int!
  currentTurn: Int!
  combatants: [Combatant!]!
}

type Mutation {
  createEncounter(name: String, sessionId: ID): CombatEncounter!
  addCombatant(encounterId: ID!, name: String!, initiative: Int!, maxHp: Int!, armorClass: Int!, type: CombatantType!): Combatant!
  removeCombatant(combatantId: ID!): Boolean!
  nextTurn(encounterId: ID!): CombatEncounter!
  previousTurn(encounterId: ID!): CombatEncounter!
  updateInitiative(combatantId: ID!, initiative: Int!): Combatant!
  endEncounter(encounterId: ID!): CombatEncounter!
}
```

## Frontend Components

- `InitiativeList`: Sorted list of combatants with turn indicator
- `TurnControls`: Next/Previous turn buttons, round counter
- `AddCombatantForm`: Form for adding new combatants
- `InitiativeRoller`: Quick roll for multiple combatants

## Testing Strategy

### Required Tests

1. **Unit tests for initiative logic**:
   - Sort by initiative (descending)
   - Tiebreaker by dexterity modifier
   - Next turn wraps around to round increment
   - Previous turn wraps to previous round
   - Roll initiative returns valid range

2. **GraphQL mutation tests**:
   - Create encounter
   - Add/remove combatants
   - Next/previous turn state changes
   - Round increment on wrap

3. **Frontend component tests**:
   - Initiative list sorted correctly
   - Active turn highlighted
   - Turn controls advance state
   - Add combatant form validation

4. **Integration tests**:
   - Full combat round cycle
   - Multi-combatant encounter management

**Minimum coverage**: 80%
