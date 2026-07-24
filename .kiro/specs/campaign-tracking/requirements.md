# Requirements Document

## Introduction

This document specifies the requirements for Campaign Tracking and Notes in a web-based Dungeons & Dragons companion site. The system enables Dungeon Masters to create and manage campaigns, organize sessions, track NPCs and locations, manage storylines and quests, and maintain a campaign timeline. Campaign tracking serves as the organizational hub that ties together characters, encounters, items, and sessions into cohesive narrative arcs. This feature is foundational for long-term campaign management and provides DMs with tools to plan, execute, and document their storytelling.

## Glossary

- **Campaign_System**: The component responsible for managing campaigns, sessions, NPCs, locations, quests, and campaign timelines
- **Campaign**: A long-running collection of gaming sessions with a shared narrative, party of characters, and world setting
- **Campaign_Owner**: The user (typically the Dungeon Master) who created and has full administrative control over a Campaign
- **Campaign_Member**: A user who has been invited to participate in a Campaign as a player
- **Session**: A single gaming session within a Campaign, typically lasting 2-4 hours of real-world time
- **Session_Note**: A text-based record of events, decisions, and outcomes from a Session
- **Session_Summary**: A condensed overview of a Session highlighting key events and story beats
- **NPC**: A Non-Player Character tracked within a Campaign, including their details, relationships, and story relevance
- **Location**: A place within the campaign world tracked with description, map references, and associated NPCs or events
- **Quest**: A storyline objective or mission tracked within a Campaign with status, rewards, and narrative details
- **Quest_Status**: The current state of a Quest: not_started, active, completed, or failed
- **Campaign_Timeline**: A chronological record of significant events within the Campaign world
- **Timeline_Entry**: A single event in the Campaign_Timeline with date, description, and related entities
- **In_Game_Date**: A date within the campaign world's calendar system
- **Real_World_Date**: The actual calendar date when a Session occurred
- **Party**: The group of player characters participating in a Campaign
- **Campaign_Setting**: The world or universe in which the Campaign takes place (e.g., Forgotten Realms, Eberron, homebrew)
- **Campaign_Status**: The current state of a Campaign: planning, active, on_hold, or completed
- **Session_Number**: A sequential identifier for Sessions within a Campaign
- **Arc**: A multi-session story arc or chapter within a larger Campaign
- **Tag**: A label applied to NPCs, Locations, Quests, or Timeline_Entry records for categorization and filtering
- **Relationship**: A connection between two NPCs indicating their association (ally, enemy, family, etc.)
- **NPC_Role**: The function an NPC serves in the narrative (quest_giver, villain, merchant, ally, etc.)
- **Map_Reference**: A link or file reference to a visual map associated with a Location
- **Session_Template**: A reusable structure for Session_Note formatting
- **Campaign_Invitation**: A request sent to a user to join a Campaign as a Campaign_Member
- **Access_Level**: The permission level a Campaign_Member has: viewer (read-only) or player (read + character assignment)


## Requirements

### Requirement 1: Campaign Creation and Management

**User Story:** As a Dungeon Master, I want to create and manage campaigns, so that I can organize my gaming sessions and track campaign details.

#### Acceptance Criteria

1. WHEN an authenticated user creates a Campaign, THE Campaign_System SHALL set the user as the Campaign_Owner
2. WHEN creating a Campaign, THE user SHALL provide a Campaign name (required), Campaign_Setting (optional), and description (optional)
3. THE Campaign_System SHALL assign a unique Campaign ID to each Campaign
4. THE Campaign_System SHALL set the Campaign_Status to planning when a Campaign is created
5. THE Campaign_System SHALL allow the Campaign_Owner to update the Campaign name, Campaign_Setting, description, and Campaign_Status at any time
6. THE Campaign_System SHALL allow the Campaign_Owner to archive a Campaign, which removes it from the active Campaign list but retains all data
7. THE Campaign_System SHALL allow the Campaign_Owner to permanently delete a Campaign, which removes all associated Sessions, NPCs, Locations, Quests, and Timeline_Entry records after confirmation
8. THE Campaign_System SHALL display a list of all Campaigns for which the user is Campaign_Owner or Campaign_Member
9. THE Campaign list SHALL display Campaign name, Campaign_Status, last session date, and number of sessions for each Campaign
10. THE Campaign_System SHALL allow users to filter the Campaign list by Campaign_Status and search by Campaign name


