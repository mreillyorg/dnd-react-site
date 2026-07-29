CREATE TABLE `AuthSession` (
	`id` varchar(36) NOT NULL,
	`token` varchar(512) NOT NULL,
	`userId` varchar(36) NOT NULL,
	`expiresAt` timestamp NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `AuthSession_id` PRIMARY KEY(`id`),
	CONSTRAINT `AuthSession_token_unique` UNIQUE(`token`)
);
--> statement-breakpoint
CREATE TABLE `Campaign` (
	`id` varchar(36) NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`setting` varchar(255),
	`status` varchar(20) NOT NULL DEFAULT 'PLANNING',
	`ownerId` varchar(36) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `Campaign_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `Character` (
	`id` varchar(36) NOT NULL,
	`name` varchar(255) NOT NULL,
	`level` int NOT NULL DEFAULT 1,
	`class` varchar(100) NOT NULL,
	`race` varchar(100) NOT NULL,
	`strength` int NOT NULL DEFAULT 10,
	`dexterity` int NOT NULL DEFAULT 10,
	`constitution` int NOT NULL DEFAULT 10,
	`intelligence` int NOT NULL DEFAULT 10,
	`wisdom` int NOT NULL DEFAULT 10,
	`charisma` int NOT NULL DEFAULT 10,
	`maxHp` int NOT NULL,
	`currentHp` int NOT NULL,
	`tempHp` int NOT NULL DEFAULT 0,
	`armorClass` int NOT NULL,
	`userId` varchar(36) NOT NULL,
	`campaignId` varchar(36),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `Character_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `CombatEncounter` (
	`id` varchar(36) NOT NULL,
	`name` varchar(255),
	`isActive` boolean NOT NULL DEFAULT true,
	`currentRound` int NOT NULL DEFAULT 1,
	`currentTurn` int NOT NULL DEFAULT 0,
	`sessionId` varchar(36),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `CombatEncounter_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `Combatant` (
	`id` varchar(36) NOT NULL,
	`name` varchar(255) NOT NULL,
	`initiative` int NOT NULL,
	`maxHp` int NOT NULL,
	`currentHp` int NOT NULL,
	`tempHp` int NOT NULL DEFAULT 0,
	`armorClass` int NOT NULL,
	`combatantType` varchar(20) NOT NULL,
	`characterId` varchar(36),
	`monsterId` varchar(36),
	`encounterId` varchar(36) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `Combatant_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `ItemAssignment` (
	`id` varchar(36) NOT NULL,
	`quantity` int NOT NULL DEFAULT 1,
	`equipped` boolean NOT NULL DEFAULT false,
	`attuned` boolean NOT NULL DEFAULT false,
	`identified` boolean NOT NULL DEFAULT true,
	`itemId` varchar(36) NOT NULL,
	`characterId` varchar(36) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `ItemAssignment_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `Item` (
	`id` varchar(36) NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text NOT NULL,
	`itemType` varchar(50) NOT NULL,
	`rarity` varchar(20) NOT NULL,
	`attunementRequired` boolean NOT NULL DEFAULT false,
	`weight` double,
	`value` int,
	`source` varchar(50) NOT NULL DEFAULT 'HOMEBREW',
	`createdById` varchar(36),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `Item_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `Location` (
	`id` varchar(36) NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`region` varchar(255),
	`parentId` varchar(36),
	`campaignId` varchar(36) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `Location_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `Monster` (
	`id` varchar(36) NOT NULL,
	`name` varchar(255) NOT NULL,
	`size` varchar(20) NOT NULL,
	`type` varchar(50) NOT NULL,
	`alignment` varchar(50),
	`armorClass` int NOT NULL,
	`hitPoints` int NOT NULL,
	`hitDice` varchar(50) NOT NULL,
	`speed` varchar(255) NOT NULL,
	`strength` int NOT NULL,
	`dexterity` int NOT NULL,
	`constitution` int NOT NULL,
	`intelligence` int NOT NULL,
	`wisdom` int NOT NULL,
	`charisma` int NOT NULL,
	`challengeRating` double NOT NULL,
	`source` varchar(50) NOT NULL DEFAULT 'HOMEBREW',
	`abilities` text NOT NULL,
	`actions` text NOT NULL,
	`reactions` text,
	`legendaryActions` text,
	`dndbeyondLink` varchar(512),
	`createdById` varchar(36),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `Monster_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `NPC` (
	`id` varchar(36) NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`race` varchar(100),
	`class` varchar(100),
	`level` int,
	`role` varchar(100),
	`locationId` varchar(36),
	`campaignId` varchar(36) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `NPC_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `OAuthIdentity` (
	`id` varchar(36) NOT NULL,
	`provider` varchar(50) NOT NULL,
	`providerUserId` varchar(255) NOT NULL,
	`userId` varchar(36) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `OAuthIdentity_id` PRIMARY KEY(`id`),
	CONSTRAINT `OAuthIdentity_provider_providerUserId_key` UNIQUE(`provider`,`providerUserId`)
);
--> statement-breakpoint
CREATE TABLE `Quest` (
	`id` varchar(36) NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`status` varchar(20) NOT NULL DEFAULT 'NOT_STARTED',
	`rewards` text,
	`campaignId` varchar(36) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `Quest_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `SessionNote` (
	`id` varchar(36) NOT NULL,
	`title` varchar(255),
	`content` text NOT NULL,
	`isSummary` boolean NOT NULL DEFAULT false,
	`sessionId` varchar(36) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `SessionNote_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `Session` (
	`id` varchar(36) NOT NULL,
	`sessionNumber` int NOT NULL,
	`title` varchar(255),
	`realWorldDate` timestamp NOT NULL,
	`inGameDate` varchar(100),
	`duration` double,
	`campaignId` varchar(36) NOT NULL,
	`dmId` varchar(36) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `Session_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `TimelineEntry` (
	`id` varchar(36) NOT NULL,
	`title` varchar(255),
	`description` text NOT NULL,
	`inGameDate` varchar(100) NOT NULL,
	`campaignId` varchar(36) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `TimelineEntry_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `User` (
	`id` varchar(36) NOT NULL,
	`email` varchar(255) NOT NULL,
	`name` varchar(255),
	`themeMode` varchar(20) NOT NULL DEFAULT 'SYSTEM',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `User_id` PRIMARY KEY(`id`),
	CONSTRAINT `User_email_unique` UNIQUE(`email`)
);
--> statement-breakpoint
ALTER TABLE `AuthSession` ADD CONSTRAINT `AuthSession_userId_User_id_fk` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `Campaign` ADD CONSTRAINT `Campaign_ownerId_User_id_fk` FOREIGN KEY (`ownerId`) REFERENCES `User`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `Character` ADD CONSTRAINT `Character_userId_User_id_fk` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `Character` ADD CONSTRAINT `Character_campaignId_Campaign_id_fk` FOREIGN KEY (`campaignId`) REFERENCES `Campaign`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `CombatEncounter` ADD CONSTRAINT `CombatEncounter_sessionId_Session_id_fk` FOREIGN KEY (`sessionId`) REFERENCES `Session`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `Combatant` ADD CONSTRAINT `Combatant_monsterId_Monster_id_fk` FOREIGN KEY (`monsterId`) REFERENCES `Monster`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `Combatant` ADD CONSTRAINT `Combatant_encounterId_CombatEncounter_id_fk` FOREIGN KEY (`encounterId`) REFERENCES `CombatEncounter`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `ItemAssignment` ADD CONSTRAINT `ItemAssignment_itemId_Item_id_fk` FOREIGN KEY (`itemId`) REFERENCES `Item`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `ItemAssignment` ADD CONSTRAINT `ItemAssignment_characterId_Character_id_fk` FOREIGN KEY (`characterId`) REFERENCES `Character`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `Location` ADD CONSTRAINT `Location_campaignId_Campaign_id_fk` FOREIGN KEY (`campaignId`) REFERENCES `Campaign`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `NPC` ADD CONSTRAINT `NPC_locationId_Location_id_fk` FOREIGN KEY (`locationId`) REFERENCES `Location`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `NPC` ADD CONSTRAINT `NPC_campaignId_Campaign_id_fk` FOREIGN KEY (`campaignId`) REFERENCES `Campaign`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `OAuthIdentity` ADD CONSTRAINT `OAuthIdentity_userId_User_id_fk` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `Quest` ADD CONSTRAINT `Quest_campaignId_Campaign_id_fk` FOREIGN KEY (`campaignId`) REFERENCES `Campaign`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `SessionNote` ADD CONSTRAINT `SessionNote_sessionId_Session_id_fk` FOREIGN KEY (`sessionId`) REFERENCES `Session`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `Session` ADD CONSTRAINT `Session_campaignId_Campaign_id_fk` FOREIGN KEY (`campaignId`) REFERENCES `Campaign`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `Session` ADD CONSTRAINT `Session_dmId_User_id_fk` FOREIGN KEY (`dmId`) REFERENCES `User`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `TimelineEntry` ADD CONSTRAINT `TimelineEntry_campaignId_Campaign_id_fk` FOREIGN KEY (`campaignId`) REFERENCES `Campaign`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `AuthSession_token_idx` ON `AuthSession` (`token`);--> statement-breakpoint
CREATE INDEX `AuthSession_userId_idx` ON `AuthSession` (`userId`);--> statement-breakpoint
CREATE INDEX `Campaign_ownerId_idx` ON `Campaign` (`ownerId`);--> statement-breakpoint
CREATE INDEX `Character_userId_idx` ON `Character` (`userId`);--> statement-breakpoint
CREATE INDEX `Character_campaignId_idx` ON `Character` (`campaignId`);--> statement-breakpoint
CREATE INDEX `CombatEncounter_sessionId_idx` ON `CombatEncounter` (`sessionId`);--> statement-breakpoint
CREATE INDEX `Combatant_encounterId_idx` ON `Combatant` (`encounterId`);--> statement-breakpoint
CREATE INDEX `ItemAssignment_characterId_idx` ON `ItemAssignment` (`characterId`);--> statement-breakpoint
CREATE INDEX `ItemAssignment_itemId_idx` ON `ItemAssignment` (`itemId`);--> statement-breakpoint
CREATE INDEX `Item_itemType_idx` ON `Item` (`itemType`);--> statement-breakpoint
CREATE INDEX `Item_rarity_idx` ON `Item` (`rarity`);--> statement-breakpoint
CREATE INDEX `Location_campaignId_idx` ON `Location` (`campaignId`);--> statement-breakpoint
CREATE INDEX `Location_parentId_idx` ON `Location` (`parentId`);--> statement-breakpoint
CREATE INDEX `Monster_type_idx` ON `Monster` (`type`);--> statement-breakpoint
CREATE INDEX `Monster_challengeRating_idx` ON `Monster` (`challengeRating`);--> statement-breakpoint
CREATE INDEX `NPC_campaignId_idx` ON `NPC` (`campaignId`);--> statement-breakpoint
CREATE INDEX `NPC_locationId_idx` ON `NPC` (`locationId`);--> statement-breakpoint
CREATE INDEX `OAuthIdentity_userId_idx` ON `OAuthIdentity` (`userId`);--> statement-breakpoint
CREATE INDEX `Quest_campaignId_idx` ON `Quest` (`campaignId`);--> statement-breakpoint
CREATE INDEX `SessionNote_sessionId_idx` ON `SessionNote` (`sessionId`);--> statement-breakpoint
CREATE INDEX `Session_campaignId_idx` ON `Session` (`campaignId`);--> statement-breakpoint
CREATE INDEX `Session_dmId_idx` ON `Session` (`dmId`);--> statement-breakpoint
CREATE INDEX `TimelineEntry_campaignId_idx` ON `TimelineEntry` (`campaignId`);--> statement-breakpoint
CREATE INDEX `User_email_idx` ON `User` (`email`);