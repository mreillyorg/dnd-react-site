/**
 * Drizzle ORM schema — defines all database tables, relations, and indexes.
 * Uses MySQL column types via drizzle-orm/mysql-core.
 */

import { mysqlTable, varchar, text, int, double, boolean, timestamp, index, uniqueIndex } from "drizzle-orm/mysql-core";
import { relations } from "drizzle-orm";
import { createId } from "./cuid.ts";

// ─── Users ───────────────────────────────────────────────────────────────────

export const users = mysqlTable(
  "User",
  {
    id: varchar("id", { length: 36 }).primaryKey().$defaultFn(createId),
    email: varchar("email", { length: 255 }).notNull().unique(),
    name: varchar("name", { length: 255 }),
    themeMode: varchar("themeMode", { length: 20 }).notNull().default("SYSTEM"),
    createdAt: timestamp("createdAt").notNull().defaultNow(),
    updatedAt: timestamp("updatedAt").notNull().defaultNow().onUpdateNow(),
  },
  (table) => [
    index("User_email_idx").on(table.email),
  ],
);

export const usersRelations = relations(users, ({ many }) => ({
  characters: many(characters),
  campaigns: many(campaigns),
  sessions: many(sessions),
  oauthIdentities: many(oauthIdentities),
  authSessions: many(authSessions),
}));

// ─── OAuth Identities ────────────────────────────────────────────────────────

export const oauthIdentities = mysqlTable(
  "OAuthIdentity",
  {
    id: varchar("id", { length: 36 }).primaryKey().$defaultFn(createId),
    provider: varchar("provider", { length: 50 }).notNull(),
    providerUserId: varchar("providerUserId", { length: 255 }).notNull(),
    userId: varchar("userId", { length: 36 }).notNull().references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("createdAt").notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("OAuthIdentity_provider_providerUserId_key").on(table.provider, table.providerUserId),
    index("OAuthIdentity_userId_idx").on(table.userId),
  ],
);

export const oauthIdentitiesRelations = relations(oauthIdentities, ({ one }) => ({
  user: one(users, { fields: [oauthIdentities.userId], references: [users.id] }),
}));

// ─── Auth Sessions ───────────────────────────────────────────────────────────

