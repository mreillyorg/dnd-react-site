# Implementation Plan: Initiative Tracker

## Overview

Implement initiative tracking for combat encounters including turn order, round management, combatant addition/removal, and initiative rolling. All tests are required with 80% minimum coverage.

---

## Tasks

- [ ] 1. Implement initiative calculation service
  - [ ] 1.1 Create `src/services/initiativeService.ts`
    - Implement `sortByInitiative(entries)`: sort descending, tiebreak by dexterity modifier
    - Implement `rollInitiative(dexMod)`: d20 + modifier
    - Implement `nextTurn(current, count)`: advance turn, detect new round
    - Implement `previousTurn(current, count)`: go back, detect previous round
    - Implement `calculateDexModifier(dexScore)`: (score - 10) / 2 floored
    - _Requirements: 1.1, 1.2, 1.3_
  - [ ] 1.2 Write unit tests for initiative service (**REQUIRED**)
    - **Test sortByInitiative basic**: higher initiative first
    - **Test sortByInitiative tiebreaker**: same initiative, higher dex mod wins
    - **Test sortByInitiative stable**: equal initiative and dex mod maintains order
    - **Test rollInitiative range**: result between 1+mod and 20+mod
    - **Test nextTurn mid-round**: turn increments, newRound false
    - **Test nextTurn end of round**: wraps to 0, newRound true
    - **Test previousTurn mid-round**: turn decrements, prevRound false
    - **Test previousTurn start of round**: wraps to last, prevRound true
    - **Test calculateDexModifier**: 10→0, 14→2, 8→-1, 1→-5
    - **All tests must pass before proceeding**
    - **Minimum 80% coverage required**
    - _Requirements: 1.1, 1.2, 1.3_

- [ ] 2. Implement GraphQL encounter and turn mutations
  - [ ] 2.1 Create encounter GraphQL schema
    - Add `createEncounter` mutation
    - Add `addCombatant` mutation with name, initiative, maxHp, armorClass, type
    - Add `removeCombatant` mutation
    - Add `nextTurn` mutation: advance turn, increment round on wrap
    - Add `previousTurn` mutation: go back, decrement round on wrap
    - Add `updateInitiative` mutation
    - Add `endEncounter` mutation: set isActive to false
    - Add `encounter` query by ID
    - Add `activeEncounters` query for current user
    - _Requirements: 2.1, 2.2_
  - [ ] 2.2 Write unit tests for encounter mutations (**REQUIRED**)
    - **Test createEncounter**: assert encounter created with defaults
    - **Test addCombatant**: assert combatant added, linked to encounter
    - **Test removeCombatant**: assert removed from DB
    - **Test nextTurn**: assert currentTurn incremented
    - **Test nextTurn round wrap**: assert currentRound incremented when wrapping
    - **Test previousTurn**: assert currentTurn decremented
    - **Test previousTurn round wrap**: assert currentRound decremented
    - **Test updateInitiative**: assert combatant initiative updated
    - **Test endEncounter**: assert isActive set to false
    - **Test auth required**: assert UNAUTHENTICATED for all mutations
    - **Test not found**: assert error for invalid encounter/combatant IDs
    - **All tests must pass before proceeding**
    - **Minimum 80% coverage required**
    - _Requirements: 2.1, 2.2_

- [ ] 3. Checkpoint — Backend complete
  - **GATE: All backend tests must pass with 80%+ coverage**
  - Run `npm run test:coverage`
  - **DO NOT PROCEED without passing tests**

- [ ] 4. Implement InitiativeList component
  - [ ] 4.1 Create `src/components/combat/InitiativeList.tsx`
    - Display combatants sorted by initiative
    - Highlight active combatant (current turn)
    - Show initiative value, name, HP summary, AC
    - Gray out dead/unconscious combatants
    - Support drag-and-drop reordering
    - _Requirements: 3.1_
  - [ ] 4.2 Write component tests for InitiativeList (**REQUIRED**)
    - **Test sorted order display**: assert combatants in initiative order
    - **Test active highlight**: assert current turn combatant highlighted
    - **Test unconscious styling**: assert grayed out at 0 HP
    - **Test combatant info display**: name, initiative, HP, AC shown
    - **Test empty list**: assert empty state message
    - **All tests must pass before proceeding**
    - **Minimum 80% coverage required**
    - _Requirements: 3.1_

- [ ] 5. Implement TurnControls component
  - [ ] 5.1 Create `src/components/combat/TurnControls.tsx`
    - Next Turn button: calls nextTurn mutation
    - Previous Turn button: calls previousTurn mutation
    - Round counter display
    - End Encounter button with confirmation
    - _Requirements: 3.2_
  - [ ] 5.2 Write component tests for TurnControls (**REQUIRED**)
    - **Test Next Turn click**: assert mutation called
    - **Test Previous Turn click**: assert mutation called
    - **Test round counter display**: assert correct round number
    - **Test End Encounter with confirmation**: assert confirmation dialog before mutation
    - **Test disabled state**: buttons disabled when no encounter active
    - **All tests must pass before proceeding**
    - **Minimum 80% coverage required**
    - _Requirements: 3.2_

- [ ] 6. Implement AddCombatantForm component
  - [ ] 6.1 Create `src/components/combat/AddCombatantForm.tsx`
    - Form fields: name, initiative, maxHp, armorClass, combatant type
    - Roll initiative button (auto-fills with d20 result)
    - Validation: all fields required, positive numbers
    - Submit calls addCombatant mutation
    - _Requirements: 3.3_
  - [ ] 6.2 Write component tests for AddCombatantForm (**REQUIRED**)
    - **Test form rendering**: all fields present
    - **Test form submission**: assert mutation called with correct values
    - **Test validation**: required fields, positive numbers
    - **Test roll initiative button**: assert initiative field populated
    - **Test error display on failure**
    - **Test form reset after successful add**
    - **All tests must pass before proceeding**
    - **Minimum 80% coverage required**
    - _Requirements: 3.3_

- [ ] 7. Integration testing
  - [ ] 7.1 Write integration tests (**REQUIRED**)
    - **Test full encounter lifecycle**: create → add combatants → advance turns → end
    - **Test round progression**: advance through all combatants, verify round increments
    - **Test combatant removal mid-combat**: verify turn adjustment
    - **Test initiative reordering**: update initiative, verify list re-sorts
    - **All tests must pass before proceeding**
    - **Minimum 80% coverage**

- [ ] 8. Final checkpoint
  - **FINAL GATE: ALL tests must pass with 80%+ coverage**
  - Run `npm run test:coverage`
  - **DO NOT PROCEED without passing all tests**

---

## Notes

- **TESTING IS MANDATORY**: Every task includes required tests.
- **Coverage requirement**: 80% minimum.
- **Initiative rules follow D&D 5e**: descending order, dex modifier tiebreaker.
- **Shares data model with HP Tracker**: same CombatEncounter and Combatant tables.