### Requirement 2: Campaign Invitation and Party Management

**User Story:** As a Dungeon Master, I want to invite players to my campaign, so that they can access campaign information and link their characters.

#### Acceptance Criteria

1. THE Campaign_System SHALL allow the Campaign_Owner to invite users to the Campaign by email address
2. WHEN an invitation is sent, THE Campaign_System SHALL create a Campaign_Invitation record and send an email to the invitee
3. THE invitation email SHALL include the Campaign name, Campaign_Owner name, and a link to accept the invitation
4. WHEN a user accepts an invitation, THE Campaign_System SHALL add them as a Campaign_Member with Access_Level set to player
5. WHEN a user declines an invitation, THE Campaign_System SHALL delete the Campaign_Invitation record
6. THE Campaign_System SHALL allow the Campaign_Owner to cancel pending invitations
7. THE Campaign_System SHALL display a list of Campaign_Member records showing each member's name, Access_Level, and associated characters
8. THE Campaign_System SHALL allow the Campaign_Owner to remove a Campaign_Member from the Campaign
9. WHEN a Campaign_Member is removed, THE Campaign_System SHALL unlink their characters from the Campaign but SHALL NOT delete the character records
10. THE Campaign_System SHALL allow the Campaign_Owner to change a Campaign_Member's Access_Level between viewer and player
11. THE Campaign_System SHALL allow Campaign_Member users with player Access_Level to link their characters to the Campaign
12. THE Campaign_System SHALL display the Party (all linked characters) on the Campaign dashboard
13. THE Campaign_System SHALL limit Campaign_Invitation records to users who already have an account on the platform


### Requirement 3: Session Management

**User Story:** As a Dungeon Master, I want to create and manage gaming sessions within my campaign, so that I can track when we play and organize session-specific information.

#### Acceptance Criteria

1. THE Campaign_System SHALL allow the Campaign_Owner to create a Session within a Campaign
2. WHEN creating a Session, THE Campaign_System SHALL automatically assign a Session_Number incrementing from the previous session in the Campaign
3. WHEN creating a Session, THE user SHALL provide a Session title (optional), Real_World_Date (required), and In_Game_Date (optional)
4. THE Campaign_System SHALL allow the Campaign_Owner to update the Session title, Real_World_Date, and In_Game_Date at any time
5. THE Campaign_System SHALL display Sessions in chronological order by Session_Number on the Campaign dashboard
6. THE Campaign_System SHALL allow the Campaign_Owner to delete a Session, which removes the Session and all associated Session_Note records after confirmation
7. THE Campaign_System SHALL display a Session list showing Session_Number, title, Real_World_Date, and In_Game_Date for each Session
8. THE Campaign_System SHALL allow filtering Sessions by date range
9. THE Campaign_System SHALL track Session duration in hours (optional field)
10. THE Campaign_System SHALL calculate and display total Campaign playtime based on Session duration records
11. THE Campaign_System SHALL allow the Campaign_Owner to reorder Sessions by changing the Session_Number
12. THE Campaign_System SHALL allow Campaign_Member users to view all Sessions but not create, edit, or delete them


### Requirement 4: Session Notes and Summaries

**User Story:** As a Dungeon Master, I want to write and organize session notes, so that I can remember what happened and reference past events.

#### Acceptance Criteria

1. THE Campaign_System SHALL allow the Campaign_Owner to create Session_Note records within a Session
2. WHEN creating a Session_Note, THE user SHALL provide note content (required, rich text format) and an optional title
3. THE Campaign_System SHALL support rich text formatting in Session_Note content including bold, italic, lists, headings, and links
4. THE Campaign_System SHALL allow the Campaign_Owner to create multiple Session_Note records per Session
5. THE Campaign_System SHALL display Session_Note records in creation order within a Session detail view
6. THE Campaign_System SHALL allow the Campaign_Owner to edit and delete Session_Note records
7. THE Campaign_System SHALL allow the Campaign_Owner to create a Session_Summary as a special type of Session_Note marked as summary
8. THE Session_Summary SHALL appear at the top of the Session detail view in a highlighted card
9. THE Campaign_System SHALL limit each Session to one Session_Summary
10. THE Campaign_System SHALL allow the Campaign_Owner to link NPCs, Locations, and Quests to a Session_Note by selecting them from existing records
11. WHEN an NPC, Location, or Quest is linked to a Session_Note, THE Campaign_System SHALL display clickable references within the note content
12. THE Campaign_System SHALL allow Campaign_Member users to view Session_Note and Session_Summary records but not create, edit, or delete them
13. THE Campaign_System SHALL provide a Session_Template feature allowing the Campaign_Owner to save note structures for reuse across sessions


