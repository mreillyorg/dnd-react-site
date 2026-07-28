# Implementation Plan: Adventurer's League DM Logs

## Overview

Implement AL DM log generation including session tracking, player rosters, advancement/treasure calculations, reward distribution, and PDF export. All tests required with 80% minimum coverage.

---

## Tasks

- [ ] 1. Implement AL calculation and validation service
  - [ ] 1.1 Create `src/services/alLogService.ts`
    - Implement `calculateAdvancementCheckpoints(duration, season)`: 1 for 2hr, 2 for 4hr (Season 9+)
    - Implement `calculateTreasureCheckpoints(duration, season)`: same as advancement
    - Implement `calculateDowntimeDays(duration)`: 5 for 2hr, 10 for 4hr
    - Implement `validateAlCode(code)`: regex for DDAL, CCC, DDEP, DDHC formats
    - Implement `validateDciNumber(dci)`: 10-digit number
    - Implement `validatePlayerCount(count)`: 3-7 range
    - Implement `calculateDmReward(session)`: equals player advancement
    - _Requirements: 1.1, 1.2_
  - [ ] 1.2 Write unit tests for AL service (**REQUIRED**)
    - **Test calculateAdvancementCheckpoints 2hr session**: returns 1
    - **Test calculateAdvancementCheckpoints 4hr session**: returns 2
    - **Test calculateAdvancementCheckpoints pre-season 9**: returns 0
    - **Test calculateTreasureCheckpoints 2hr**: returns 1
    - **Test calculateTreasureCheckpoints 4hr**: returns 2
    - **Test calculateDowntimeDays 2hr**: returns 5
    - **Test calculateDowntimeDays 4hr**: returns 10
    - **Test validateAlCode valid DDAL**: "DDAL09-01" → true
    - **Test validateAlCode valid CCC**: "CCC-BWC-01-01" → true
    - **Test validateAlCode invalid**: "INVALID" → false
    - **Test validateDciNumber valid**: "1234567890" → true
    - **Test validateDciNumber invalid**: "123" → false, "abcdefghij" → false
    - **Test validatePlayerCount valid**: 3-7 all valid
    - **Test validatePlayerCount too few**: 2 → invalid with warning
    - **Test validatePlayerCount too many**: 8 → invalid with warning
    - **Test calculateDmReward**: equals player checkpoints
    - **All tests must pass before proceeding**
    - **Minimum 80% coverage required**

- [ ] 2. Implement AL session GraphQL mutations
  - [ ] 2.1 Create AL GraphQL schema
    - Implement `createAlSession`: validate AL code, link to campaign
    - Implement `updateAlSession`: DM only
    - Implement `deleteAlSession`: DM only
    - Implement `addAlPlayer`: validate DCI, player count limit
    - Implement `removeAlPlayer`: DM only
    - Implement `addAlReward`: link to session and optionally to player
    - Implement `alSession` query
    - Implement `alSessionHistory` query: all sessions for campaign
    - Implement `dmLogSummary` query: aggregate stats
    - _Requirements: 2.1, 2.2_
  - [ ] 2.2 Write GraphQL tests (**REQUIRED**)
    - **Test createAlSession**: created with auto-calculated rewards
    - **Test createAlSession invalid AL code**: validation error
    - **Test updateAlSession as DM**: success
    - **Test updateAlSession as non-DM**: FORBIDDEN
    - **Test addAlPlayer**: player added, count validated
    - **Test addAlPlayer exceeds 7**: warning returned
    - **Test addAlPlayer DCI validation**: invalid format rejected
    - **Test removeAlPlayer**: removed
    - **Test addAlReward to session**: reward created
    - **Test addAlReward to player**: linked correctly
    - **Test alSessionHistory**: returns DM's sessions chronologically
    - **Test dmLogSummary**: correct totals
    - **Test auth required**: all mutations need authentication
    - **All tests must pass before proceeding**
    - **Minimum 80% coverage required**

- [ ] 3. Implement PDF export service
  - [ ] 3.1 Create export functionality
    - Implement `generateAlLogPdf(sessionId)`: build PDF with all session data
    - Include: session info, player roster table, advancement, treasure, magic items, DM reward
    - Format for letter-size paper
    - Store generated PDF for 90 days
    - Return download URL
    - _Requirements: 3.1_
  - [ ] 3.2 Write export tests (**REQUIRED**)
    - **Test generateAlLogPdf creates file**: assert file exists
    - **Test PDF contains session info**: AL code, title, date
    - **Test PDF contains player roster**: all players listed
    - **Test PDF contains rewards**: advancement, treasure shown
    - **Test PDF contains magic items**: distributed items listed
    - **Test PDF contains DM reward**: DM section present
    - **Test export URL returned**: valid URL with expiry
    - **All tests must pass before proceeding**
    - **Minimum 80% coverage required**

