# Design Document - HP Tracker

## Overview

The HP Tracker enables Dungeon Masters and players to manage hit points for all combatants during encounters. It supports tracking current HP, max HP, temporary HP, damage, healing, and death saving throws for players, monsters, and NPCs within combat encounters.

## Architecture

```
┌──────────────────────────────────────────┐
│         React HP Tracker UI              │
│  (HP bars, damage/heal inputs, cards)    │
└──────────┬───────────────────────────────┘
           │
           ▼
┌──────────────────────────────────────────┐
│        HP State Management               │
│  (useReducer for combat state)           │
└──────────┬───────────────────────────────┘
           │
           ▼
┌──────────────────────────────────────────┐
│        GraphQL Mutations                 │
│  (updateCombatantHp, applDamage, heal)   │
└──────────┬───────────────────────────────┘
           │
           ▼
┌──────────────────────────────────────────┐
│        Combat Service                    │
│  (HP calculations, death saves, rules)   │
└──────────┬───────────────────────────────┘
           │
           ▼
┌──────────────────────────────────────────┐
│        Prisma / Database                 │
│  (CombatEncounter, Combatant tables)     │
└──────────────────────────────────────────┘
```

## Database Schema

Uses `CombatEncounter` and `Combatant` models from data-storage-api design.

## Core HP Logic

```typescript
// src/services/hpService.ts

export interface HpState {
  maxHp: number;
  currentHp: number;
  tempHp: number;
}

export interface DamageResult {
  newCurrentHp: number;
  newTempHp: number;
  overkillDamage: number;
  isUnconscious: boolean;
  isInstantDeath: boolean;
}

export function applyDamage(state: HpState, damage: number): DamageResult {
  let remaining = damage;
  let newTempHp = state.tempHp;
  let newCurrentHp = state.currentHp;

  // Temp HP absorbs damage first
  if (newTempHp > 0) {
    if (remaining >= newTempHp) {
      remaining -= newTempHp;
      newTempHp = 0;
    } else {
      newTempHp -= remaining;
      remaining = 0;
    }
  }

  // Remaining damage applies to current HP
  newCurrentHp = Math.max(0, newCurrentHp - remaining);

  // Overkill check (instant death if remaining >= maxHp)
  const overkillDamage = Math.max(0, remaining - state.currentHp);
  const isInstantDeath = overkillDamage >= state.maxHp;
  const isUnconscious = newCurrentHp === 0;

  return { newCurrentHp, newTempHp, overkillDamage, isUnconscious, isInstantDeath };
}

export function applyHealing(state: HpState, healing: number): HpState {
  const newCurrentHp = Math.min(state.maxHp, state.currentHp + healing);
  return { ...state, currentHp: newCurrentHp };
}

export function setTempHp(state: HpState, tempHp: number): HpState {
  // Temp HP doesn't stack — take the higher value
  return { ...state, tempHp: Math.max(state.tempHp, tempHp) };
}
```

## GraphQL Mutations

```graphql
type Mutation {
  applyDamage(combatantId: ID!, damage: Int!): Combatant!
  applyHealing(combatantId: ID!, healing: Int!): Combatant!
  setTempHp(combatantId: ID!, tempHp: Int!): Combatant!
  setMaxHp(combatantId: ID!, maxHp: Int!): Combatant!
  setCurrentHp(combatantId: ID!, currentHp: Int!): Combatant!
}
```

## Frontend Components

- `HpBar`: Visual progress bar showing HP ratio with color coding
- `HpControls`: Damage/heal/tempHp input buttons
- `CombatantCard`: Individual combatant showing name, HP bar, controls
- `EncounterHpPanel`: List of all combatants with HP state

## Testing Strategy

### Required Tests

1. **Unit tests for HP logic** (applyDamage, applyHealing, setTempHp):
   - Damage reduces currentHp
   - Temp HP absorbs damage before currentHp
   - Healing cannot exceed maxHp
   - Overkill detection (instant death)
   - Unconscious detection (0 HP)
   - Temp HP does not stack (takes higher)
   - Negative/zero inputs handled

2. **GraphQL mutation tests**:
   - applyDamage persists updated HP
   - applyHealing persists updated HP
   - setTempHp persists correctly
   - Authentication required
   - Invalid combatant ID returns NOT_FOUND

3. **Frontend component tests**:
   - HpBar renders correct percentage and color
   - HpControls calls mutation on submit
   - CombatantCard displays all HP info
   - Error states displayed correctly

4. **Integration tests**:
   - Full damage flow: UI → GraphQL → DB → response
   - Full healing flow
   - Encounter with multiple combatants

**Minimum coverage**: 80% across lines, functions, branches, statements.