### Requirement 5: NPC Tracking

**User Story:** As a Dungeon Master, I want to track NPCs in my campaign, so that I can remember their details, relationships, and role in the story.

#### Acceptance Criteria

1. THE Campaign_System SHALL allow the Campaign_Owner to create NPC records within a Campaign
2. WHEN creating an NPC, THE user SHALL provide a name (required)
3. THE Campaign_System SHALL allow the Campaign_Owner to add the following optional fields to an NPC: description, NPC_Role, race, class, level, Location, and notes
4. THE Campaign_System SHALL support multiple NPC_Role values per NPC (e.g., an NPC can be both quest_giver and merchant)
5. THE Campaign_System SHALL allow the Campaign_Owner to upload an avatar image for an NPC
6. THE Campaign_System SHALL display a list of all NPCs in the Campaign with name, NPC_Role, and Location
7. THE Campaign_System SHALL allow filtering NPCs by NPC_Role, Location, and Tag
8. THE Campaign_System SHALL allow searching NPCs by name
9. THE Campaign_System SHALL allow the Campaign_Owner to edit and delete NPC records
10. THE Campaign_System SHALL allow the Campaign_Owner to define Relationship records between NPCs indicating the type of relationship
11. WHEN viewing an NPC detail page, THE Campaign_System SHALL display all Relationship records showing connected NPCs and relationship types
12. THE Campaign_System SHALL allow the Campaign_Owner to add Tag records to NPCs for custom categorization
13. THE Campaign_System SHALL track which Sessions an NPC appeared in by linking NPCs to Session_Note records
14. WHEN viewing an NPC detail page, THE Campaign_System SHALL display a list of Sessions where the NPC was mentioned
15. THE Campaign_System SHALL allow Campaign_Member users to view NPC records but not create, edit, or delete them


### Requirement 6: Location Tracking

**User Story:** As a Dungeon Master, I want to track locations in my campaign world, so that I can organize places the party has visited and reference location details.

#### Acceptance Criteria

1. THE Campaign_System SHALL allow the Campaign_Owner to create Location records within a Campaign
2. WHEN creating a Location, THE user SHALL provide a name (required)
3. THE Campaign_System SHALL allow the Campaign_Owner to add the following optional fields to a Location: description, parent_location, region, and notes
4. THE Campaign_System SHALL support hierarchical locations where a Location can have a parent_location (e.g., "The Prancing Pony" with parent "Bree")
5. THE Campaign_System SHALL display a list of all Locations in the Campaign with name and parent_location
6. THE Campaign_System SHALL allow filtering Locations by region and Tag
7. THE Campaign_System SHALL allow searching Locations by name
8. THE Campaign_System SHALL allow the Campaign_Owner to edit and delete Location records
9. THE Campaign_System SHALL allow the Campaign_Owner to add Map_Reference records to a Location (image uploads or external URLs)
10. WHEN viewing a Location detail page, THE Campaign_System SHALL display all Map_Reference records as viewable images or clickable links
11. THE Campaign_System SHALL allow the Campaign_Owner to add Tag records to Locations for custom categorization
12. THE Campaign_System SHALL track which NPCs are associated with a Location
13. WHEN viewing a Location detail page, THE Campaign_System SHALL display a list of NPCs linked to that Location
14. THE Campaign_System SHALL track which Sessions took place at a Location by linking Locations to Session_Note records
15. WHEN viewing a Location detail page, THE Campaign_System SHALL display a list of Sessions where the Location was visited
16. THE Campaign_System SHALL allow Campaign_Member users to view Location records but not create, edit, or delete them


### Requirement 7: Quest and Storyline Tracking

**User Story:** As a Dungeon Master, I want to track quests and storylines in my campaign, so that I can manage active objectives and remember completed plot threads.

#### Acceptance Criteria

