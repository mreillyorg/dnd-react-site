# Requirements Document

## Introduction

This document specifies the requirements for Adventurer's League DM Log Exports in a web-based Dungeons & Dragons companion site. The system enables Dungeon Masters to generate formatted DM log documents required for official D&D Adventurer's League play, tracking session details, player advancement, rewards, and magic item distribution. AL DM logs are mandatory documentation for organized play, providing proof of sessions run and rewards awarded. This feature integrates with Campaign Tracking and Session Management systems to automate log generation and reduce manual paperwork.

## Glossary

- **AL_Log_System**: The component responsible for generating Adventurer's League DM logs
- **Adventurer's_League**: The official organized play program for D&D 5e (also referred to as AL)
- **DM_Log**: A formatted document recording details of an AL session for submission to AL administrators
- **AL_Session**: A session played under Adventurer's League rules
- **AL_Code**: A unique identifier for an AL adventure (e.g., "DDAL09-01")
- **Adventure_Title**: The official name of the AL adventure
- **Session_Duration**: The length of the session in hours (AL sessions are typically 2 or 4 hours)
- **Player_Advancement**: Experience points, levels gained, and downtime awarded to players
- **Advancement_Checkpoint**: The AL advancement unit (1 checkpoint = advancement equivalent in AL Season 9+)
- **Treasure_Checkpoint**: The AL treasure unit for gold rewards (1 TCP = variable gold in AL Season 9+)
- **Magic_Item_Award**: A magic item given to a player during an AL session
- **DCI_Number**: A player's unique Wizards of the Coast organized play identifier
- **Character_Name**: The name of the player's AL character
- **Player_Roster**: The list of all players and characters participating in an AL_Session
- **Downtime_Days**: Days of downtime awarded for character activities between sessions
- **Story_Award**: A special reward or plot element granted during an AL adventure
- **DM_Reward**: Advancement and treasure earned by the DM for running the session
- **AL_Season**: The organized play season determining the advancement and reward structure
- **Log_Template**: A predefined format for DM_Log generation matching AL requirements
- **AL_PDF_Export**: A PDF file containing the formatted DM_Log for printing or digital submission
- **Session_Date**: The real-world date when the AL_Session occurred
- **Session_Location**: Where the AL_Session was played (game store, convention, online platform)
- **AL_Legal_Character**: A character built according to Adventurer's League character creation rules
- **Magic_Item_Distribution**: The process of assigning magic items found during the session to specific players
- **Gold_Awarded**: The amount of gold pieces awarded to each player
- **Consumable_Award**: A consumable magic item awarded (potions, scrolls, etc.)
- **Permanent_Magic_Item**: A non-consumable magic item that becomes part of a character's permanent inventory


## Requirements

### Requirement 1: AL Session Configuration

**User Story:** As an AL Dungeon Master, I want to designate a campaign session as an AL session, so that the system knows to track AL-specific data.

#### Acceptance Criteria

1. THE AL_Log_System SHALL allow the Campaign_Owner to mark a Campaign as an Adventurer's_League campaign
2. WHEN a Campaign is marked as AL, THE Campaign_System SHALL require all linked sessions to collect AL-specific data
3. THE AL_Log_System SHALL allow the Campaign_Owner to specify AL_Season for the campaign (Season 8, Season 9, Season 10, etc.)
4. WHEN creating a Session in an AL Campaign, THE AL_Log_System SHALL prompt for AL_Code and Adventure_Title
5. THE AL_Log_System SHALL validate AL_Code format (e.g., "DDAL##-##" or "CCC-###-##")
6. THE AL_Log_System SHALL allow the Campaign_Owner to specify Session_Duration (2 hours or 4 hours for standard AL sessions)
7. THE AL_Log_System SHALL allow the Campaign_Owner to specify Session_Location
8. THE AL_Log_System SHALL display an "AL Session" badge on sessions in AL campaigns
9. THE AL_Log_System SHALL provide a template for common AL session configurations (standard hardcover chapter, 2-hour module, 4-hour module)
10. THE AL_Log_System SHALL warn if Session_Duration does not match standard AL durations (2 or 4 hours)


