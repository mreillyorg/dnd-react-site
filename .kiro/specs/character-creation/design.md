# Design Document - Character Creation

## Overview

This design implements a comprehensive D&D 5e character sheet management system including character creation, ability scores, hit points, armor class, skills, equipment, and spell management. The system supports multi-class characters and integrates with the combat tracker for HP management.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                 React Character Forms                        │
│  (Creation wizard, character sheet, stat editor)            │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│              Character State Management                      │
│  (React Context, form validation, calculations)             │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│                GraphQL Character API                         │
│  (Queries, mutations, subscriptions)                        │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│              Character Service Layer                         │
│  (Business logic, stat calculations, validation)            │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│                  Prisma Client                               │
│  (Character, CharacterClass, Feature, Spell tables)         │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│                     Database                                 │
│  (Character data with relationships)                        │
└─────────────────────────────────────────────────────────────┘
```

## Database Schema

```prisma
model Character {
  id            String    @id @default(cuid())
  name          String
  race          String
  background    String?
  alignment     String?
  level         Int       @default(1)
  experiencePoints Int    @default(0)
  
  // Ability Scores
  strength      Int       @default(10)
  dexterity     Int       @default(10)
  constitution  Int       @default(10)
  intelligence  Int       @default(10)
  wisdom        Int       @default(10)
  charisma      Int       @default(10)
  
  // Hit Points
  maxHp         Int
  currentHp     Int
  tempHp        Int       @default(0)
  hitDice       String    // e.g., "3d8+2d6"
  hitDiceRemaining String  // e.g., "3d8+2d6"
  
  // Combat Stats
  armorClass    Int
  initiative    Int       // Calculated from Dexterity
  speed         Int       @default(30)
  
  // Proficiencies
  proficiencyBonus Int    @default(2)
  savingThrowProficiencies String  // JSON array of ability names
  skillProficiencies String        // JSON array of skill names
  skillExpertise     String?       // JSON array of skill names
  
  // Other
  inspiration   Boolean   @default(false)
  notes         String?
  appearance    String?
  backstory     String?
  personalityTraits String?
  ideals        String?
  bonds         String?
  flaws         String?
  
  // Ownership
  userId        String
  user          User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  campaignId    String?
  campaign      Campaign? @relation(fields: [campaignId], references: [id], onDelete: SetNull)
  
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  
  // Relations
  classes       CharacterClass[]
  features      CharacterFeature[]
  spells        CharacterSpell[]
  inventory     ItemAssignment[]
  
  @@index([userId])
  @@index([campaignId])
}

model CharacterClass {
  id            String    @id @default(cuid())
  className     String    // Fighter, Wizard, etc.
  level         Int
  subclass      String?
  hitDiceType   String    // d6, d8, d10, d12
  
  characterId   String
  character     Character @relation(fields: [characterId], references: [id], onDelete: Cascade)
  
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  
  @@index([characterId])
}

model CharacterFeature {
  id            String    @id @default(cuid())
  name          String
  description   String
  source        String    // "Class", "Race", "Feat", "Background"
  usesRemaining Int?
  usesMax       Int?
  
  characterId   String
  character     Character @relation(fields: [characterId], references: [id], onDelete: Cascade)
  
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  
  @@index([characterId])
}

model CharacterSpell {
  id            String    @id @default(cuid())
  name          String
  level         Int
  school        String
  castingTime   String
  range         String
  components    String    // V, S, M
  duration      String
  description   String
  prepared      Boolean   @default(false)
  alwaysPrepared Boolean  @default(false)
  
  characterId   String
  character     Character @relation(fields: [characterId], references: [id], onDelete: Cascade)
  
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  
  @@index([characterId])
  @@index([level])
}
```


## Core Calculation Logic

```typescript
// src/services/characterService.ts

export function calculateAbilityModifier(score: number): number {
  return Math.floor((score - 10) / 2);
}

export function calculateProficiencyBonus(level: number): number {
  return Math.ceil(level / 4) + 1;
}

export function calculateSkillBonus(
  abilityScore: number,
  proficiencyBonus: number,
  isProficient: boolean,
  hasExpertise: boolean
): number {
  const mod = calculateAbilityModifier(abilityScore);
  if (hasExpertise) return mod + proficiencyBonus * 2;
  if (isProficient) return mod + proficiencyBonus;
  return mod;
}

export function calculatePassivePerception(
  wisdomScore: number,
  proficiencyBonus: number,
  isProficient: boolean
): number {
  return 10 + calculateSkillBonus(wisdomScore, proficiencyBonus, isProficient, false);
}