1. THE Campaign_System SHALL allow the Campaign_Owner to create Quest records within a Campaign
2. WHEN creating a Quest, THE user SHALL provide a Quest name (required)
3. THE Campaign_System SHALL allow the Campaign_Owner to add the following optional fields to a Quest: description, Quest_Status, rewards, Quest_giver (linked NPC), and notes
4. THE Campaign_System SHALL set Quest_Status to not_started by default when a Quest is created
5. THE Campaign_System SHALL allow the Campaign_Owner to update Quest_Status to active, completed, or failed
6. THE Campaign_System SHALL display a list of all Quests in the Campaign with name, Quest_Status, and Quest_giver
7. THE Campaign_System SHALL allow filtering Quests by Quest_Status and Tag
8. THE Campaign_System SHALL allow searching Quests by name
9. THE Campaign_System SHALL allow the Campaign_Owner to edit and delete Quest records
10. THE Campaign_System SHALL allow the Campaign_Owner to link a Quest to a parent Quest to represent sub-quests or related storylines
11. THE Campaign_System SHALL allow the Campaign_Owner to link NPCs and Locations to a Quest
12. WHEN viewing a Quest detail page, THE Campaign_System SHALL display all linked NPCs and Locations
13. THE Campaign_System SHALL allow the Campaign_Owner to add Tag records to Quests for custom categorization (e.g., "main story", "side quest", "arc 1")
14. THE Campaign_System SHALL track which Sessions advanced a Quest by linking Quests to Session_Note records
15. WHEN viewing a Quest detail page, THE Campaign_System SHALL display a list of Sessions where the Quest was progressed
16. THE Campaign_System SHALL allow Campaign_Member users to view Quest records but not create, edit, or delete them
17. THE Campaign_System SHALL display active Quests on the Campaign dashboard in a prominent widget


### Requirement 8: Campaign Timeline

**User Story:** As a Dungeon Master, I want to maintain a timeline of campaign events, so that I can track chronology and reference when things happened in the game world.

#### Acceptance Criteria

1. THE Campaign_System SHALL allow the Campaign_Owner to create Timeline_Entry records within a Campaign
2. WHEN creating a Timeline_Entry, THE user SHALL provide a description (required) and In_Game_Date (required)
3. THE Campaign_System SHALL allow the Campaign_Owner to add an optional title to a Timeline_Entry
4. THE Campaign_System SHALL display Timeline_Entry records in chronological order by In_Game_Date
5. THE Campaign_System SHALL allow the Campaign_Owner to edit and delete Timeline_Entry records
6. THE Campaign_System SHALL allow the Campaign_Owner to link NPCs, Locations, Quests, and Sessions to a Timeline_Entry
7. WHEN viewing the Campaign_Timeline, THE Campaign_System SHALL display clickable references to all linked entities on each Timeline_Entry
8. THE Campaign_System SHALL allow filtering Timeline_Entry records by date range
9. THE Campaign_System SHALL allow the Campaign_Owner to add Tag records to Timeline_Entry records for categorization (e.g., "battle", "political event", "discovery")
10. THE Campaign_System SHALL display the Campaign_Timeline on the Campaign dashboard showing recent entries
11. THE Campaign_System SHALL provide a full Campaign_Timeline view showing all Timeline_Entry records with filtering options
12. THE Campaign_System SHALL allow Campaign_Member users to view Timeline_Entry records but not create, edit, or delete them
13. THE Campaign_System SHALL automatically create Timeline_Entry records when significant events occur (e.g., Quest completion, major NPC death) with an option for the Campaign_Owner to accept or reject the auto-generated entry


### Requirement 9: Campaign Dashboard and Navigation

**User Story:** As a Dungeon Master or player, I want a centralized campaign dashboard, so that I can quickly access all campaign information and navigate between different sections.

#### Acceptance Criteria

