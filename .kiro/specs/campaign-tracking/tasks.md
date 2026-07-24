# Implementation Plan: Campaign Tracking

## Overview

Implement campaign management including CRUD, member invitations, sessions/notes, NPCs, locations, quests, timeline, and tagging. All tests required with 80% minimum coverage.

---

## Tasks

- [ ] 1. Implement campaign service with authorization
  - [ ] 1.1 Create `src/services/campaignService.ts`
    - Implement `createCampaign(userId, input)`: create with owner
    - Implement `getCampaignById(id, userId)`: verify access (owner or member)
    - Implement `listCampaigns(userId)`: owned + member campaigns
    - Implement `updateCampaign(id, userId, input)`: owner only
    - Implement `archiveCampaign(id, userId)`: set status to ARCHIVED
    - Implement `deleteCampaign(id, userId)`: owner only, cascade
    - Implement `isOwner(campaignId, userId)`: helper
    - Implement `isMember(campaignId, userId)`: helper
    - _Requirements: 1.1, 1.2_
  - [ ] 1.2 Write unit tests for campaign service (**REQUIRED**)
    - **Test createCampaign**: assert campaign created, user is owner
    - **Test getCampaignById as owner**: assert returns campaign
    - **Test getCampaignById as member**: assert returns campaign
    - **Test getCampaignById as non-member**: assert throws FORBIDDEN
    - **Test listCampaigns**: returns both owned and member campaigns
    - **Test updateCampaign as owner**: assert updated
    - **Test updateCampaign as non-owner**: assert throws FORBIDDEN
    - **Test archiveCampaign**: assert status set to ARCHIVED
    - **Test deleteCampaign as owner**: assert deleted with cascade
    - **Test deleteCampaign as non-owner**: assert throws FORBIDDEN
    - **All tests must pass before proceeding**
    - **Minimum 80% coverage required**

- [ ] 2. Implement member management service
  - [ ] 2.1 Create member management in campaign service
    - Implement `inviteMember(campaignId, userId, email)`: owner only, find user by email, create CampaignMember
    - Implement `removeMember(campaignId, userId, memberId)`: owner only
    - Implement `updateMemberAccess(campaignId, userId, memberId, accessLevel)`: owner only
    - Implement `listMembers(campaignId, userId)`: all members for authorized users
    - _Requirements: 2.1, 2.2_
  - [ ] 2.2 Write unit tests for member management (**REQUIRED**)
    - **Test inviteMember as owner**: assert member created
    - **Test inviteMember as non-owner**: assert throws FORBIDDEN
    - **Test inviteMember duplicate**: assert throws CONFLICT
    - **Test inviteMember nonexistent email**: assert throws NOT_FOUND
    - **Test removeMember as owner**: assert member removed
    - **Test removeMember as non-owner**: assert throws FORBIDDEN
    - **Test updateMemberAccess**: assert access level changed
    - **Test listMembers**: returns all members with access levels
    - **All tests must pass before proceeding**
    - **Minimum 80% coverage required**

- [ ] 3. Implement session and notes service
  - [ ] 3.1 Create `src/services/sessionService.ts`
    - Implement `createSession(campaignId, userId, input)`: auto-increment session number
    - Implement `updateSession(sessionId, userId, input)`: owner only
    - Implement `deleteSession(sessionId, userId)`: owner only, cascade notes
    - Implement `listSessions(campaignId, userId)`: chronological order
    - Implement `createSessionNote(sessionId, userId, input)`: owner only
    - Implement `updateSessionNote(noteId, userId, input)`: owner only
    - _Requirements: 3.1, 3.2_
  - [ ] 3.2 Write unit tests for session service (**REQUIRED**)
    - **Test createSession**: auto-increment number, correct fields
    - **Test createSession auth**: owner only
    - **Test listSessions**: returns chronological, respects access
    - **Test createSessionNote**: note linked to session
    - **Test session summary**: only one summary per session
    - **Test deleteSession cascade**: notes deleted with session
    - **All tests must pass before proceeding**
    - **Minimum 80% coverage required**

- [ ] 4. Implement NPC, Location, Quest services
  - [ ] 4.1 Create entity services
    - `npcService.ts`: CRUD for NPCs with campaign authorization
    - `locationService.ts`: CRUD with hierarchical parent-child support
    - `questService.ts`: CRUD with status transitions (not_started → active → completed/failed)
    - All enforce owner-only writes, member read access
    - _Requirements: 4.1, 4.2, 4.3_
  - [ ] 4.2 Write unit tests for entity services (**REQUIRED**)
    - **Test NPC CRUD**: create, read, update, delete with auth
    - **Test NPC read by member**: assert allowed
    - **Test NPC write by member**: assert FORBIDDEN
    - **Test Location hierarchy**: parent-child linking
    - **Test Location cascade**: deleting parent doesn't delete children (set null)
    - **Test Quest status transitions**: valid and invalid transitions
    - **Test Quest list by status filter**
    - **All tests must pass before proceeding**
    - **Minimum 80% coverage required**

