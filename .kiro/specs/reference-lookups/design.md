# Design Document - Reference Lookups

## Overview

Reference Lookups provides access to D&D 5e SRD content including spells, monsters, items, rules, and conditions. It features full-text search, filtering, bookmarking, and contextual links from other system components.

## Architecture

```
┌──────────────────────────────────────────┐
│       React Reference UI                 │
│  (Spell Browser, Rules, Conditions)      │
└──────────┬───────────────────────────────┘
           │
           ▼
┌──────────────────────────────────────────┐
│       Reference Hooks / State            │
│  (useSearch, useBookmarks, useFilter)    │
└──────────┬───────────────────────────────┘
           │
           ▼
┌──────────────────────────────────────────┐
│       GraphQL Reference API              │
│  (Search, filter, bookmarks)             │
└──────────┬───────────────────────────────┘
           │
           ▼
┌──────────────────────────────────────────┐
│       Reference Service                  │
│  (Search index, filtering, pagination)   │
└──────────┬───────────────────────────────┘
           │
           ▼
┌──────────────────────────────────────────┐
│       Prisma / Database                  │
│  (SRD content tables, bookmarks)         │
└──────────────────────────────────────────┘
```

## Database Schema

```prisma
model SrdSpell {
  id            String  @id @default(cuid())
  name          String  @unique
  level         Int
  school        String
  castingTime   String
  range         String
  components    String  // "V, S, M (a bit of fleece)"
  duration      String
  description   String
  higherLevels  String?
  ritual        Boolean @default(false)
  concentration Boolean @default(false)
  classes       String  // JSON array of class names

  @@index([level])
  @@index([school])
}

model SrdCondition {
  id          String @id @default(cuid())
  name        String @unique
  description String
}

model SrdRule {
  id          String  @id @default(cuid())
  name        String
  category    String  // "combat", "spellcasting", "movement", etc.
  content     String
  parentId    String?
  parent      SrdRule? @relation("RuleHierarchy", fields: [parentId], references: [id])
  children    SrdRule[] @relation("RuleHierarchy")

  @@index([category])
  @@index([parentId])
}

model ReferenceBookmark {
  id            String  @id @default(cuid())
  referenceType String  // "spell", "monster", "item", "rule", "condition"
  referenceId   String
  notes         String?
  userId        String
  user          User    @relation(fields: [userId], references: [id], onDelete: Cascade)
  createdAt     DateTime @default(now())

  @@unique([userId, referenceType, referenceId])
  @@index([userId])
}
```

## Core Logic

```typescript
// src/services/referenceService.ts

export interface SearchResult {
  id: string;
  name: string;
  category: string;
  excerpt: string;
  relevanceScore: number;
}

export function searchReferences(
  query: string,
  category?: string
): Promise<SearchResult[]> {
  // Full-text search across all SRD content
  // Name matches prioritized over description matches
  // Fuzzy matching for misspellings
}

export function filterSpells(
  spells: SrdSpell[],
  filter: {
    level?: number;
    school?: string;
    class?: string;
    concentration?: boolean;
    ritual?: boolean;
  }
): SrdSpell[] {
  // Apply all filter criteria
}
```

## GraphQL Schema

```graphql
type Query {
  searchReferences(query: String!, category: String): [SearchResult!]!
  spells(filter: SpellFilter): [SrdSpell!]!
  spell(id: ID!): SrdSpell
  conditions: [SrdCondition!]!
  condition(id: ID!): SrdCondition
  rules(category: String): [SrdRule!]!
  rule(id: ID!): SrdRule
  myBookmarks: [ReferenceBookmark!]!
}

type Mutation {
  addBookmark(referenceType: String!, referenceId: ID!, notes: String): ReferenceBookmark!
  removeBookmark(id: ID!): Boolean!
  updateBookmarkNotes(id: ID!, notes: String!): ReferenceBookmark!
}
```

## Frontend Components

- `ReferenceSearch`: Global search bar with autocomplete
- `SpellBrowser`: Filterable spell list with detail view
- `ConditionList`: All conditions with descriptions
- `RulesBrowser`: Hierarchical rules navigation
- `BookmarkPanel`: User's saved references
- `ReferenceModal`: Inline reference popup from other features

## Testing Strategy

### Required Tests

1. **Unit tests**:
   - Search relevance scoring
   - Spell filtering with all criteria
   - Fuzzy matching logic
   - Bookmark CRUD

2. **GraphQL tests**:
   - Search across categories
   - Spell queries with filters
   - Condition queries
   - Rule hierarchy queries
   - Bookmark mutations (auth required)

3. **Frontend tests**:
   - Search input with autocomplete
   - Spell browser filtering
   - Condition list rendering
   - Rules hierarchy navigation
   - Bookmark toggling
   - Reference modal display

4. **Integration tests**:
   - Full search flow
   - Bookmark lifecycle
   - Contextual link from combat tracker

**Minimum coverage**: 80%