1. THE Campaign_System SHALL provide a Campaign dashboard showing an overview of all Campaign information
2. THE Campaign dashboard SHALL display the Campaign name, Campaign_Setting, description, and Campaign_Status
3. THE Campaign dashboard SHALL display the Party roster showing all linked characters with names and player names
4. THE Campaign dashboard SHALL display a list of upcoming Sessions (if session scheduling is integrated)
5. THE Campaign dashboard SHALL display a widget showing active Quests with Quest_Status
6. THE Campaign dashboard SHALL display recent Timeline_Entry records (last 5 entries)
7. THE Campaign dashboard SHALL display summary statistics including total Sessions, total NPCs, total Locations, and total playtime
8. THE Campaign dashboard SHALL provide navigation links to Sessions, NPCs, Locations, Quests, and Timeline views
9. THE Campaign dashboard SHALL display a quick-create toolbar allowing the Campaign_Owner to create new Sessions, NPCs, Locations, and Quests without leaving the dashboard
10. THE Campaign_System SHALL provide a search feature that searches across all entity types (NPCs, Locations, Quests, Sessions) within the Campaign
11. THE search results SHALL display entity type, name, and a brief excerpt of the matching content
12. THE Campaign_System SHALL provide breadcrumb navigation showing the current location within the Campaign hierarchy


### Requirement 10: Tagging and Organization

**User Story:** As a Dungeon Master, I want to tag campaign entities with custom labels, so that I can organize and filter information according to my campaign's needs.

#### Acceptance Criteria

1. THE Campaign_System SHALL support Tag records that can be applied to NPCs, Locations, Quests, Timeline_Entry, and Session_Note records
2. THE Campaign_System SHALL allow the Campaign_Owner to create Tag records with a name and optional color
3. THE Campaign_System SHALL allow the Campaign_Owner to apply multiple Tag records to any supported entity
4. THE Campaign_System SHALL display Tag records as colored badges on entity list views
5. THE Campaign_System SHALL allow filtering entity lists by selecting one or more Tag records
6. WHEN multiple Tag records are selected for filtering, THE Campaign_System SHALL display entities that match ANY of the selected tags (OR logic)
7. THE Campaign_System SHALL provide a Tag management interface showing all Tag records in the Campaign with usage counts
8. THE Campaign_System SHALL allow the Campaign_Owner to rename and delete Tag records
9. WHEN a Tag is deleted, THE Campaign_System SHALL remove it from all entities but SHALL NOT delete the entities themselves
10. THE Campaign_System SHALL suggest existing Tag records when the user begins typing a tag name to prevent duplicate tags with different spellings
11. THE Campaign_System SHALL display a tag cloud on the Campaign dashboard showing the most frequently used Tag records


### Requirement 11: Campaign Export and Backup

**User Story:** As a Dungeon Master, I want to export my campaign data, so that I can create backups or migrate to other platforms.

#### Acceptance Criteria

1. THE Campaign_System SHALL allow the Campaign_Owner to export the entire Campaign as a JSON file
2. THE exported JSON file SHALL include all Sessions, Session_Note records, NPCs, Locations, Quests, Timeline_Entry records, Tag records, and Relationship records
3. THE exported JSON file SHALL include metadata such as export date, Campaign name, and Campaign ID
4. THE Campaign_System SHALL allow the Campaign_Owner to export the Campaign as a formatted PDF document
5. THE PDF export SHALL include a table of contents and organized sections for Sessions, NPCs, Locations, Quests, and Timeline
6. THE PDF export SHALL include all associated images (NPC avatars, Location maps) embedded in the document
7. THE Campaign_System SHALL provide export options allowing the Campaign_Owner to select which sections to include (e.g., NPCs only, Sessions only)
8. THE Campaign_System SHALL queue export operations in the background and notify the user via email when the export is ready for download
9. THE Campaign_System SHALL retain exported files for 7 days before automatic deletion
10. THE Campaign_System SHALL count exported PDF files against the user's storage quota


### Requirement 12: Integration with Combat and Initiative Trackers

**User Story:** As a Dungeon Master, I want to link combat encounters to sessions, so that combat results are documented as part of session history.

#### Acceptance Criteria

1. THE Campaign_System SHALL allow the Campaign_Owner to link Combat_Tracker records and Initiative_Tracker records to a Session
2. WHEN a Combat_Tracker or Initiative_Tracker is created during active play, THE Campaign_System SHALL prompt the user to select which Session the encounter belongs to
3. WHEN viewing a Session detail page, THE Campaign_System SHALL display a list of linked Combat_Tracker and Initiative_Tracker records
4. THE Campaign_System SHALL allow the Campaign_Owner to navigate from a Session to a linked encounter and vice versa
5. THE Campaign_System SHALL automatically include encounter results (combatant HP changes, initiative order) in Session_Note records when the user chooses to save encounter summary
6. THE Campaign_System SHALL allow the Campaign_Owner to unlink an encounter from a Session without deleting the encounter