export const authSessions = mysqlTable(
  "AuthSession",
  {
    id: varchar("id", { length: 36 }).primaryKey().$defaultFn(createId),
    token: varchar("token", { length: 512 }).notNull().unique(),
    userId: varchar("userId", { length: 36 }).notNull().references(() => users.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expiresAt").notNull(),
    createdAt: timestamp("createdAt").notNull().defaultNow(),
  },
  (table) => [
    index("AuthSession_token_idx").on(table.token),
    index("AuthSession_userId_idx").on(table.userId),
  ],
);

export const authSessionsRelations = relations(authSessions, ({ one }) => ({
  user: one(users, { fields: [authSessions.userId], references: [users.id] }),
}));

// ─── Characters ──────────────────────────────────────────────────────────────

export const characters = mysqlTable(
  "Character",
  {
    id: varchar("id", { length: 36 }).primaryKey().$defaultFn(createId),
    name: varchar("name", { length: 255 }).notNull(),
    level: int("level").notNull().default(1),
    class: varchar("class", { length: 100 }).notNull(),
    race: varchar("race", { length: 100 }).notNull(),
    strength: int("strength").notNull().default(10),
    dexterity: int("dexterity").notNull().default(10),
    constitution: int("constitution").notNull().default(10),
    intelligence: int("intelligence").notNull().default(10),
    wisdom: int("wisdom").notNull().default(10),
    charisma: int("charisma").notNull().default(10),
    maxHp: int("maxHp").notNull(),
    currentHp: int("currentHp").notNull(),
    tempHp: int("tempHp").notNull().default(0),
    armorClass: int("armorClass").notNull(),
    userId: varchar("userId", { length: 36 }).notNull().references(() => users.id, { onDelete: "cascade" }),
    campaignId: varchar("campaignId", { length: 36 }).references(() => campaigns.id, { onDelete: "set null" }),
    createdAt: timestamp("createdAt").notNull().defaultNow(),
    updatedAt: timestamp("updatedAt").notNull().defaultNow().onUpdateNow(),
  },
  (table) => [
    index("Character_userId_idx").on(table.userId),
    index("Character_campaignId_idx").on(table.campaignId),
  ],
);

export const charactersRelations = relations(characters, ({ one, many }) => ({
  user: one(users, { fields: [characters.userId], references: [users.id] }),
  campaign: one(campaigns, { fields: [characters.campaignId], references: [campaigns.id] }),
  itemAssignments: many(itemAssignments),
}));

// ─── Campaigns ───────────────────────────────────────────────────────────────

export const campaigns = mysqlTable(
  "Campaign",
  {
    id: varchar("id", { length: 36 }).primaryKey().$defaultFn(createId),
    name: varchar("name", { length: 255 }).notNull(),
    description: text("description"),
    setting: varchar("setting", { length: 255 }),
    status: varchar("status", { length: 20 }).notNull().default("PLANNING"),
    ownerId: varchar("ownerId", { length: 36 }).notNull().references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("createdAt").notNull().defaultNow(),
    updatedAt: timestamp("updatedAt").notNull().defaultNow().onUpdateNow(),
  },
  (table) => [
    index("Campaign_ownerId_idx").on(table.ownerId),
  ],
);

export const campaignsRelations = relations(campaigns, ({ one, many }) => ({
  owner: one(users, { fields: [campaigns.ownerId], references: [users.id] }),
  characters: many(characters),
  sessions: many(sessions),
  npcs: many(npcs),
  locations: many(locations),
  quests: many(quests),
  timelineEntries: many(timelineEntries),
}));

// ─── Combat & Initiative ─────────────────────────────────────────────────────

export const combatEncounters = mysqlTable(
  "CombatEncounter",
  {
    id: varchar("id", { length: 36 }).primaryKey().$defaultFn(createId),
    name: varchar("name", { length: 255 }),
    isActive: boolean("isActive").notNull().default(true),
    currentRound: int("currentRound").notNull().default(1),
    currentTurn: int("currentTurn").notNull().default(0),
    sessionId: varchar("sessionId", { length: 36 }).references(() => sessions.id, { onDelete: "set null" }),
    createdAt: timestamp("createdAt").notNull().defaultNow(),
    updatedAt: timestamp("updatedAt").notNull().defaultNow().onUpdateNow(),
  },
  (table) => [
    index("CombatEncounter_sessionId_idx").on(table.sessionId),
  ],
);

export const combatEncountersRelations = relations(combatEncounters, ({ one, many }) => ({
  session: one(sessions, { fields: [combatEncounters.sessionId], references: [sessions.id] }),
  combatants: many(combatants),
}));

export const combatants = mysqlTable(
  "Combatant",
  {
    id: varchar("id", { length: 36 }).primaryKey().$defaultFn(createId),
    name: varchar("name", { length: 255 }).notNull(),
    initiative: int("initiative").notNull(),
    maxHp: int("maxHp").notNull(),
    currentHp: int("currentHp").notNull(),
    tempHp: int("tempHp").notNull().default(0),
    armorClass: int("armorClass").notNull(),
    combatantType: varchar("combatantType", { length: 20 }).notNull(),
    characterId: varchar("characterId", { length: 36 }),
    monsterId: varchar("monsterId", { length: 36 }).references(() => monsters.id),
    encounterId: varchar("encounterId", { length: 36 }).notNull().references(() => combatEncounters.id, { onDelete: "cascade" }),
    createdAt: timestamp("createdAt").notNull().defaultNow(),
    updatedAt: timestamp("updatedAt").notNull().defaultNow().onUpdateNow(),
  },
  (table) => [
    index("Combatant_encounterId_idx").on(table.encounterId),
  ],
);

export const combatantsRelations = relations(combatants, ({ one }) => ({
  monster: one(monsters, { fields: [combatants.monsterId], references: [monsters.id] }),
  encounter: one(combatEncounters, { fields: [combatants.encounterId], references: [combatEncounters.id] }),
}));

// ─── Sessions ────────────────────────────────────────────────────────────────

export const sessions = mysqlTable(
  "Session",
  {
    id: varchar("id", { length: 36 }).primaryKey().$defaultFn(createId),
    sessionNumber: int("sessionNumber").notNull(),
    title: varchar("title", { length: 255 }),
    realWorldDate: timestamp("realWorldDate").notNull(),
    inGameDate: varchar("inGameDate", { length: 100 }),
    duration: double("duration"),
    campaignId: varchar("campaignId", { length: 36 }).notNull().references(() => campaigns.id, { onDelete: "cascade" }),
    dmId: varchar("dmId", { length: 36 }).notNull().references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("createdAt").notNull().defaultNow(),
    updatedAt: timestamp("updatedAt").notNull().defaultNow().onUpdateNow(),
  },
  (table) => [
    index("Session_campaignId_idx").on(table.campaignId),
    index("Session_dmId_idx").on(table.dmId),
  ],
);

export const sessionsRelations = relations(sessions, ({ one, many }) => ({
  campaign: one(campaigns, { fields: [sessions.campaignId], references: [campaigns.id] }),
  dm: one(users, { fields: [sessions.dmId], references: [users.id] }),
  notes: many(sessionNotes),
  encounters: many(combatEncounters),
}));

export const sessionNotes = mysqlTable(
  "SessionNote",
  {
    id: varchar("id", { length: 36 }).primaryKey().$defaultFn(createId),
    title: varchar("title", { length: 255 }),
    content: text("content").notNull(),
    isSummary: boolean("isSummary").notNull().default(false),
    sessionId: varchar("sessionId", { length: 36 }).notNull().references(() => sessions.id, { onDelete: "cascade" }),
    createdAt: timestamp("createdAt").notNull().defaultNow(),
    updatedAt: timestamp("updatedAt").notNull().defaultNow().onUpdateNow(),
  },
  (table) => [
    index("SessionNote_sessionId_idx").on(table.sessionId),
  ],
);

export const sessionNotesRelations = relations(sessionNotes, ({ one }) => ({
  session: one(sessions, { fields: [sessionNotes.sessionId], references: [sessions.id] }),
}));

// ─── NPCs ────────────────────────────────────────────────────────────────────

export const npcs = mysqlTable(
  "NPC",
  {
    id: varchar("id", { length: 36 }).primaryKey().$defaultFn(createId),
    name: varchar("name", { length: 255 }).notNull(),
    description: text("description"),
    race: varchar("race", { length: 100 }),
    class: varchar("class", { length: 100 }),
    level: int("level"),
    role: varchar("role", { length: 100 }),
    locationId: varchar("locationId", { length: 36 }).references(() => locations.id, { onDelete: "set null" }),
    campaignId: varchar("campaignId", { length: 36 }).notNull().references(() => campaigns.id, { onDelete: "cascade" }),
    createdAt: timestamp("createdAt").notNull().defaultNow(),
    updatedAt: timestamp("updatedAt").notNull().defaultNow().onUpdateNow(),
  },
  (table) => [
    index("NPC_campaignId_idx").on(table.campaignId),
    index("NPC_locationId_idx").on(table.locationId),
  ],
);

export const npcsRelations = relations(npcs, ({ one }) => ({
  location: one(locations, { fields: [npcs.locationId], references: [locations.id] }),
  campaign: one(campaigns, { fields: [npcs.campaignId], references: [campaigns.id] }),
}));

// ─── Locations ───────────────────────────────────────────────────────────────

export const locations = mysqlTable(
  "Location",
  {
    id: varchar("id", { length: 36 }).primaryKey().$defaultFn(createId),
    name: varchar("name", { length: 255 }).notNull(),
    description: text("description"),
    region: varchar("region", { length: 255 }),
    parentId: varchar("parentId", { length: 36 }),
    campaignId: varchar("campaignId", { length: 36 }).notNull().references(() => campaigns.id, { onDelete: "cascade" }),
    createdAt: timestamp("createdAt").notNull().defaultNow(),
    updatedAt: timestamp("updatedAt").notNull().defaultNow().onUpdateNow(),
  },
  (table) => [
    index("Location_campaignId_idx").on(table.campaignId),
    index("Location_parentId_idx").on(table.parentId),
  ],
);

export const locationsRelations = relations(locations, ({ one, many }) => ({
  parent: one(locations, { fields: [locations.parentId], references: [locations.id], relationName: "LocationHierarchy" }),
  children: many(locations, { relationName: "LocationHierarchy" }),
  campaign: one(campaigns, { fields: [locations.campaignId], references: [campaigns.id] }),
  npcs: many(npcs),
}));

// ─── Quests ──────────────────────────────────────────────────────────────────

export const quests = mysqlTable(
  "Quest",
  {
    id: varchar("id", { length: 36 }).primaryKey().$defaultFn(createId),
    name: varchar("name", { length: 255 }).notNull(),
    description: text("description"),
    status: varchar("status", { length: 20 }).notNull().default("NOT_STARTED"),
    rewards: text("rewards"),
    campaignId: varchar("campaignId", { length: 36 }).notNull().references(() => campaigns.id, { onDelete: "cascade" }),
    createdAt: timestamp("createdAt").notNull().defaultNow(),
    updatedAt: timestamp("updatedAt").notNull().defaultNow().onUpdateNow(),
  },
  (table) => [
    index("Quest_campaignId_idx").on(table.campaignId),
  ],
);

export const questsRelations = relations(quests, ({ one }) => ({
  campaign: one(campaigns, { fields: [quests.campaignId], references: [campaigns.id] }),
}));

// ─── Timeline ────────────────────────────────────────────────────────────────

export const timelineEntries = mysqlTable(
  "TimelineEntry",
  {
    id: varchar("id", { length: 36 }).primaryKey().$defaultFn(createId),
    title: varchar("title", { length: 255 }),
    description: text("description").notNull(),
    inGameDate: varchar("inGameDate", { length: 100 }).notNull(),
    campaignId: varchar("campaignId", { length: 36 }).notNull().references(() => campaigns.id, { onDelete: "cascade" }),
    createdAt: timestamp("createdAt").notNull().defaultNow(),
    updatedAt: timestamp("updatedAt").notNull().defaultNow().onUpdateNow(),
  },
  (table) => [
    index("TimelineEntry_campaignId_idx").on(table.campaignId),
  ],
);

export const timelineEntriesRelations = relations(timelineEntries, ({ one }) => ({
  campaign: one(campaigns, { fields: [timelineEntries.campaignId], references: [campaigns.id] }),
}));

// ─── Monsters (Stat Blocks) ──────────────────────────────────────────────────

export const monsters = mysqlTable(
  "Monster",
  {
    id: varchar("id", { length: 36 }).primaryKey().$defaultFn(createId),
    name: varchar("name", { length: 255 }).notNull(),
    size: varchar("size", { length: 20 }).notNull(),
    type: varchar("type", { length: 50 }).notNull(),
    alignment: varchar("alignment", { length: 50 }),
    armorClass: int("armorClass").notNull(),
    hitPoints: int("hitPoints").notNull(),
    hitDice: varchar("hitDice", { length: 50 }).notNull(),
    speed: varchar("speed", { length: 255 }).notNull(),
    strength: int("strength").notNull(),
    dexterity: int("dexterity").notNull(),
    constitution: int("constitution").notNull(),
    intelligence: int("intelligence").notNull(),
    wisdom: int("wisdom").notNull(),
    charisma: int("charisma").notNull(),
    challengeRating: double("challengeRating").notNull(),
    source: varchar("source", { length: 50 }).notNull().default("HOMEBREW"),
    abilities: text("abilities").notNull(),
    actions: text("actions").notNull(),
    reactions: text("reactions"),
    legendaryActions: text("legendaryActions"),
    dndbeyondLink: varchar("dndbeyondLink", { length: 512 }),
    createdById: varchar("createdById", { length: 36 }),
    createdAt: timestamp("createdAt").notNull().defaultNow(),
    updatedAt: timestamp("updatedAt").notNull().defaultNow().onUpdateNow(),
  },
  (table) => [
    index("Monster_type_idx").on(table.type),
    index("Monster_challengeRating_idx").on(table.challengeRating),
  ],
);

export const monstersRelations = relations(monsters, ({ many }) => ({
  combatants: many(combatants),
}));

// ─── Items ───────────────────────────────────────────────────────────────────

export const items = mysqlTable(
  "Item",
  {
    id: varchar("id", { length: 36 }).primaryKey().$defaultFn(createId),
    name: varchar("name", { length: 255 }).notNull(),
    description: text("description").notNull(),
    itemType: varchar("itemType", { length: 50 }).notNull(),
    rarity: varchar("rarity", { length: 20 }).notNull(),
    attunementRequired: boolean("attunementRequired").notNull().default(false),
    weight: double("weight"),
    value: int("value"),
    source: varchar("source", { length: 50 }).notNull().default("HOMEBREW"),
    createdById: varchar("createdById", { length: 36 }),
    createdAt: timestamp("createdAt").notNull().defaultNow(),
    updatedAt: timestamp("updatedAt").notNull().defaultNow().onUpdateNow(),
  },
  (table) => [
    index("Item_itemType_idx").on(table.itemType),
    index("Item_rarity_idx").on(table.rarity),
  ],
);

export const itemsRelations = relations(items, ({ many }) => ({
  assignments: many(itemAssignments),
}));

// ─── Item Assignments (Inventory Slots) ──────────────────────────────────────

export const itemAssignments = mysqlTable(
  "ItemAssignment",
  {
    id: varchar("id", { length: 36 }).primaryKey().$defaultFn(createId),
    quantity: int("quantity").notNull().default(1),
    equipped: boolean("equipped").notNull().default(false),
    attuned: boolean("attuned").notNull().default(false),
    identified: boolean("identified").notNull().default(true),
    itemId: varchar("itemId", { length: 36 }).notNull().references(() => items.id, { onDelete: "cascade" }),
    characterId: varchar("characterId", { length: 36 }).notNull().references(() => characters.id, { onDelete: "cascade" }),
    createdAt: timestamp("createdAt").notNull().defaultNow(),
    updatedAt: timestamp("updatedAt").notNull().defaultNow().onUpdateNow(),
  },
  (table) => [
    index("ItemAssignment_characterId_idx").on(table.characterId),
    index("ItemAssignment_itemId_idx").on(table.itemId),
  ],
);

export const itemAssignmentsRelations = relations(itemAssignments, ({ one }) => ({
  item: one(items, { fields: [itemAssignments.itemId], references: [items.id] }),
  character: one(characters, { fields: [itemAssignments.characterId], references: [characters.id] }),
}));