export function calculateHitPoints(
  classes: { level: number; hitDiceType: string }[],
  constitutionScore: number
): number {
  const conMod = calculateAbilityModifier(constitutionScore);
  let totalHp = 0;

  classes.forEach((cls, index) => {
    const diceMax = parseInt(cls.hitDiceType.replace('d', ''));
    if (index === 0) {
      // First level gets max hit dice + con mod
      totalHp += diceMax + conMod;
      // Subsequent levels get average + con mod
      totalHp += (cls.level - 1) * (Math.floor(diceMax / 2) + 1 + conMod);
    } else {
      // Multiclass levels get average + con mod
      totalHp += cls.level * (Math.floor(diceMax / 2) + 1 + conMod);
    }
  });

  return Math.max(1, totalHp);
}

export const SKILL_ABILITY_MAP: Record<string, string> = {
  acrobatics: 'dexterity',
  animalHandling: 'wisdom',
  arcana: 'intelligence',
  athletics: 'strength',
  deception: 'charisma',
  history: 'intelligence',
  insight: 'wisdom',
  intimidation: 'charisma',
  investigation: 'intelligence',
  medicine: 'wisdom',
  nature: 'intelligence',
  perception: 'wisdom',
  performance: 'charisma',
  persuasion: 'charisma',
  religion: 'intelligence',
  sleightOfHand: 'dexterity',
  stealth: 'dexterity',
  survival: 'wisdom',
};
```

## GraphQL Schema

```graphql
type Character {
  id: ID!
  name: String!
  race: String!
  background: String
  alignment: String
  level: Int!
  experiencePoints: Int!
  strength: Int!
  dexterity: Int!
  constitution: Int!
  intelligence: Int!
  wisdom: Int!
  charisma: Int!
  maxHp: Int!
  currentHp: Int!
  tempHp: Int!
  armorClass: Int!
  speed: Int!
  proficiencyBonus: Int!
  inspiration: Boolean!
  classes: [CharacterClass!]!
  features: [CharacterFeature!]!
  spells: [CharacterSpell!]!
  inventory: [ItemAssignment!]!
}

input CreateCharacterInput {
  name: String!
  race: String!
  background: String
  alignment: String
  strength: Int!
  dexterity: Int!
  constitution: Int!
  intelligence: Int!
  wisdom: Int!
  charisma: Int!
  className: String!
  hitDiceType: String!
  armorClass: Int!
  speed: Int
  skillProficiencies: [String!]!
  savingThrowProficiencies: [String!]!
}

type Query {
  character(id: ID!): Character
  myCharacters: [Character!]!
}

type Mutation {
  createCharacter(input: CreateCharacterInput!): Character!
  updateCharacter(id: ID!, input: UpdateCharacterInput!): Character!
  deleteCharacter(id: ID!): Boolean!
  addClassLevel(characterId: ID!, className: String!, hitDiceType: String!, subclass: String): Character!
  updateAbilityScores(characterId: ID!, scores: AbilityScoresInput!): Character!
  addFeature(characterId: ID!, input: FeatureInput!): CharacterFeature!
  addSpell(characterId: ID!, input: SpellInput!): CharacterSpell!
  removeSpell(characterId: ID!, spellId: ID!): Boolean!
  toggleSpellPrepared(characterId: ID!, spellId: ID!): CharacterSpell!
}
```

## Frontend Components

- `CharacterCreationWizard`: Multi-step form (race, class, abilities, skills, equipment)
- `CharacterSheet`: Full character sheet display
- `AbilityScoreEditor`: Edit ability scores with modifier display
- `SkillsList`: Display all skills with proficiency toggles
- `SpellList`: Display prepared/known spells grouped by level
- `CharacterList`: User's characters with quick actions

## Testing Strategy

### Required Tests

1. **Unit tests for calculation logic**:
   - Ability modifier calculation for all values
   - Proficiency bonus by level
   - Skill bonus with/without proficiency/expertise
   - HP calculation for single and multiclass
   - Passive perception

2. **GraphQL tests**:
   - Create character with all fields
   - Update character fields
   - Delete character (owner only)
   - Add class levels (multiclass)
   - Manage spells and features
   - Authorization (ownership check)

3. **Frontend component tests**:
   - Creation wizard step navigation
   - Character sheet rendering with calculations
   - Ability score editor interactions
   - Skill list proficiency toggling
   - Spell management (add, remove, prepare)

4. **Integration tests**:
   - Full character creation flow
   - Level up flow
   - Multiclass flow
   - Character deletion

**Minimum coverage**: 80%
