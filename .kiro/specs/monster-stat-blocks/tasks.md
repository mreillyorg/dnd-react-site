# Implementation Plan: Monster Stat Blocks

## Overview

Implement monster stat block management including SRD database, custom creation, hover popovers, D&D Beyond links, and combat tracker integration. All tests required with 80% minimum coverage.

---

## Tasks

- [ ] 1. Implement monster service with validation
  - [ ] 1.1 Create `src/services/monsterService.ts`
    - Implement `validateHitDiceFormula(formula)`: regex validation for NdN+N format
    - Implement `calculateAverageHp(formula)`: parse and calculate average
    - Implement `calculateXpByCr(cr)`: lookup table
    - Implement `filterMonsters(monsters, filter)`: by type, CR range, size
    - Implement `searchMonsters(query)`: name search with fuzzy matching
    - _Requirements: 1.1, 1.2_
  - [ ] 1.2 Write unit tests for monster service (**REQUIRED**)
    - **Test validateHitDiceFormula valid**: "8d10+16" → true
    - **Test validateHitDiceFormula invalid**: "abc", "8d" → false
    - **Test calculateAverageHp**: "8d10+16" → 60, "2d6" → 7
    - **Test calculateAverageHp invalid formula**: returns 0
    - **Test calculateXpByCr**: CR 1 → 200, CR 5 → 1800
    - **Test calculateXpByCr unknown CR**: returns 0
    - **Test filterMonsters by type**: only matching type returned
    - **Test filterMonsters by CR range**: within bounds
    - **Test searchMonsters**: partial name match works
    - **All tests must pass before proceeding**
    - **Minimum 80% coverage required**

- [ ] 2. Implement monster GraphQL mutations and queries
  - [ ] 2.1 Create monster GraphQL schema
    - Implement `monsterDatabase` query with MonsterFilter (type, CR, size)
    - Implement `monster` query by ID
    - Implement `myMonsterLibrary` query
    - Implement `createCustomMonster` mutation: validate, set source HOMEBREW
    - Implement `updateCustomMonster` mutation: owner only
    - Implement `deleteCustomMonster` mutation: owner only
    - Implement `copyMonsterToLibrary` mutation: copy SRD monster as custom
    - _Requirements: 2.1, 2.2_
  - [ ] 2.2 Write GraphQL tests (**REQUIRED**)
    - **Test monsterDatabase returns SRD monsters**
    - **Test monsterDatabase with filters**
    - **Test monster by ID**
    - **Test createCustomMonster**: created with correct source
    - **Test createCustomMonster validation**: hit dice format
    - **Test updateCustomMonster as owner**: success
    - **Test updateCustomMonster as non-owner**: FORBIDDEN
    - **Test deleteCustomMonster**: deleted
    - **Test copyMonsterToLibrary**: new monster created with HOMEBREW source
    - **Test SRD monsters cannot be edited/deleted**
    - **Test auth required on mutations**
    - **All tests must pass before proceeding**
    - **Minimum 80% coverage required**

- [ ] 3. Checkpoint — Backend complete
  - **GATE: All backend tests must pass with 80%+ coverage**
  - Run `npm run test:coverage`
  - **DO NOT PROCEED without passing tests**

- [ ] 4. Implement StatBlockCard component
  - [ ] 4.1 Create `src/components/monsters/StatBlockCard.tsx`
    - Header: name, size, type, alignment, CR
    - Stats section: AC, HP (average + formula), speed
    - Ability scores with modifiers
    - Properties: saves, skills, resistances, immunities, senses, languages
    - Traits section: special abilities
    - Actions section: attacks and abilities
    - Reactions and Legendary Actions (if present)
    - D&D Beyond link button
    - D&D 5e visual styling (parchment/red headers)
    - _Requirements: 3.1_
  - [ ] 4.2 Write component tests for StatBlockCard (**REQUIRED**)
    - **Test header rendering**: name, type, CR displayed
    - **Test stats section**: AC, HP, speed shown
    - **Test ability scores**: all 6 with modifiers
    - **Test traits rendering**: special abilities listed
    - **Test actions rendering**: attacks with damage
    - **Test legendary actions**: only shown when present
    - **Test D&D Beyond link**: button present with valid URL
    - **Test D&D Beyond link hidden**: when no URL provided
    - **All tests must pass before proceeding**
    - **Minimum 80% coverage required**

- [ ] 5. Implement StatBlockPopover component
  - [ ] 5.1 Create `src/components/monsters/StatBlockPopover.tsx`
    - Trigger on hover over combatant name
    - Appear within 200ms
    - Display StatBlockCard content
    - Stay visible while mouse over popover
    - Close when mouse leaves both trigger and popover
    - Position: prefer right, fallback left/above/below
    - Scrollable for long stat blocks
    - _Requirements: 3.2_
  - [ ] 5.2 Write component tests for StatBlockPopover (**REQUIRED**)
    - **Test popover hidden by default**
    - **Test popover shows on hover**
    - **Test popover remains while hovering popover itself**
    - **Test popover hides when mouse leaves both areas**
    - **Test stat block content rendered inside popover**
    - **Test accessibility**: ARIA attributes, keyboard dismissal
    - **All tests must pass before proceeding**
    - **Minimum 80% coverage required**

- [ ] 6. Implement MonsterBrowser and MonsterLibrary
  - [ ] 6.1 Create monster browsing components
    - `MonsterBrowser`: search, filter by type/CR/size, paginated results
    - `MonsterLibrary`: user's custom + favorited monsters
    - `CreateMonsterForm`: multi-section form for all stat block fields
    - Quick-add to combat tracker button
    - _Requirements: 3.3_
  - [ ] 6.2 Write component tests (**REQUIRED**)
    - **Test MonsterBrowser search functionality**
    - **Test MonsterBrowser filtering**
    - **Test MonsterBrowser pagination**
    - **Test MonsterLibrary displays custom monsters**
    - **Test CreateMonsterForm validation**
    - **Test CreateMonsterForm submission**
    - **Test quick-add to combat button**
    - **All tests must pass before proceeding**
    - **Minimum 80% coverage required**

- [ ] 7. Integration testing
  - [ ] 7.1 Write integration tests (**REQUIRED**)
    - **Test custom monster creation flow**: form → mutation → appears in library
    - **Test monster linked to combatant**: add to encounter, popover works
    - **Test copy SRD to library**: creates editable copy
    - **Test D&D Beyond link opens in new tab**
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
- **SRD monsters are read-only**: Users cannot edit or delete them.
- **Hit dice formula**: Must match NdN or NdN+N pattern.
- **Popover performance**: Appear within 200ms of hover.