- [ ] 5. Implement timeline and tag services
  - [ ] 5.1 Create timeline and tag services
    - `timelineService.ts`: CRUD for timeline entries, sorted by in-game date
    - `tagService.ts`: create, rename, delete tags; apply/remove from entities
    - Tag filtering for NPCs, locations, quests
    - _Requirements: 5.1, 5.2_
  - [ ] 5.2 Write unit tests for timeline and tags (**REQUIRED**)
    - **Test timeline CRUD**: create, sort by date, filter by range
    - **Test tag creation**: unique name per campaign
    - **Test tag duplicate**: assert CONFLICT for same name
    - **Test tag deletion**: removed from entities, entities not deleted
    - **Test tag filtering**: filter entities by tag
    - **All tests must pass before proceeding**
    - **Minimum 80% coverage required**

- [ ] 6. Checkpoint — Backend complete
  - **GATE: All backend tests must pass with 80%+ coverage**
  - Run `npm run test:coverage`
  - **DO NOT PROCEED without passing tests**

- [ ] 7. Implement GraphQL schema for all campaign entities
  - [ ] 7.1 Create campaign GraphQL types and resolvers
    - Wire all service functions to GraphQL mutations/queries
    - Implement all input types and filters
    - Authorization checks in all resolvers
    - _Requirements: 6.1_
  - [ ] 7.2 Write resolver tests (**REQUIRED**)
    - **Test all campaign queries with auth**
    - **Test all campaign mutations with owner check**
    - **Test member queries (read-only access)**
    - **Test non-member access denied**
    - **Test filter parameters (status, tags, date range)**
    - **All tests must pass before proceeding**
    - **Minimum 80% coverage required**

- [ ] 8. Implement CampaignDashboard and CampaignList components
  - [ ] 8.1 Create frontend components
    - `CampaignList`: owned + member campaigns with status badges
    - `CampaignDashboard`: widgets for active quests, recent sessions, NPCs
    - `CreateCampaignForm`: name, setting, description
    - _Requirements: 7.1_
  - [ ] 8.2 Write component tests (**REQUIRED**)
    - **Test CampaignList rendering with owned and member sections**
    - **Test CampaignList empty state**
    - **Test CampaignDashboard widget rendering**
    - **Test CreateCampaignForm validation and submission**
    - **Test campaign status badges**
    - **All tests must pass before proceeding**
    - **Minimum 80% coverage required**

- [ ] 9. Implement NPC, Location, Quest UI components
  - [ ] 9.1 Create entity management components
    - `NpcList` / `NpcDetail`: list with filters, detail with relationships
    - `LocationList` / `LocationDetail`: hierarchy display, map references
    - `QuestList` / `QuestDetail`: status indicators, linked entities
    - `TagFilter`: reusable tag filter component
    - _Requirements: 7.2_
  - [ ] 9.2 Write component tests (**REQUIRED**)
    - **Test NPC list rendering and filtering**
    - **Test NPC detail with relationships**
    - **Test Location hierarchy display**
    - **Test Quest status transitions UI**
    - **Test TagFilter component**
    - **Test empty states for all lists**
    - **All tests must pass before proceeding**
    - **Minimum 80% coverage required**

- [ ] 10. Implement Session and Timeline UI components
  - [ ] 10.1 Create session and timeline components
    - `SessionList`: chronological session list
    - `SessionDetail`: notes editor, linked encounters
    - `TimelineView`: chronological events with filtering
    - _Requirements: 7.3_
  - [ ] 10.2 Write component tests (**REQUIRED**)
    - **Test SessionList rendering**
    - **Test SessionDetail notes display**
    - **Test TimelineView chronological order**
    - **Test Timeline filtering by date range**
    - **All tests must pass before proceeding**
    - **Minimum 80% coverage required**

- [ ] 11. Integration testing
  - [ ] 11.1 Write integration tests (**REQUIRED**)
    - **Test full campaign lifecycle**: create → invite members → add sessions → archive
    - **Test session with notes flow**: create session → add notes → view
    - **Test NPC/Location/Quest relationships**: create entities, link them, verify
    - **Test member access control**: member can read, cannot write
    - **Test tag filtering across entities**
    - **All tests must pass before proceeding**
    - **Minimum 80% coverage**

- [ ] 12. Final checkpoint
  - **FINAL GATE: ALL tests must pass with 80%+ coverage**
  - Run `npm run test:coverage`
  - **DO NOT PROCEED without passing all tests**

---

## Notes

- **TESTING IS MANDATORY**: Every task includes required tests.
- **Coverage requirement**: 80% minimum.
- **Authorization**: Owner has full CRUD, members are read-only, non-members denied.
- **Cascade deletes**: Campaign deletion removes all child entities.
- **Tags**: Unique per campaign, can be applied to NPCs, locations, quests, timeline entries.
