# Design Document - Campaign Tracking

## Overview

Campaign Tracking is the organizational hub for D&D campaigns. It manages campaigns, sessions, NPCs, locations, quests, timelines, and party membership. DMs create and manage campaigns while players join as members with read access.

## Architecture

```
┌──────────────────────────────────────────┐
│       React Campaign UI                  │
│  (Dashboard, NPCs, Locations, Quests)    │
└──────────┬───────────────────────────────┘
           │
           ▼
┌──────────────────────────────────────────┐
│       Campaign State / Hooks             │
│  (useCampaign, useSession, useNPC)       │
└──────────┬───────────────────────────────┘
           │
           ▼
┌──────────────────────────────────────────┐
│       GraphQL Campaign API               │
│  (CRUD for all campaign entities)        │
└──────────┬───────────────────────────────┘
           │
           ▼
┌──────────────────────────────────────────┐
│       Campaign Service Layer             │
│  (Authorization, business rules)         │
└──────────┬───────────────────────────────┘
           │
           ▼
┌──────────────────────────────────────────┐
│       Prisma / Database                  │
│  (Campaign, Session, NPC, etc.)          │
└──────────────────────────────────────────┘
```

## Database Schema

Uses Campaign, Session, SessionNote, NPC, Location, Quest, TimelineEntry models from data-storage-api. Additional models:

```prisma
model CampaignMember {
  id          String   @id @default(cuid())
  accessLevel String   @default("player") // "viewer" | "player"
  userId      String
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  campaignId  String
  campaign    Campaign @relation(fields: [campaignId], references: [id], onDelete: Cascade)
  createdAt   DateTime @default(now())

  @@unique([userId, campaignId])
  @@index([campaignId])
  @@index([userId])
}

model Tag {
  id         String   @id @default(cuid())
  name       String
  color      String?
  campaignId String
  campaign   Campaign @relation(fields: [campaignId], references: [id], onDelete: Cascade)
  createdAt  DateTime @default(now())

  @@unique([name, campaignId])
  @@index([campaignId])
}
```

## Authorization Model

- **Campaign Owner**: Full CRUD on all campaign entities
- **Campaign Member (player)**: Read-only on NPCs, locations, quests, sessions; can link own characters
- **Campaign Member (viewer)**: Read-only on all entities
- Non-members cannot access campaign data

## GraphQL Schema (Key Operations)

```graphql
type Query {
  campaign(id: ID!): Campaign
  myCampaigns: [Campaign!]!
  campaignNpcs(campaignId: ID!, filter: NpcFilter): [NPC!]!
  campaignLocations(campaignId: ID!, filter: LocationFilter): [Location!]!
  campaignQuests(campaignId: ID!, filter: QuestFilter): [Quest!]!
  campaignTimeline(campaignId: ID!, filter: TimelineFilter): [TimelineEntry!]!
}

type Mutation {
  createCampaign(input: CreateCampaignInput!): Campaign!
  updateCampaign(id: ID!, input: UpdateCampaignInput!): Campaign!
  archiveCampaign(id: ID!): Campaign!
  deleteCampaign(id: ID!): Boolean!
  inviteMember(campaignId: ID!, email: String!): CampaignMember!
  removeMember(campaignId: ID!, memberId: ID!): Boolean!
  createSession(campaignId: ID!, input: SessionInput!): Session!
  createNpc(campaignId: ID!, input: NpcInput!): NPC!
  createLocation(campaignId: ID!, input: LocationInput!): Location!
  createQuest(campaignId: ID!, input: QuestInput!): Quest!
  createTimelineEntry(campaignId: ID!, input: TimelineEntryInput!): TimelineEntry!
}
```

## Frontend Components

- `CampaignDashboard`: Overview with widgets for quests, sessions, NPCs
- `CampaignList`: User's campaigns (owned + member)
- `SessionManager`: Session list, notes editor
- `NpcList` / `NpcDetail`: NPC management
- `LocationList` / `LocationDetail`: Location management with hierarchy
- `QuestList` / `QuestDetail`: Quest tracking with status
- `TimelineView`: Chronological campaign events
- `TagManager`: Tag creation and filtering

## Testing Strategy

### Required Tests

1. **Service layer tests**:
   - Campaign CRUD with authorization
   - Member invitation and removal
   - Session management
   - NPC/Location/Quest CRUD
   - Tag management
   - Owner-only enforcement

2. **GraphQL tests**:
   - All queries with authorization checks
   - All mutations with owner validation
   - Member access restrictions (read-only)
   - Non-member access denied

3. **Frontend component tests**:
   - Dashboard widget rendering
   - Campaign list with owned/member separation
   - NPC/Location/Quest list and detail views
   - Session notes editor
   - Tag filtering behavior

4. **Integration tests**:
   - Full campaign lifecycle (create → invite → play → archive)
   - Session with notes flow
   - Quest status progression
   - Timeline building

**Minimum coverage**: 80%
