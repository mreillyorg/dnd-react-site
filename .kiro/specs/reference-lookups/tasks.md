# Implementation Plan: Reference Lookups

## Overview

Implement SRD reference content access including spells, conditions, rules, search, filtering, and bookmarks. All tests required with 80% minimum coverage.

---

## Tasks

- [ ] 1. Set up SRD content database schema and seed data
  - [ ] 1.1 Create Prisma models and migration
    - Add SrdSpell, SrdCondition, SrdRule, ReferenceBookmark models to schema
    - Run migration
    - Create seed script for SRD content (spells, conditions, rules)
    - _Requirements: 1.1_
  - [ ] 1.2 Write tests for seed data (**REQUIRED**)
    - **Test seed script populates spells**: assert known spells exist (Fireball, Magic Missile)
    - **Test seed script populates conditions**: all 15 SRD conditions present
    - **Test seed script populates rules**: core rule categories present
    - **Test seed idempotent**: running twice doesn't duplicate
    - **All tests must pass before proceeding**
    - **Minimum 80% coverage required**

- [ ] 2. Implement reference search service
  - [ ] 2.1 Create `src/services/referenceService.ts`
    - Implement `searchReferences(query, category)`: search across spells, conditions, rules
    - Implement `filterSpells(filter)`: level, school, class, concentration, ritual
    - Implement `fuzzyMatch(query, target)`: handle misspellings
    - Implement `calculateRelevanceScore(query, entry)`: name > description matching
    - _Requirements: 2.1, 2.2_
  - [ ] 2.2 Write unit tests for reference service (**REQUIRED**)
    - **Test searchReferences exact name**: "Fireball" returns Fireball first
    - **Test searchReferences partial**: "fire" returns fire-related results
    - **Test searchReferences by category**: filter to spells only
    - **Test searchReferences no results**: empty array returned
    - **Test filterSpells by level**: only correct level returned
    - **Test filterSpells by school**: only matching school
    - **Test filterSpells by class**: only class-available spells
    - **Test filterSpells concentration**: filtered correctly
    - **Test filterSpells multiple criteria**: AND logic
    - **Test fuzzyMatch**: "fier bolt" matches "Fire Bolt"
    - **Test relevanceScore**: name match scores higher than description
    - **All tests must pass before proceeding**
    - **Minimum 80% coverage required**

- [ ] 3. Implement bookmark service
  - [ ] 3.1 Create bookmark functionality
    - Implement `addBookmark(userId, type, refId, notes)`
    - Implement `removeBookmark(userId, bookmarkId)`
    - Implement `getBookmarks(userId)`: grouped by type
    - Implement `updateBookmarkNotes(userId, bookmarkId, notes)`
    - Implement `isBookmarked(userId, type, refId)`: check existence
    - _Requirements: 3.1_
  - [ ] 3.2 Write bookmark tests (**REQUIRED**)
    - **Test addBookmark**: created with correct fields
    - **Test addBookmark duplicate**: rejected (unique constraint)
    - **Test removeBookmark**: deleted
    - **Test removeBookmark non-owner**: FORBIDDEN
    - **Test getBookmarks**: returns user's bookmarks grouped
    - **Test updateBookmarkNotes**: notes updated
    - **Test isBookmarked true**: returns true when exists
    - **Test isBookmarked false**: returns false when not exists
    - **All tests must pass before proceeding**
    - **Minimum 80% coverage required**

- [ ] 4. Implement GraphQL reference schema
  - [ ] 4.1 Create reference GraphQL types and resolvers
    - Wire search, spells, conditions, rules queries
    - Wire bookmark mutations
    - Spell filtering inputs
    - Rule hierarchy resolution
    - _Requirements: 4.1_
  - [ ] 4.2 Write GraphQL tests (**REQUIRED**)
    - **Test searchReferences query**: returns results
    - **Test spells query with filter**
    - **Test spell by ID**
    - **Test conditions query**: all 15 returned
    - **Test condition by ID**
    - **Test rules by category**
    - **Test rule hierarchy**: parent-child resolved
    - **Test addBookmark mutation**: auth required
    - **Test removeBookmark mutation**: owner only
    - **Test myBookmarks query**: returns user's bookmarks
    - **All tests must pass before proceeding**
    - **Minimum 80% coverage required**

