CREATE TABLE `AuthSession` (
	`id` text PRIMARY KEY NOT NULL,
	`token` text NOT NULL,
	`userId` text NOT NULL,
	`expiresAt` integer NOT NULL,
	`createdAt` integer NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `AuthSession_token_unique` ON `AuthSession` (`token`);--> statement-breakpoint
CREATE INDEX `AuthSession_token_idx` ON `AuthSession` (`token`);--> statement-breakpoint
CREATE INDEX `AuthSession_userId_idx` ON `AuthSession` (`userId`);--> statement-breakpoint
CREATE TABLE `Campaign` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`setting` text,
	`status` text DEFAULT 'PLANNING' NOT NULL,
	`ownerId` text NOT NULL,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL,
	FOREIGN KEY (`ownerId`) REFERENCES `User`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `Campaign_ownerId_idx` ON `Campaign` (`ownerId`);--> statement-breakpoint
CREATE TABLE `Character` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`level` integer DEFAULT 1 NOT NULL,
	`class` text NOT NULL,
	`race` text NOT NULL,
	`strength` integer DEFAULT 10 NOT NULL,
	`dexterity` integer DEFAULT 10 NOT NULL,
	`constitution` integer DEFAULT 10 NOT NULL,
	`intelligence` integer DEFAULT 10 NOT NULL,
	`wisdom` integer DEFAULT 10 NOT NULL,
	`charisma` integer DEFAULT 10 NOT NULL,
	`maxHp` integer NOT NULL,
	`currentHp` integer NOT NULL,
	`tempHp` integer DEFAULT 0 NOT NULL,
	`armorClass` integer NOT NULL,
	`userId` text NOT NULL,
	`campaignId` text,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`campaignId`) REFERENCES `Campaign`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `Character_userId_idx` ON `Character` (`userId`);--> statement-breakpoint
CREATE INDEX `Character_campaignId_idx` ON `Character` (`campaignId`);--> statement-breakpoint
CREATE TABLE `CombatEncounter` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text,
	`isActive` integer DEFAULT true NOT NULL,
	`currentRound` integer DEFAULT 1 NOT NULL,
	`currentTurn` integer DEFAULT 0 NOT NULL,
	`sessionId` text,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL,
	FOREIGN KEY (`sessionId`) REFERENCES `Session`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `CombatEncounter_sessionId_idx` ON `CombatEncounter` (`sessionId`);--> statement-breakpoint
CREATE TABLE `Combatant` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`initiative` integer NOT NULL,
	`maxHp` integer NOT NULL,
	`currentHp` integer NOT NULL,
	`tempHp` integer DEFAULT 0 NOT NULL,
	`armorClass` integer NOT NULL,
	`combatantType` text NOT NULL,
	`characterId` text,
	`monsterId` text,
	`encounterId` text NOT NULL,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL,
	FOREIGN KEY (`monsterId`) REFERENCES `Monster`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`encounterId`) REFERENCES `CombatEncounter`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `Combatant_encounterId_idx` ON `Combatant` (`encounterId`);--> statement-breakpoint
CREATE TABLE `ItemAssignment` (
	`id` text PRIMARY KEY NOT NULL,
	`quantity` integer DEFAULT 1 NOT NULL,
	`equipped` integer DEFAULT false NOT NULL,
	`attuned` integer DEFAULT false NOT NULL,
	`identified` integer DEFAULT true NOT NULL,
	`itemId` text NOT NULL,
	`characterId` text NOT NULL,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL,
	FOREIGN KEY (`itemId`) REFERENCES `Item`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`characterId`) REFERENCES `Character`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `ItemAssignment_characterId_idx` ON `ItemAssignment` (`characterId`);--> statement-breakpoint
CREATE INDEX `ItemAssignment_itemId_idx` ON `ItemAssignment` (`itemId`);--> statement-breakpoint
CREATE TABLE `Item` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text NOT NULL,
	`itemType` text NOT NULL,
	`rarity` text NOT NULL,
	`attunementRequired` integer DEFAULT false NOT NULL,
	`weight` real,
	`value` integer,
	`source` text DEFAULT 'HOMEBREW' NOT NULL,
	`createdById` text,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `Item_itemType_idx` ON `Item` (`itemType`);--> statement-breakpoint
