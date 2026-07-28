/**
 * Drizzle ORM schema — defines all database tables, relations, and indexes.
 * Translated from the original Prisma schema. Uses SQLite column types with
 * MySQL-compatible naming conventions for future provider portability.
 */

import { sqliteTable, text, integer, real, index, uniqueIndex } from "drizzle-orm/sqlite-core";
import { relations } from "drizzle-orm";
import { createId } from "./cuid.ts";

// ─── Users ───────────────────────────────────────────────────────────────────

export const users = sqliteTable(
  "User",
  {
    id: text("id").primaryKey().$defaultFn(createId),
    email: text("email").notNull().unique(),
    name: text("name"),
    themeMode: text("themeMode").notNull().default("SYSTEM"),
    createdAt: integer("createdAt", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
    updatedAt: integer("updatedAt", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()).$onUpdateFn(() => new Date()),
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

export const oauthIdentities = sqliteTable(
  "OAuthIdentity",
  {
    id: text("id").primaryKey().$defaultFn(createId),
    provider: text("provider").notNull(),
    providerUserId: text("providerUserId").notNull(),
    userId: text("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
    createdAt: integer("createdAt", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
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

export const authSessions = sqliteTable(
  "AuthSession",
  {
    id: text("id").primaryKey().$defaultFn(createId),
    token: text("token").notNull().unique(),
    userId: text("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
    expiresAt: integer("expiresAt", { mode: "timestamp" }).notNull(),
    createdAt: integer("createdAt", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
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

export const characters = sqliteTable(
  "Character",
  {
    id: text("id").primaryKey().$defaultFn(createId),
    name: text("name").notNull(),
    level: integer("level").notNull().default(1),
    class: text("class").notNull(),
    race: text("race").notNull(),
    strength: integer("strength").notNull().default(10),
    dexterity: integer("dexterity").notNull().default(10),
    constitution: integer("constitution").notNull().default(10),
    intelligence: integer("intelligence").notNull().default(10),
    wisdom: integer("wisdom").notNull().default(10),
    charisma: integer("charisma").notNull().default(10),
    maxHp: integer("maxHp").notNull(),
    currentHp: integer("currentHp").notNull(),
    tempHp: integer("tempHp").notNull().default(0),
    armorClass: integer("armorClass").notNull(),
    userId: text("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
    campaignId: text("campaignId").references(() => campaigns.id, { onDelete: "set null" }),
    createdAt: integer("createdAt", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
    updatedAt: integer("updatedAt", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()).$onUpdateFn(() => new Date()),
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

export const campaigns = sqliteTable(
  "Campaign",
  {
    id: text("id").primaryKey().$defaultFn(createId),
    name: text("name").notNull(),
    description: text("description"),
    setting: text("setting"),
    status: text("status").notNull().default("PLANNING"),
    ownerId: text("ownerId").notNull().references(() => users.id, { onDelete: "cascade" }),
    createdAt: integer("createdAt", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
    updatedAt: integer("updatedAt", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()).$onUpdateFn(() => new Date()),
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

export const combatEncounters = sqliteTable(
  "CombatEncounter",
  {
    id: text("id").primaryKey().$defaultFn(createId),
    name: text("name"),
    isActive: integer("isActive", { mode: "boolean" }).notNull().default(true),
    currentRound: integer("currentRound").notNull().default(1),
    currentTurn: integer("currentTurn").notNull().default(0),
    sessionId: text("sessionId").references(() => sessions.id, { onDelete: "set null" }),
    createdAt: integer("createdAt", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
    updatedAt: integer("updatedAt", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()).$onUpdateFn(() => new Date()),
  },
  (table) => [
    index("CombatEncounter_sessionId_idx").on(table.sessionId),
  ],
);

export const combatEncountersRelations = relations(combatEncounters, ({ one, many }) => ({
  session: one(sessions, { fields: [combatEncounters.sessionId], references: [sessions.id] }),
  combatants: many(combatants),
}));

export const combatants = sqliteTable(
  "Combatant",
  {
    id: text("id").primaryKey().$defaultFn(createId),
    name: text("name").notNull(),
    initiative: integer("initiative").notNull(),
    maxHp: integer("maxHp").notNull(),
    currentHp: integer("currentHp").notNull(),
    tempHp: integer("tempHp").notNull().default(0),
    armorClass: integer("armorClass").notNull(),
    combatantType: text("combatantType").notNull(),
    characterId: text("characterId"),
    monsterId: text("monsterId").references(() => monsters.id),
    encounterId: text("encounterId").notNull().references(() => combatEncounters.id, { onDelete: "cascade" }),
    createdAt: integer("createdAt", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
    updatedAt: integer("updatedAt", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()).$onUpdateFn(() => new Date()),
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

export const sessions = sqliteTable(
  "Session",
  {
    id: text("id").primaryKey().$defaultFn(createId),
    sessionNumber: integer("sessionNumber").notNull(),
    title: text("title"),
    realWorldDate: integer("realWorldDate", { mode: "timestamp" }).notNull(),
    inGameDate: text("inGameDate"),
    duration: real("duration"),
    campaignId: text("campaignId").notNull().references(() => campaigns.id, { onDelete: "cascade" }),
    dmId: text("dmId").notNull().references(() => users.id, { onDelete: "cascade" }),
    createdAt: integer("createdAt", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
    updatedAt: integer("updatedAt", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()).$onUpdateFn(() => new Date()),
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

export const sessionNotes = sqliteTable(
  "SessionNote",
  {
    id: text("id").primaryKey().$defaultFn(createId),
    title: text("title"),
    content: text("content").notNull(),
    isSummary: integer("isSummary", { mode: "boolean" }).notNull().default(false),
    sessionId: text("sessionId").notNull().references(() => sessions.id, { onDelete: "cascade" }),
    createdAt: integer("createdAt", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
    updatedAt: integer("updatedAt", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()).$onUpdateFn(() => new Date()),
  },
  (table) => [
    index("SessionNote_sessionId_idx").on(table.sessionId),
  ],
);

export const sessionNotesRelations = relations(sessionNotes, ({ one }) => ({
  session: one(sessions, { fields: [sessionNotes.sessionId], references: [sessions.id] }),
}));

// ─── NPCs ────────────────────────────────────────────────────────────────────

export const npcs = sqliteTable(
  "NPC",
  {
    id: text("id").primaryKey().$defaultFn(createId),
    name: text("name").notNull(),
    description: text("description"),
    race: text("race"),
    class: text("class"),
    level: integer("level"),
    role: text("role"),
    locationId: text("locationId").references(() => locations.id, { onDelete: "set null" }),
    campaignId: text("campaignId").notNull().references(() => campaigns.id, { onDelete: "cascade" }),
    createdAt: integer("createdAt", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
    updatedAt: integer("updatedAt", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()).$onUpdateFn(() => new Date()),
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

export const locations = sqliteTable(
  "Location",
  {
    id: text("id").primaryKey().$defaultFn(createId),
    name: text("name").notNull(),
    description: text("description"),
    region: text("region"),
    parentId: text("parentId"),
    campaignId: text("campaignId").notNull().references(() => campaigns.id, { onDelete: "cascade" }),
    createdAt: integer("createdAt", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
    updatedAt: integer("updatedAt", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()).$onUpdateFn(() => new Date()),
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

export const quests = sqliteTable(
  "Quest",
  {
    id: text("id").primaryKey().$defaultFn(createId),
    name: text("name").notNull(),
    description: text("description"),
    status: text("status").notNull().default("NOT_STARTED"),
    rewards: text("rewards"),
    campaignId: text("campaignId").notNull().references(() => campaigns.id, { onDelete: "cascade" }),
    createdAt: integer("createdAt", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
    updatedAt: integer("updatedAt", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()).$onUpdateFn(() => new Date()),
  },
  (table) => [
    index("Quest_campaignId_idx").on(table.campaignId),
  ],
);

export const questsRelations = relations(quests, ({ one }) => ({
  campaign: one(campaigns, { fields: [quests.campaignId], references: [campaigns.id] }),
}));

// ─── Timeline ────────────────────────────────────────────────────────────────

export const timelineEntries = sqliteTable(
  "TimelineEntry",
  {
    id: text("id").primaryKey().$defaultFn(createId),
    title: text("title"),
    description: text("description").notNull(),
    inGameDate: text("inGameDate").notNull(),
    campaignId: text("campaignId").notNull().references(() => campaigns.id, { onDelete: "cascade" }),
    createdAt: integer("createdAt", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
    updatedAt: integer("updatedAt", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()).$onUpdateFn(() => new Date()),
  },
  (table) => [
    index("TimelineEntry_campaignId_idx").on(table.campaignId),
  ],
);

export const timelineEntriesRelations = relations(timelineEntries, ({ one }) => ({
  campaign: one(campaigns, { fields: [timelineEntries.campaignId], references: [campaigns.id] }),
}));

// ─── Monsters (Stat Blocks) ──────────────────────────────────────────────────

export const monsters = sqliteTable(
  "Monster",
  {
    id: text("id").primaryKey().$defaultFn(createId),
    name: text("name").notNull(),
    size: text("size").notNull(),
    type: text("type").notNull(),
    alignment: text("alignment"),
    armorClass: integer("armorClass").notNull(),
    hitPoints: integer("hitPoints").notNull(),
    hitDice: text("hitDice").notNull(),
    speed: text("speed").notNull(),
    strength: integer("strength").notNull(),
    dexterity: integer("dexterity").notNull(),
    constitution: integer("constitution").notNull(),
    intelligence: integer("intelligence").notNull(),
    wisdom: integer("wisdom").notNull(),
    charisma: integer("charisma").notNull(),
    challengeRating: real("challengeRating").notNull(),
    source: text("source").notNull().default("HOMEBREW"),
    abilities: text("abilities").notNull(),
    actions: text("actions").notNull(),
    reactions: text("reactions"),
    legendaryActions: text("legendaryActions"),
    dndbeyondLink: text("dndbeyondLink"),
    createdById: text("createdById"),
    createdAt: integer("createdAt", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
    updatedAt: integer("updatedAt", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()).$onUpdateFn(() => new Date()),
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

export const items = sqliteTable(
  "Item",
  {
    id: text("id").primaryKey().$defaultFn(createId),
    name: text("name").notNull(),
    description: text("description").notNull(),
    itemType: text("itemType").notNull(),
    rarity: text("rarity").notNull(),
    attunementRequired: integer("attunementRequired", { mode: "boolean" }).notNull().default(false),
    weight: real("weight"),
    value: integer("value"),
    source: text("source").notNull().default("HOMEBREW"),
    createdById: text("createdById"),
    createdAt: integer("createdAt", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
    updatedAt: integer("updatedAt", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()).$onUpdateFn(() => new Date()),
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

export const itemAssignments = sqliteTable(
  "ItemAssignment",
  {
    id: text("id").primaryKey().$defaultFn(createId),
    quantity: integer("quantity").notNull().default(1),
    equipped: integer("equipped", { mode: "boolean" }).notNull().default(false),
    attuned: integer("attuned", { mode: "boolean" }).notNull().default(false),
    identified: integer("identified", { mode: "boolean" }).notNull().default(true),
    itemId: text("itemId").notNull().references(() => items.id, { onDelete: "cascade" }),
    characterId: text("characterId").notNull().references(() => characters.id, { onDelete: "cascade" }),
    createdAt: integer("createdAt", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
    updatedAt: integer("updatedAt", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()).$onUpdateFn(() => new Date()),
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
