# Implementation Plan: Character Creation

## Overview

Implement D&D 5e character creation and management including ability scores, multi-class support, skills, features, spells, and HP calculation. All tests are required with 80% minimum coverage.

---

## Tasks

- [ ] 1. Implement character calculation service
  - [ ] 1.1 Create `src/services/characterService.ts`
    - Implement `calculateAbilityModifier(score)`: (score - 10) / 2 floored
    - Implement `calculateProficiencyBonus(level)`: ceil(level/4) + 1
    - Implement `calculateSkillBonus(abilityScore, profBonus, isProficient, hasExpertise)`
    - Implement `calculatePassivePerception(wis, profBonus, isProficient)`
    - Implement `calculateHitPoints(classes, conScore)`: max dice at level 1, average after
    - Implement `calculateInitiativeBonus(dexScore)`
    - Export `SKILL_ABILITY_MAP` constant
    - _Requirements: 1.1, 1.2, 1.3_
  - [ ] 1.2 Write unit tests for character calculations (**REQUIRED**)
    - **Test calculateAbilityModifier**: 10→0, 14→2, 8→-1, 1→-5, 20→5, 30→10
    - **Test calculateProficiencyBonus**: level 1→2, level 4→2, level 5→3, level 9→4, level 17→6, level 20→6
    - **Test calculateSkillBonus no proficiency**: just ability mod
    - **Test calculateSkillBonus with proficiency**: mod + profBonus
    - **Test calculateSkillBonus with expertise**: mod + profBonus * 2
    - **Test calculatePassivePerception**: 10 + skill bonus
    - **Test calculateHitPoints single class Fighter d10**: level 1 = 10 + conMod
    - **Test calculateHitPoints multi-level**: avg after level 1
    - **Test calculateHitPoints multiclass**: Fighter 3 / Wizard 2
    - **Test calculateHitPoints minimum 1 HP**: negative con mod edge case
    - **Test SKILL_ABILITY_MAP**: all 18 skills mapped correctly
    - **All tests must pass before proceeding**
    - **Minimum 80% coverage required**
    - _Requirements: 1.1, 1.2, 1.3_

- [ ] 2. Implement GraphQL character schema and service
  - [ ] 2.1 Create character GraphQL types and mutations
    - Define Character type with all fields
    - Define CharacterClass, CharacterFeature, CharacterSpell types
    - Implement `createCharacter` mutation: validate input, calculate HP, create character + first class level in transaction
    - Implement `updateCharacter` mutation: partial updates, ownership check
    - Implement `deleteCharacter` mutation: ownership check, cascade delete
    - Implement `addClassLevel` mutation: multiclass support, recalculate HP and proficiency
    - Implement `updateAbilityScores` mutation
    - Implement `myCharacters` query: list user's characters
    - Implement `character` query: get by ID with ownership check
    - _Requirements: 2.1, 2.2, 2.3_
  - [ ] 2.2 Write unit tests for character mutations (**REQUIRED**)
    - **Test createCharacter**: assert character + class level created, HP calculated
    - **Test createCharacter validation**: reject missing required fields
    - **Test updateCharacter**: assert partial update works
    - **Test updateCharacter ownership**: reject update by non-owner
    - **Test deleteCharacter**: assert cascade deletes classes/features/spells
    - **Test deleteCharacter ownership**: reject delete by non-owner
    - **Test addClassLevel**: assert new class added, HP recalculated, proficiency updated
    - **Test updateAbilityScores**: assert scores updated, derived values recalculated
    - **Test myCharacters**: returns only user's characters
    - **Test character query**: returns null for non-existent, error for non-owner
    - **Test auth required**: all mutations require authentication
    - **All tests must pass before proceeding**
    - **Minimum 80% coverage required**
    - _Requirements: 2.1, 2.2, 2.3_

- [ ] 3. Implement spell and feature management
  - [ ] 3.1 Create spell/feature GraphQL mutations
    - Implement `addFeature` mutation
    - Implement `removeFeature` mutation
    - Implement `addSpell` mutation
    - Implement `removeSpell` mutation
    - Implement `toggleSpellPrepared` mutation
    - All require character ownership
    - _Requirements: 3.1, 3.2_
  - [ ] 3.2 Write unit tests for spell/feature management (**REQUIRED**)
    - **Test addFeature**: assert feature created, linked to character
    - **Test removeFeature**: assert feature deleted
    - **Test addSpell**: assert spell created with all fields
    - **Test removeSpell**: assert spell deleted
    - **Test toggleSpellPrepared**: assert toggled between true/false
    - **Test ownership on all operations**
    - **All tests must pass before proceeding**
    - **Minimum 80% coverage required**
    - _Requirements: 3.1, 3.2_