### Requirement 2: Player Roster Management

**User Story:** As an AL Dungeon Master, I want to record player and character information, so that the log includes all required participant details.

#### Acceptance Criteria

1. THE AL_Log_System SHALL require a Player_Roster for each AL_Session
2. FOR each player in the Player_Roster, THE AL_Log_System SHALL collect: player name, DCI_Number, Character_Name, character level (starting), and character class
3. THE AL_Log_System SHALL validate DCI_Number format (10-digit number)
4. THE AL_Log_System SHALL allow the DM to link existing Character records to the Player_Roster OR manually enter character details
5. THE AL_Log_System SHALL display a warning if DCI_Number is missing (required for official AL play)
6. THE AL_Log_System SHALL track the starting character level and ending character level for each participant
7. THE AL_Log_System SHALL allow the DM to mark a character as AL_Legal_Character or non-AL for tracking purposes
8. THE AL_Log_System SHALL support 3-7 players per AL_Session (standard AL table size)
9. THE AL_Log_System SHALL warn if Player_Roster size is outside the 3-7 player range
10. THE AL_Log_System SHALL allow the DM to save player information for quick re-entry in future sessions


### Requirement 3: Player Advancement Tracking

**User Story:** As an AL Dungeon Master, I want to record player advancement, so that the log shows XP, levels, and downtime awarded.

#### Acceptance Criteria

1. THE AL_Log_System SHALL allow the DM to record Player_Advancement for each character in the Player_Roster
2. FOR AL Season 9 and later, THE AL_Log_System SHALL track Advancement_Checkpoint (standard is 1 per 2-hour session, 2 per 4-hour session)
3. FOR AL Season 8 and earlier, THE AL_Log_System SHALL track experience points (XP) awarded
4. THE AL_Log_System SHALL automatically calculate Advancement_Checkpoint based on Session_Duration and AL_Season
5. THE AL_Log_System SHALL allow the DM to override default Advancement_Checkpoint values for special circumstances
6. THE AL_Log_System SHALL track Downtime_Days awarded (standard is 5 days per 2-hour session, 10 days per 4-hour session)
7. THE AL_Log_System SHALL automatically calculate Downtime_Days based on Session_Duration
8. THE AL_Log_System SHALL allow the DM to record level increases for characters that leveled up during the session
9. THE AL_Log_System SHALL calculate the ending character level based on starting level and Advancement_Checkpoint
10. THE AL_Log_System SHALL provide a summary showing total advancement for all players


### Requirement 4: Treasure and Gold Tracking

**User Story:** As an AL Dungeon Master, I want to record treasure awarded, so that the log documents gold and item rewards.

#### Acceptance Criteria

1. THE AL_Log_System SHALL allow the DM to record treasure for each AL_Session
2. FOR AL Season 9 and later, THE AL_Log_System SHALL track Treasure_Checkpoint (standard is 1 per 2-hour session, 2 per 4-hour session)
3. FOR AL Season 8 and earlier, THE AL_Log_System SHALL track actual Gold_Awarded per player
4. THE AL_Log_System SHALL automatically calculate Treasure_Checkpoint based on Session_Duration and AL_Season
5. THE AL_Log_System SHALL allow the DM to override default Treasure_Checkpoint values
6. THE AL_Log_System SHALL provide TCP-to-gold conversion reference for players (varies by character level)
7. THE AL_Log_System SHALL allow the DM to distribute gold equally among players or specify custom amounts per player
8. THE AL_Log_System SHALL track art objects, gems, and trade goods found during the session
9. THE AL_Log_System SHALL calculate the total party treasure value
10. THE AL_Log_System SHALL provide a summary showing total treasure for all players


### Requirement 5: Magic Item Distribution

**User Story:** As an AL Dungeon Master, I want to track magic items found and distributed, so that the log documents item awards accurately.

