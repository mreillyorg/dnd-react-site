# Implementation Plan: Session Scheduling

## Overview

Implement session scheduling with RSVP tracking, recurring sessions, proposal voting, and calendar views. All tests required with 80% minimum coverage.

---

## Tasks

- [ ] 1. Implement scheduling calculation service
  - [ ] 1.1 Create `src/services/schedulingService.ts`
    - Implement `calculateNextOccurrences(schedule, fromDate, count)`: generate dates by frequency
    - Implement `isQuorumMet(attending, quorum)`: check threshold
    - Implement `getRsvpSummary(rsvps)`: aggregate by status
    - Implement `isSessionUpcoming(dateTime, hoursAhead)`: for reminder logic
    - Implement `validateMeetingLink(url)`: URL format validation
    - _Requirements: 1.1, 1.2_
  - [ ] 1.2 Write unit tests for scheduling service (**REQUIRED**)
    - **Test calculateNextOccurrences weekly**: 4 correct dates generated
    - **Test calculateNextOccurrences bi_weekly**: correct 2-week intervals
    - **Test calculateNextOccurrences monthly**: correct monthly dates
    - **Test calculateNextOccurrences respects endDate**: stops at end
    - **Test isQuorumMet true**: 4 attending, quorum 3 → true
    - **Test isQuorumMet false**: 2 attending, quorum 3 → false
    - **Test isQuorumMet edge**: exact quorum → true
    - **Test getRsvpSummary**: correct counts for mixed statuses
    - **Test getRsvpSummary empty**: all zeros
    - **Test isSessionUpcoming true**: session in 2 hours, threshold 24
    - **Test isSessionUpcoming false**: session in 48 hours, threshold 24
    - **Test validateMeetingLink valid**: https URLs pass
    - **Test validateMeetingLink invalid**: non-URLs fail
    - **All tests must pass before proceeding**
    - **Minimum 80% coverage required**

- [ ] 2. Implement scheduling GraphQL mutations
  - [ ] 2.1 Create scheduling GraphQL schema
    - Implement `createScheduledSession`: campaign owner only
    - Implement `updateScheduledSession`: owner only
    - Implement `deleteScheduledSession`: owner only
    - Implement `setRsvp`: any campaign member
    - Implement `campaignSchedule` query: date range filter
    - Implement `scheduledSession` query: by ID
    - _Requirements: 2.1, 2.2_
  - [ ] 2.2 Write mutation tests (**REQUIRED**)
    - **Test createScheduledSession**: created with correct fields
    - **Test createScheduledSession non-owner**: FORBIDDEN
    - **Test updateScheduledSession**: updated
    - **Test deleteScheduledSession**: deleted
    - **Test setRsvp as member**: RSVP created/updated
    - **Test setRsvp as non-member**: FORBIDDEN
    - **Test setRsvp idempotent**: update existing RSVP
    - **Test campaignSchedule date range**: returns filtered results
    - **Test auth required**: unauthenticated rejected
    - **All tests must pass before proceeding**
    - **Minimum 80% coverage required**

- [ ] 3. Implement recurring schedule and proposals
  - [ ] 3.1 Create recurring/proposal mutations
    - Implement `createRecurringSchedule`: generate next 4 sessions
    - Implement `createProposal`: with 2-10 date options
    - Implement `voteOnProposal`: member votes on option
    - Implement `convertProposalToSession`: owner converts winning option
    - Implement `activeProposals` query
    - _Requirements: 3.1, 3.2_
  - [ ] 3.2 Write recurring/proposal tests (**REQUIRED**)
    - **Test createRecurringSchedule**: 4 sessions generated correctly
    - **Test createRecurringSchedule validation**: valid frequency values
    - **Test createProposal**: proposal with options created
    - **Test createProposal min/max options**: 2-10 enforced
    - **Test voteOnProposal**: vote recorded
    - **Test voteOnProposal duplicate**: rejected (one vote per option)
    - **Test convertProposalToSession**: session created, proposal closed
    - **Test convertProposalToSession non-owner**: FORBIDDEN
    - **Test activeProposals**: returns only open proposals
    - **All tests must pass before proceeding**
    - **Minimum 80% coverage required**

- [ ] 4. Checkpoint — Backend complete
  - **GATE: All backend tests must pass with 80%+ coverage**
  - Run `npm run test:coverage`
  - **DO NOT PROCEED without passing tests**

- [ ] 5. Implement CampaignCalendar component
  - [ ] 5.1 Create `src/features/scheduling/components/CampaignCalendar.tsx`
    - Month view with session events
    - Week view with time slots
    - List/agenda view
    - Color coding: confirmed (green), tentative (yellow), past (gray)
    - Click session to view details
    - View mode toggle (month/week/list)
    - _Requirements: 4.1_
  - [ ] 5.2 Write component tests (**REQUIRED**)
    - **Test month view renders sessions on correct dates**
    - **Test week view with time slots**
    - **Test list view in chronological order**
    - **Test color coding by status**
    - **Test session click opens detail**
    - **Test view mode switching**
    - **Test empty calendar state**
    - **All tests must pass before proceeding**
    - **Minimum 80% coverage required**

- [ ] 6. Implement RsvpPanel and ScheduleSessionForm
  - [ ] 6.1 Create RSVP and scheduling form components
    - `RsvpPanel`: attending/maybe/not_attending buttons, summary counts
    - `ScheduleSessionForm`: date, time, duration, location, meeting link
    - Form validation for all fields
    - _Requirements: 4.2_
  - [ ] 6.2 Write component tests (**REQUIRED**)
    - **Test RsvpPanel button rendering**
    - **Test RSVP button click calls mutation**
    - **Test RSVP summary counts display**
    - **Test quorum indicator (met/not met)**
    - **Test ScheduleSessionForm fields**
    - **Test form validation**: date required, link required for online
    - **Test form submission calls mutation**
    - **All tests must pass before proceeding**
    - **Minimum 80% coverage required**

- [ ] 7. Implement ProposalCard and RecurringScheduleForm
  - [ ] 7.1 Create proposal and recurring components
    - `ProposalCard`: display options with vote counts, vote buttons
    - `RecurringScheduleForm`: frequency, day, time, end date
    - _Requirements: 4.3_
  - [ ] 7.2 Write component tests (**REQUIRED**)
    - **Test ProposalCard options display**
    - **Test vote button click**
    - **Test vote counts update**
    - **Test winning option highlighted**
    - **Test RecurringScheduleForm fields**
    - **Test frequency validation**
    - **All tests must pass before proceeding**
    - **Minimum 80% coverage required**

- [ ] 8. Integration testing
  - [ ] 8.1 Write integration tests (**REQUIRED**)
    - **Test full scheduling flow**: create session → members RSVP → quorum check
    - **Test recurring generation**: create schedule → verify sessions generated
    - **Test proposal flow**: create → vote → convert to session
    - **Test RSVP summary updates in real-time**
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
- **Recurring sessions**: Auto-generate 4 future sessions, create more as time passes.
- **Proposals**: 7-day voting window, owner converts to session.
- **RSVP statuses**: attending, not_attending, maybe, no_response.
