# Design Document - Session Scheduling

## Overview

Session Scheduling enables DMs and players to schedule gaming sessions, track RSVPs, manage recurring sessions, propose dates with voting, and view a campaign calendar. It integrates with Campaign Tracking to link scheduled sessions to session notes.

## Architecture

```
┌──────────────────────────────────────────┐
│       React Scheduling UI                │
│  (Calendar, RSVP, Proposals, Reminders)  │
└──────────┬───────────────────────────────┘
           │
           ▼
┌──────────────────────────────────────────┐
│       Scheduling Hooks / State           │
│  (useSchedule, useCalendar, useRsvp)     │
└──────────┬───────────────────────────────┘
           │
           ▼
┌──────────────────────────────────────────┐
│       GraphQL Scheduling API             │
│  (Sessions, RSVPs, Proposals, Recurring) │
└──────────┬───────────────────────────────┘
           │
           ▼
┌──────────────────────────────────────────┐
│       Scheduling Service                 │
│  (Time zones, recurrence, quorum)        │
└──────────┬───────────────────────────────┘
           │
           ▼
┌──────────────────────────────────────────┐
│       Prisma / Database                  │
│  (ScheduledSession, RSVP, Proposal)      │
└──────────────────────────────────────────┘
```

## Database Schema

```prisma
model ScheduledSession {
  id            String   @id @default(cuid())
  title         String?
  description   String?
  dateTime      DateTime
  duration      Float?   // hours
  location      String?  // "in_person", "online", "hybrid"
  meetingLink   String?
  quorum        Int      @default(3)
  isRecurring   Boolean  @default(false)
  
  campaignId    String
  campaign      Campaign @relation(fields: [campaignId], references: [id], onDelete: Cascade)
  
  recurringScheduleId String?
  recurringSchedule   RecurringSchedule? @relation(fields: [recurringScheduleId], references: [id])
  
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  
  rsvps         RSVP[]
  
  @@index([campaignId])
  @@index([dateTime])
}

model RSVP {
  id            String   @id @default(cuid())
  status        String   @default("no_response") // attending, not_attending, maybe, no_response
  
  userId        String
  user          User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  scheduledSessionId String
  scheduledSession   ScheduledSession @relation(fields: [scheduledSessionId], references: [id], onDelete: Cascade)
  
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  
  @@unique([userId, scheduledSessionId])
  @@index([scheduledSessionId])
}

model RecurringSchedule {
  id            String   @id @default(cuid())
  frequency     String   // "weekly", "bi_weekly", "monthly"
  dayOfWeek     Int      // 0-6 (Sunday-Saturday)
  startTime     String   // "HH:MM" format
  endDate       DateTime?
  
  campaignId    String
  campaign      Campaign @relation(fields: [campaignId], references: [id], onDelete: Cascade)
  
  createdAt     DateTime @default(now())
  
  sessions      ScheduledSession[]
  
  @@index([campaignId])
}

model SessionProposal {
  id            String   @id @default(cuid())
  status        String   @default("open") // "open", "closed", "converted"
  
  campaignId    String
  campaign      Campaign @relation(fields: [campaignId], references: [id], onDelete: Cascade)
  
  createdById   String
  
  createdAt     DateTime @default(now())
  closesAt      DateTime
  
  options       ProposalOption[]
  
  @@index([campaignId])
}

model ProposalOption {
  id          String   @id @default(cuid())
  dateTime    DateTime
  
  proposalId  String
  proposal    SessionProposal @relation(fields: [proposalId], references: [id], onDelete: Cascade)
  
  votes       ProposalVote[]
  
  @@index([proposalId])
}

model ProposalVote {
  id        String   @id @default(cuid())
  userId    String
  optionId  String
  option    ProposalOption @relation(fields: [optionId], references: [id], onDelete: Cascade)
  
  @@unique([userId, optionId])
  @@index([optionId])
}
```

## Core Logic

```typescript
// src/services/schedulingService.ts

export function calculateNextOccurrences(
  schedule: { frequency: string; dayOfWeek: number; startTime: string },
  fromDate: Date,
  count: number
): Date[] {
  // Generate next N session dates based on frequency
}

export function isQuorumMet(
  attendingCount: number,
  quorum: number
): boolean {
  return attendingCount >= quorum;
}

export function getRsvpSummary(rsvps: { status: string }[]): {
  attending: number;
  notAttending: number;
  maybe: number;
  noResponse: number;
} {
  return rsvps.reduce((acc, r) => {
    acc[r.status as keyof typeof acc]++;
    return acc;
  }, { attending: 0, notAttending: 0, maybe: 0, noResponse: 0 });
}
```

## GraphQL Schema

```graphql
type Mutation {
  createScheduledSession(campaignId: ID!, input: ScheduledSessionInput!): ScheduledSession!
  updateScheduledSession(id: ID!, input: ScheduledSessionInput!): ScheduledSession!
  deleteScheduledSession(id: ID!): Boolean!
  setRsvp(sessionId: ID!, status: RsvpStatus!): RSVP!
  createRecurringSchedule(campaignId: ID!, input: RecurringInput!): RecurringSchedule!
  createProposal(campaignId: ID!, options: [DateTime!]!): SessionProposal!
  voteOnProposal(optionId: ID!): ProposalVote!
  convertProposalToSession(optionId: ID!): ScheduledSession!
}

type Query {
  campaignSchedule(campaignId: ID!, from: DateTime, to: DateTime): [ScheduledSession!]!
  scheduledSession(id: ID!): ScheduledSession
  activeProposals(campaignId: ID!): [SessionProposal!]!
}
```

## Frontend Components

- `CampaignCalendar`: Month/week/list views of scheduled sessions
- `ScheduleSessionForm`: Create/edit scheduled sessions
- `RsvpPanel`: RSVP buttons and summary display
- `RecurringScheduleForm`: Set up recurring sessions
- `ProposalCard`: Vote on proposed dates
- `SessionReminder`: Upcoming session notification

## Testing Strategy

### Required Tests

1. **Unit tests**:
   - Next occurrence calculation for all frequencies
   - Quorum calculation
   - RSVP summary aggregation
   - Date/time zone handling

2. **GraphQL tests**:
   - Schedule CRUD with campaign owner auth
   - RSVP creation/updates by members
   - Recurring schedule generation
   - Proposal voting and conversion
   - Non-member access denied

3. **Frontend tests**:
   - Calendar rendering with sessions
   - RSVP button interactions
   - Proposal voting UI
   - Form validation

4. **Integration tests**:
   - Full scheduling flow (create → RSVP → remind)
   - Recurring session generation
   - Proposal → session conversion

**Minimum coverage**: 80%