#### Acceptance Criteria

1. THE AL_Log_System SHALL allow the DM to record all magic items found during the AL_Session
2. FOR each magic item, THE AL_Log_System SHALL capture: item name, Item_Rarity, and whether it is Consumable_Award or Permanent_Magic_Item
3. THE AL_Log_System SHALL provide a Magic_Item_Distribution interface for assigning items to specific players
4. THE AL_Log_System SHALL support AL magic item distribution rules: permanent items go to one player, consumables can be distributed to multiple players
5. THE AL_Log_System SHALL integrate with the Item_System to look up item names from the SRD_Item database
6. THE AL_Log_System SHALL allow the DM to add custom magic items not in the SRD (for AL-legal third-party adventures)
7. THE AL_Log_System SHALL display a summary showing which player received which items
8. THE AL_Log_System SHALL track whether a magic item was kept by a player or sold for gold
9. THE AL_Log_System SHALL allow the DM to note the AL_Code on the magic item for permanent items (required for AL item documentation)
10. THE AL_Log_System SHALL warn if a player receives multiple permanent magic items in one session (unusual for AL)


### Requirement 6: Story Awards

**User Story:** As an AL Dungeon Master, I want to record story awards, so that the log documents special rewards or plot elements.

#### Acceptance Criteria

1. THE AL_Log_System SHALL allow the DM to record Story_Award entries for the AL_Session
2. FOR each Story_Award, THE AL_Log_System SHALL capture: award name and description
3. THE AL_Log_System SHALL allow the DM to assign Story_Award entries to specific players or to the entire party
4. THE AL_Log_System SHALL provide examples of common story awards (faction renown, special blessings, plot hooks)
5. THE AL_Log_System SHALL integrate story awards with the adventure's AL_Code for documentation
6. THE AL_Log_System SHALL display story awards in the final DM_Log output


### Requirement 7: DM Rewards

**User Story:** As an AL Dungeon Master, I want to track my own DM rewards, so that the log documents advancement earned for running the session.

#### Acceptance Criteria

1. THE AL_Log_System SHALL calculate DM_Reward based on the AL_Session details
2. THE DM_Reward SHALL include Advancement_Checkpoint equal to the player advancement (1 for 2-hour session, 2 for 4-hour session)
3. THE DM_Reward SHALL include Treasure_Checkpoint equal to the player treasure (1 for 2-hour session, 2 for 4-hour session)
4. THE DM_Reward SHALL include Downtime_Days equal to the player downtime
5. THE AL_Log_System SHALL allow the DM to assign DM_Reward to a specific character or bank it for future use
6. THE AL_Log_System SHALL track cumulative DM_Reward for each DM across all sessions run
7. THE AL_Log_System SHALL display DM_Reward prominently in the DM_Log output
8. THE AL_Log_System SHALL note that DMs can apply one magic item found during the session to their own character or a designated character


### Requirement 8: DM Log PDF Export

**User Story:** As an AL Dungeon Master, I want to export the session log as a PDF, so that I can print it or submit it to AL administrators.

#### Acceptance Criteria

1. THE AL_Log_System SHALL provide an "Export DM Log" button on each AL_Session
2. WHEN the DM exports the log, THE AL_Log_System SHALL generate an AL_PDF_Export file formatted according to AL log template requirements
3. THE AL_PDF_Export SHALL include: Session_Date, Session_Location, AL_Code, Adventure_Title, Session_Duration, DM name and DCI_Number
4. THE AL_PDF_Export SHALL include a Player_Roster table showing player names, DCI_Number, character names, starting/ending levels
5. THE AL_PDF_Export SHALL include advancement summary showing Advancement_Checkpoint, Downtime_Days, and Treasure_Checkpoint per player
6. THE AL_PDF_Export SHALL include treasure distribution showing Gold_Awarded per player
7. THE AL_PDF_Export SHALL include magic item distribution showing item name, rarity, and recipient
8. THE AL_PDF_Export SHALL include Story_Award entries with descriptions and recipients
9. THE AL_PDF_Export SHALL include DM_Reward summary
10. THE AL_PDF_Export SHALL include session notes or summary if the DM added them
11. THE AL_PDF_Export SHALL be formatted for standard letter-size paper (8.5" x 11")
12. THE AL_Log_System SHALL provide a print preview before generating the final PDF
13. THE AL_PDF_Export SHALL include page numbers and footer with adventure code and session date
14. THE AL_Log_System SHALL store generated AL_PDF_Export files for 90 days for re-download