CREATE INDEX `Item_rarity_idx` ON `Item` (`rarity`);--> statement-breakpoint
CREATE TABLE `Location` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`region` text,
	`parentId` text,
	`campaignId` text NOT NULL,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL,
	FOREIGN KEY (`campaignId`) REFERENCES `Campaign`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `Location_campaignId_idx` ON `Location` (`campaignId`);--> statement-breakpoint
CREATE INDEX `Location_parentId_idx` ON `Location` (`parentId`);--> statement-breakpoint
CREATE TABLE `Monster` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`size` text NOT NULL,
	`type` text NOT NULL,
	`alignment` text,
	`armorClass` integer NOT NULL,
	`hitPoints` integer NOT NULL,
	`hitDice` text NOT NULL,
	`speed` text NOT NULL,
	`strength` integer NOT NULL,
	`dexterity` integer NOT NULL,
	`constitution` integer NOT NULL,
	`intelligence` integer NOT NULL,
	`wisdom` integer NOT NULL,
	`charisma` integer NOT NULL,
	`challengeRating` real NOT NULL,
	`source` text DEFAULT 'HOMEBREW' NOT NULL,
	`abilities` text NOT NULL,
	`actions` text NOT NULL,
	`reactions` text,
	`legendaryActions` text,
	`dndbeyondLink` text,
	`createdById` text,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `Monster_type_idx` ON `Monster` (`type`);--> statement-breakpoint
CREATE INDEX `Monster_challengeRating_idx` ON `Monster` (`challengeRating`);--> statement-breakpoint
CREATE TABLE `NPC` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`race` text,
	`class` text,
	`level` integer,
	`role` text,
	`locationId` text,
	`campaignId` text NOT NULL,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL,
	FOREIGN KEY (`locationId`) REFERENCES `Location`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`campaignId`) REFERENCES `Campaign`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `NPC_campaignId_idx` ON `NPC` (`campaignId`);--> statement-breakpoint
CREATE INDEX `NPC_locationId_idx` ON `NPC` (`locationId`);--> statement-breakpoint
CREATE TABLE `OAuthIdentity` (
	`id` text PRIMARY KEY NOT NULL,
	`provider` text NOT NULL,
	`providerUserId` text NOT NULL,
	`userId` text NOT NULL,
	`createdAt` integer NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `OAuthIdentity_provider_providerUserId_key` ON `OAuthIdentity` (`provider`,`providerUserId`);--> statement-breakpoint
CREATE INDEX `OAuthIdentity_userId_idx` ON `OAuthIdentity` (`userId`);--> statement-breakpoint
CREATE TABLE `Quest` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`status` text DEFAULT 'NOT_STARTED' NOT NULL,
	`rewards` text,
	`campaignId` text NOT NULL,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL,
	FOREIGN KEY (`campaignId`) REFERENCES `Campaign`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `Quest_campaignId_idx` ON `Quest` (`campaignId`);--> statement-breakpoint
CREATE TABLE `SessionNote` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text,
	`content` text NOT NULL,
	`isSummary` integer DEFAULT false NOT NULL,
	`sessionId` text NOT NULL,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL,
	FOREIGN KEY (`sessionId`) REFERENCES `Session`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `SessionNote_sessionId_idx` ON `SessionNote` (`sessionId`);--> statement-breakpoint
CREATE TABLE `Session` (
	`id` text PRIMARY KEY NOT NULL,
	`sessionNumber` integer NOT NULL,
	`title` text,
	`realWorldDate` integer NOT NULL,
	`inGameDate` text,
	`duration` real,
	`campaignId` text NOT NULL,
	`dmId` text NOT NULL,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL,
	FOREIGN KEY (`campaignId`) REFERENCES `Campaign`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`dmId`) REFERENCES `User`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `Session_campaignId_idx` ON `Session` (`campaignId`);--> statement-breakpoint
CREATE INDEX `Session_dmId_idx` ON `Session` (`dmId`);--> statement-breakpoint
CREATE TABLE `TimelineEntry` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text,
	`description` text NOT NULL,
	`inGameDate` text NOT NULL,
	`campaignId` text NOT NULL,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL,
	FOREIGN KEY (`campaignId`) REFERENCES `Campaign`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `TimelineEntry_campaignId_idx` ON `TimelineEntry` (`campaignId`);--> statement-breakpoint
CREATE TABLE `User` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`name` text,
	`themeMode` text DEFAULT 'SYSTEM' NOT NULL,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `User_email_unique` ON `User` (`email`);--> statement-breakpoint
CREATE INDEX `User_email_idx` ON `User` (`email`);