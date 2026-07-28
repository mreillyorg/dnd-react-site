# Implementation Plan: HP Tracker

## Overview

Implement HP tracking for combat encounters including damage, healing, temporary HP, death saves, and visual HP bars. All implementations must include comprehensive tests with 80% minimum coverage.

---

## Tasks

- [x] 1. Implement HP calculation service
  - [x] 1.1 Create `src/services/hpService.ts`
    - Implement `applyDamage(state, damage)`: temp HP absorbs first, then currentHp reduced, detect unconscious/instant death
    - Implement `applyHealing(state, healing)`: increase currentHp capped at maxHp
    - Implement `setTempHp(state, tempHp)`: take higher value (no stacking)
    - Implement `calculateHpPercentage(current, max)`: return 0-100 value
    - Implement `getHpColorClass(percentage)`: green > 50%, yellow 25-50%, red < 25%
    - _Requirements: 1.1, 1.2, 1.3_
  - [x] 1.2 Write unit tests for HP service (**REQUIRED**)
    - **Test applyDamage basic**: 20 damage to 50/50 HP → 30/50
    - **Test applyDamage with temp HP**: 15 damage to 50/50 HP with 10 temp → 45/50, 0 temp
    - **Test applyDamage temp absorbs partial**: 5 damage with 10 temp → 5 temp, HP unchanged
    - **Test applyDamage to 0 HP**: assert isUnconscious = true
    - **Test applyDamage instant death**: overkill >= maxHp → isInstantDeath = true
    - **Test applyDamage zero damage**: no change
    - **Test applyHealing basic**: 10 healing to 30/50 HP → 40/50
    - **Test applyHealing cap at max**: 30 healing to 40/50 HP → 50/50
    - **Test applyHealing at full HP**: no change
    - **Test applyHealing at 0 HP**: HP increases (stabilized)
    - **Test setTempHp basic**: set temp to 10
    - **Test setTempHp no stacking**: existing 8 temp, set 5 → stays 8
    - **Test setTempHp higher replaces**: existing 5 temp, set 10 → becomes 10
    - **Test calculateHpPercentage**: various values, edge cases (0, max)
    - **Test getHpColorClass**: assert correct class for each range
    - **All tests must pass before proceeding**
    - **Minimum 80% coverage required**
    - _Requirements: 1.1, 1.2, 1.3_

- [x] 2. Implement GraphQL HP mutations and queries
  - [x] 2.1 Create HP-related GraphQL types and mutations
    - Add `applyDamage(combatantId: ID!, damage: Int!)` mutation
    - Add `applyHealing(combatantId: ID!, healing: Int!)` mutation
    - Add `setTempHp(combatantId: ID!, tempHp: Int!)` mutation
    - Add `setMaxHp(combatantId: ID!, maxHp: Int!)` mutation
    - Add `setCurrentHp(combatantId: ID!, currentHp: Int!)` mutation
    - Wire resolvers to hpService and Prisma update
    - Validate inputs (non-negative damage/healing)
    - Require authentication
    - _Requirements: 2.1, 2.2_
  - [x] 2.2 Write unit tests for HP mutations (**REQUIRED**)
    - **Test applyDamage mutation**: assert updates DB, returns updated combatant
    - **Test applyHealing mutation**: assert updates DB, returns updated combatant
    - **Test setTempHp mutation**: assert updates DB correctly
    - **Test setMaxHp mutation**: assert updates, currentHp clamped if > new maxHp
    - **Test setCurrentHp mutation**: assert direct override works
    - **Test negative damage rejected**: assert validation error
    - **Test non-existent combatant**: assert NOT_FOUND error
    - **Test unauthenticated request**: assert UNAUTHENTICATED error
    - **All tests must pass before proceeding**
    - **Minimum 80% coverage required**
    - _Requirements: 2.1, 2.2_

- [x] 3. Checkpoint — Backend HP complete
  - **GATE: All backend tests must pass with 80%+ coverage**
  - Run `npm run test:coverage`
  - **DO NOT PROCEED without passing tests**