### Requirement 9: AL Log Templates

**User Story:** As an AL Dungeon Master, I want pre-configured log templates, so that I can quickly set up logs for common AL adventures.

#### Acceptance Criteria

1. THE AL_Log_System SHALL provide Log_Template presets for common AL adventure types: 2-hour module, 4-hour module, and hardcover chapter
2. WHEN creating an AL_Session, THE AL_Log_System SHALL allow the DM to select a Log_Template
3. WHEN a Log_Template is selected, THE AL_Log_System SHALL pre-populate Session_Duration, expected Advancement_Checkpoint, Treasure_Checkpoint, and Downtime_Days
4. THE AL_Log_System SHALL allow the DM to save custom Log_Template configurations for recurring series (e.g., "Waterdeep Dragon Heist Chapter")
5. THE Log_Template SHALL include field hints and tooltips explaining AL-specific requirements
6. THE AL_Log_System SHALL provide a template library with popular AL adventures pre-configured (e.g., "DDAL09-01 Escape from Elturgard")
7. THE AL_Log_System SHALL allow the DM to override any template-populated values





### Requirement 11: AL Log History and Management

**User Story:** As an AL Dungeon Master, I want to view all my past AL logs, so that I can track my DM history and re-export logs if needed.

#### Acceptance Criteria

1. THE AL_Log_System SHALL provide an "AL Log History" page showing all AL_Session records for the DM
2. THE AL Log History page SHALL display Session_Date, AL_Code, Adventure_Title, number of players, and export status
3. THE AL_Log_System SHALL allow the DM to filter log history by AL_Season and date range
4. THE AL_Log_System SHALL allow the DM to search log history by adventure title or AL_Code
5. THE AL_Log_System SHALL display summary statistics including total sessions run, total players served, and total advancement awarded
6. THE AL_Log_System SHALL allow the DM to duplicate a previous AL_Session for a repeat run of the same adventure
7. WHEN duplicating an AL_Session, THE AL_Log_System SHALL copy AL_Code, Adventure_Title, and Session_Duration but clear player-specific data
8. THE AL_Log_System SHALL allow the DM to edit past AL_Session records (for corrections or missed information)
9. THE AL_Log_System SHALL track when each AL_PDF_Export was generated with a timestamp
10. THE AL_Log_System SHALL allow re-export of any past AL_Session as a PDF


### Requirement 12: Integration with Campaign System

**User Story:** As an AL Dungeon Master, I want AL sessions to integrate with my campaign tracking, so that log data flows seamlessly between systems.

#### Acceptance Criteria

1. THE AL_Log_System SHALL link AL_Session records to Session records in the Campaign_System
2. WHEN a Session is created in an AL Campaign, THE AL_Log_System SHALL automatically collect AL-specific data
3. THE Campaign_System SHALL display an "AL Log" tab on AL session detail pages
4. THE AL_Log_System SHALL pre-populate player information from the Campaign_Member roster
5. THE AL_Log_System SHALL link magic items awarded to the Item_System for tracking in character inventories
6. WHEN a player receives a permanent magic item in an AL_Session, THE AL_Log_System SHALL offer to add it to the player's character inventory automatically
7. THE AL_Log_System SHALL integrate Downtime_Days into character tracking (if downtime system is implemented)
8. THE Campaign dashboard SHALL display AL-specific statistics for AL Campaigns (total sessions run, total advancement awarded)