- [ ] 4. Checkpoint — Backend complete
  - **GATE: All backend tests must pass with 80%+ coverage**
  - Run `npm run test:coverage`
  - **DO NOT PROCEED without passing tests**

- [ ] 5. Implement AlSessionForm component
  - [ ] 5.1 Create `src/features/al-logs/components/AlSessionForm.tsx`
    - AL code input with format validation
    - Adventure title input
    - Date picker
    - Duration selector (2hr / 4hr)
    - Location input
    - AL Season selector
    - Auto-calculate advancement/treasure/downtime on duration change
    - Use Tailwind CSS utility classes and daisyUI components (input, select, btn, fieldset, alert) for all styling
    - _Requirements: 4.1_
  - [ ] 5.2 Write component tests (**REQUIRED**)
    - **Test form renders all fields**
    - **Test AL code validation feedback**
    - **Test duration change recalculates rewards**
    - **Test form submission calls mutation**
    - **Test date picker interaction**
    - **Test season selector options**
    - **All tests must pass before proceeding**
    - **Minimum 80% coverage required**

- [ ] 6. Implement PlayerRosterEditor component
  - [ ] 6.1 Create `src/features/al-logs/components/PlayerRosterEditor.tsx`
    - Add player form: name, DCI, character name, class, level
    - DCI number validation with feedback
    - Player count indicator with 3-7 range warning
    - Remove player button
    - Link existing campaign characters
    - Use Tailwind CSS utility classes and daisyUI components (input, btn, badge, alert, table) for all styling
    - _Requirements: 4.2_
  - [ ] 6.2 Write component tests (**REQUIRED**)
    - **Test add player form renders**
    - **Test DCI validation feedback**
    - **Test player added to list**
    - **Test player removed from list**
    - **Test player count warning at boundaries**
    - **Test link existing character**
    - **All tests must pass before proceeding**
    - **Minimum 80% coverage required**

- [ ] 7. Implement RewardDistributor and LogPreview
  - [ ] 7.1 Create reward and preview components
    - `RewardDistributor`: assign magic items, story awards to players
    - `AlLogPreview`: formatted preview matching PDF output
    - Export button triggering PDF generation
    - Use Tailwind CSS utility classes and daisyUI components (card, table, btn, divider) for all styling
    - _Requirements: 4.3_
  - [ ] 7.2 Write component tests (**REQUIRED**)
    - **Test RewardDistributor item assignment**
    - **Test RewardDistributor story award creation**
    - **Test LogPreview renders all sections**
    - **Test LogPreview matches expected format**
    - **Test export button calls exportAlLog mutation**
    - **Test loading state during export**
    - **All tests must pass before proceeding**
    - **Minimum 80% coverage required**

- [ ] 8. Implement AlLogHistory component
  - [ ] 8.1 Create `src/features/al-logs/components/AlLogHistory.tsx`
    - List of past AL sessions with key details
    - Filter by season, date range
    - Search by adventure title or AL code
    - Re-export button for past sessions
    - Duplicate session button for repeat runs
    - DM summary statistics
    - Use Tailwind CSS utility classes and daisyUI components (table, input, select, btn, stat, card) for all styling
    - _Requirements: 4.4_
  - [ ] 8.2 Write component tests (**REQUIRED**)
    - **Test history list rendering**
    - **Test filter by season**
    - **Test search by title**
    - **Test re-export button calls mutation**
    - **Test duplicate populates form**
    - **Test DM summary stats display**
    - **All tests must pass before proceeding**
    - **Minimum 80% coverage required**

- [ ] 9. Integration testing
  - [ ] 9.1 Write integration tests (**REQUIRED**)
    - **Test full AL session flow**: create session → add players → add rewards → export
    - **Test reward auto-calculation**: create 4hr session → verify 2 ACP, 2 TCP, 10 downtime
    - **Test PDF download**: export → receive URL → download succeeds
    - **Test session duplication**: duplicate → verify pre-populated fields
    - **Test DM summary updates**: add sessions → summary totals increase
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
- **AL rules**: Season 9+ uses checkpoints, earlier uses XP/gold.
- **Standard durations**: 2 or 4 hours per AL rules.
- **Player count**: 3-7 per table (warn outside range).
- **DCI validation**: 10-digit number format.
- **PDF retention**: 90 days before auto-deletion.