- [ ] 5. Checkpoint — Backend complete
  - **GATE: All backend tests must pass with 80%+ coverage**
  - Run `npm run test:coverage`
  - **DO NOT PROCEED without passing tests**

- [ ] 6. Implement SpellBrowser component
  - [ ] 6.1 Create `src/features/reference/components/SpellBrowser.tsx`
    - Spell list with card or table view
    - Filter panel: level, school, class, concentration, ritual
    - Sort by name, level, school
    - Spell detail view with all fields
    - Bookmark button on each spell
    - _Requirements: 5.1_
  - [ ] 6.2 Write component tests (**REQUIRED**)
    - **Test spell list renders**
    - **Test filter panel interactions**: each filter updates list
    - **Test sort options**: changes order
    - **Test spell detail view**: all fields displayed
    - **Test bookmark button toggle**
    - **Test empty results message**
    - **Test loading state**
    - **All tests must pass before proceeding**
    - **Minimum 80% coverage required**

- [ ] 7. Implement ReferenceSearch and ConditionList
  - [ ] 7.1 Create search and condition components
    - `ReferenceSearch`: search input with autocomplete dropdown
    - `ConditionList`: all conditions alphabetically with descriptions
    - `RulesBrowser`: hierarchical navigation with breadcrumbs
    - _Requirements: 5.2_
  - [ ] 7.2 Write component tests (**REQUIRED**)
    - **Test search input renders**
    - **Test autocomplete appears on typing**
    - **Test autocomplete selection navigates to result**
    - **Test ConditionList renders all 15 conditions**
    - **Test condition descriptions visible**
    - **Test RulesBrowser hierarchy navigation**
    - **Test breadcrumb display**
    - **All tests must pass before proceeding**
    - **Minimum 80% coverage required**

- [ ] 8. Implement BookmarkPanel and ReferenceModal
  - [ ] 8.1 Create bookmark and modal components
    - `BookmarkPanel`: user's saved references organized by type
    - `ReferenceModal`: inline popup for contextual reference links
    - _Requirements: 5.3_
  - [ ] 8.2 Write component tests (**REQUIRED**)
    - **Test BookmarkPanel renders grouped bookmarks**
    - **Test bookmark notes editing**
    - **Test bookmark removal**
    - **Test ReferenceModal opens on link click**
    - **Test ReferenceModal closes on outside click**
    - **Test ReferenceModal content rendering**
    - **All tests must pass before proceeding**
    - **Minimum 80% coverage required**

- [ ] 9. Integration testing
  - [ ] 9.1 Write integration tests (**REQUIRED**)
    - **Test full search flow**: type query → results appear → click navigates
    - **Test spell filtering end-to-end**: select filters → correct spells shown
    - **Test bookmark lifecycle**: add → view in panel → remove
    - **Test contextual link from combat tracker**: hover opens reference modal
    - **All tests must pass before proceeding**
    - **Minimum 80% coverage**

- [ ] 10. Final checkpoint
  - **FINAL GATE: ALL tests must pass with 80%+ coverage**
  - Run `npm run test:coverage`
  - **DO NOT PROCEED without passing all tests**

---

## Notes

- **TESTING IS MANDATORY**: Every task includes required tests.
- **Coverage requirement**: 80% minimum.
- **SRD only**: No non-OGL content. Display OGL attribution.
- **Search performance**: Results within 500ms.
- **Fuzzy matching**: Handle common misspellings.
- **Seed data**: Required for all content—spells, conditions, rules from SRD v5.1.