- [ ] 4. Checkpoint — Backend complete
  - **GATE: All backend tests must pass with 80%+ coverage**
  - Run `npm run test:coverage`
  - **DO NOT PROCEED without passing tests**

- [ ] 5. Implement CharacterCreationWizard component
  - [ ] 5.1 Create `src/features/character/components/CharacterCreationWizard.tsx`
    - Step 1: Name, Race, Background, Alignment
    - Step 2: Class selection (with hit dice type)
    - Step 3: Ability scores (point buy, standard array, or manual)
    - Step 4: Skill proficiencies selection
    - Step 5: Review and create
    - Navigation between steps with validation
    - Submit calls createCharacter mutation
    - Use Tailwind CSS utility classes and daisyUI components (steps, input, select, btn, card) for all styling
    - _Requirements: 4.1_
  - [ ] 5.2 Write component tests for CharacterCreationWizard (**REQUIRED**)
    - **Test step 1 rendering**: name, race, background fields
    - **Test step navigation**: next/back buttons advance/retreat
    - **Test step validation**: can't proceed without required fields
    - **Test ability score assignment**: point buy limits, standard array
    - **Test skill selection**: correct number of skills selectable
    - **Test final submission**: assert createCharacter called with all values
    - **Test error display on creation failure**
    - **All tests must pass before proceeding**
    - **Minimum 80% coverage required**
    - _Requirements: 4.1_

- [ ] 6. Implement CharacterSheet component
  - [ ] 6.1 Create `src/features/character/components/CharacterSheet.tsx`
    - Display all character stats with calculated modifiers
    - Show ability scores with modifiers
    - Show skills with proficiency/expertise indicators
    - Show saving throws
    - Show class levels
    - Show features and spells
    - Edit mode for updating values
    - Use Tailwind CSS utility classes and daisyUI components (card, badge, table, collapse) for all styling
    - _Requirements: 4.2_
  - [ ] 6.2 Write component tests for CharacterSheet (**REQUIRED**)
    - **Test ability scores display with modifiers**
    - **Test skills list with correct bonuses**
    - **Test saving throws with proficiency marks**
    - **Test HP display (current/max/temp)**
    - **Test AC and speed display**
    - **Test class levels display**
    - **Test features list rendering**
    - **Test edit mode toggle**
    - **All tests must pass before proceeding**
    - **Minimum 80% coverage required**
    - _Requirements: 4.2_

- [ ] 7. Implement CharacterList component
  - [ ] 7.1 Create `src/features/character/components/CharacterList.tsx`
    - Fetch user's characters via myCharacters query
    - Display character cards with name, race, class, level
    - Link to character sheet
    - Delete button with confirmation
    - Create new character button linking to wizard
    - Use Tailwind CSS utility classes and daisyUI components (card, btn, modal) for all styling
    - _Requirements: 4.3_
  - [ ] 7.2 Write component tests for CharacterList (**REQUIRED**)
    - **Test character cards rendering**
    - **Test empty state with create prompt**
    - **Test delete with confirmation dialog**
    - **Test navigation to character sheet**
    - **Test navigation to creation wizard**
    - **Test loading state**
    - **All tests must pass before proceeding**
    - **Minimum 80% coverage required**
    - _Requirements: 4.3_

- [ ] 8. Integration testing
  - [ ] 8.1 Write integration tests (**REQUIRED**)
    - **Test full creation flow**: wizard → mutation → DB → character list
    - **Test level up flow**: add class level → HP recalculation
    - **Test multiclass flow**: add second class → correct calculations
    - **Test spell management**: add, prepare, remove spells
    - **Test character deletion**: cascade removes all related data
    - **All tests must pass before proceeding**
    - **Minimum 80% coverage**

- [ ] 9. Final checkpoint
  - **FINAL GATE: ALL tests must pass with 80%+ coverage**
  - Run `npm run test:coverage`
  - **DO NOT PROCEED without passing all tests**

---

## Notes

- **TESTING IS MANDATORY**: Every task includes required tests.
- **Coverage requirement**: 80% minimum.
- **D&D 5e rules**: ability modifier = floor((score-10)/2), proficiency = ceil(level/4)+1.
- **Multiclass**: each class tracks its own level and hit dice type.
- **HP calculation**: max hit dice at first level, average thereafter.