- [x] 4. Implement HpBar component
  - [x] 4.1 Create `src/components/combat/HpBar.tsx`
    - Display visual progress bar with current/max HP text
    - Color coding: green > 50%, yellow 25-50%, red < 25%
    - Animate width changes on HP updates
    - Show temp HP as overlay segment
    - Use Tailwind CSS/daisyUI
    - Support different sizes (sm, md, lg)
    - _Requirements: 3.1_
  - [x] 4.2 Write component tests for HpBar (**REQUIRED**)
    - **Test full HP rendering**: green bar at 100%
    - **Test half HP rendering**: yellow bar at 50%
    - **Test low HP rendering**: red bar at 20%
    - **Test 0 HP rendering**: empty bar
    - **Test temp HP overlay**: additional segment shown
    - **Test HP text display**: shows "30/50" format
    - **Test size variants**: sm, md, lg classes applied
    - **All tests must pass before proceeding**
    - **Minimum 80% coverage required**
    - _Requirements: 3.1_

- [x] 5. Implement HpControls component
  - [x] 5.1 Create `src/components/combat/HpControls.tsx`
    - Damage input with apply button
    - Heal input with apply button
    - Use Tailwind CSS/daisyUI
    - Temp HP input with set button
    - Number input validation (positive integers only)
    - Quick buttons for common values (1, 5, 10)
    - Call appropriate GraphQL mutations on apply
    - _Requirements: 3.2_
  - [x] 5.2 Write component tests for HpControls (**REQUIRED**)
    - **Test damage input and submit**: assert applyDamage called
    - **Test heal input and submit**: assert applyHealing called
    - **Test temp HP input and submit**: assert setTempHp called
    - **Test input validation**: reject non-numeric, negative values
    - **Test quick buttons**: assert correct value applied
    - **Test loading state during mutation**
    - **Test error display on mutation failure**
    - **All tests must pass before proceeding**
    - **Minimum 80% coverage required**
    - _Requirements: 3.2_

- [ ] 6. Implement CombatantCard component
  - [ ] 6.1 Create `src/components/combat/CombatantCard.tsx`
    - Display combatant name, type badge (player/monster/NPC)
    - Include HpBar component
    - Include HpControls component
    - Show AC and initiative
    - Highlight active combatant
    - Indicate unconscious/dead state
    - _Requirements: 3.3_
  - [ ] 6.2 Write component tests for CombatantCard (**REQUIRED**)
    - **Test name and type display**
    - **Test HP bar included with correct values**
    - **Test HP controls included**
    - **Test AC and initiative display**
    - **Test active combatant highlight**
    - **Test unconscious state styling**
    - **Test dead/instant death styling**
    - **All tests must pass before proceeding**
    - **Minimum 80% coverage required**
    - _Requirements: 3.3_

- [ ] 7. Implement EncounterHpPanel
  - [ ] 7.1 Create `src/components/combat/EncounterHpPanel.tsx`
    - Fetch combatants for encounter via GraphQL query
    - Display list of CombatantCard components
    - Support adding new combatants
    - Support removing combatants
    - Sort by initiative order
    - _Requirements: 3.4_
  - [ ] 7.2 Write component tests for EncounterHpPanel (**REQUIRED**)
    - **Test combatant list rendering**
    - **Test sorted by initiative**
    - **Test add combatant flow**
    - **Test remove combatant flow**
    - **Test loading state**
    - **Test empty encounter display**
    - **All tests must pass before proceeding**
    - **Minimum 80% coverage required**
    - _Requirements: 3.4_

- [ ] 8. Integration testing — Full HP flow
  - [ ] 8.1 Write integration tests (**REQUIRED**)
    - **Test full damage flow**: UI input → mutation → DB update → UI reflects new HP
    - **Test full healing flow**: same pattern
    - **Test temp HP flow**: set temp → damage absorbed by temp first
    - **Test multiple combatants**: damage one, verify others unchanged
    - **Test encounter creation with combatants**
    - **All tests must pass before proceeding**
    - **Minimum 80% coverage**

- [ ] 9. Final checkpoint
  - **FINAL GATE: ALL tests must pass with 80%+ coverage**
  - Run `npm run test:coverage`
  - Verify all unit, component, and integration tests pass
  - Coverage ≥ 80% on lines, functions, branches, statements
  - **DO NOT PROCEED without passing all tests**

---

## Notes

- **TESTING IS MANDATORY**: Every task includes required tests.
- **Coverage requirement**: 80% minimum.
- **HP rules follow D&D 5e**: temp HP absorbs first, no stacking, healing capped at max.
- **Gate checkpoints**: Tasks 3, 8, and 9 require all tests to pass.
