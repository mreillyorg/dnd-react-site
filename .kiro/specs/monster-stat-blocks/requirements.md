# Requirements Document

## Introduction

This document specifies the requirements for Monster Stat Block management in a web-based Dungeons & Dragons companion site. The system enables Dungeon Masters to access SRD monster stat blocks, create custom monsters, store stat blocks for quick reference, display stat blocks in mouseover popovers during combat, and link to D&D Beyond for detailed information. Monster stat blocks enhance the Combat Tracker by providing DMs with instant access to creature statistics, abilities, and actions during encounters. This feature is foundational for efficient combat management and encounter preparation.

## Glossary

- **Monster_System**: The component responsible for managing monster stat blocks, creature database, and stat block displays
- **Monster**: A creature with defined game statistics including ability scores, HP, AC, attacks, and special abilities
- **Stat_Block**: A structured record of a Monster's game statistics and abilities
- **SRD_Monster**: A monster from the System Reference Document (official D&D content)
- **Custom_Monster**: A monster created by a user (homebrew or third-party content)
- **Monster_Database**: A collection of pre-defined SRD_Monster records available for use
- **Monster_Library**: A personal collection of Custom_Monster and favorited SRD_Monster records for a user
- **Stat_Block_Popover**: A hoverable UI element that displays a Monster's Stat_Block when the user hovers over a combatant name
- **Challenge_Rating**: A numeric rating (CR) indicating a Monster's difficulty level
- **Monster_Type**: The creature category: aberration, beast, celestial, construct, dragon, elemental, fey, fiend, giant, humanoid, monstrosity, ooze, plant, or undead
- **Size_Category**: The Monster's size: tiny, small, medium, large, huge, or gargantuan
- **Alignment**: The Monster's moral and ethical outlook (e.g., lawful good, chaotic evil, unaligned)
- **Ability_Scores**: The Monster's six core attributes: Strength, Dexterity, Constitution, Intelligence, Wisdom, Charisma
- **HP_Formula**: The dice expression used to calculate a Monster's hit points (e.g., "8d10+16")
- **Armor_Class**: The Monster's AC value and armor type
- **Speed**: The Monster's movement rates (walk, fly, swim, burrow, climb)
- **Saving_Throws**: The Monster's saving throw bonuses
- **Skills**: The Monster's skill proficiencies and bonuses
- **Damage_Resistances**: Damage types the Monster takes half damage from
- **Damage_Immunities**: Damage types the Monster is immune to
- **Condition_Immunities**: Conditions the Monster cannot be affected by
- **Senses**: The Monster's special senses (darkvision, blindsight, tremorsense, etc.)
- **Languages**: Languages the Monster can speak or understand
- **Special_Abilities**: Passive traits and features the Monster possesses
- **Actions**: Attacks and abilities the Monster can use on its turn
- **Reactions**: Abilities the Monster can use as a reaction
- **Legendary_Actions**: Special actions available to legendary creatures
- **Lair_Actions**: Environmental effects controlled by the Monster in its lair
- **DnDBeyond_Link**: A URL linking to the Monster's page on D&D Beyond
- **Monster_Source**: The origin of a Monster record: srd, homebrew, or third_party
- **Combat_Instance**: A link between a Monster Stat_Block and a specific combatant in the Combat_Tracker


## Requirements

### Requirement 1: SRD Monster Database

**User Story:** As a Dungeon Master, I want access to all SRD monsters, so that I can quickly add standard creatures to encounters without manual entry.

#### Acceptance Criteria

1. THE Monster_System SHALL include a Monster_Database containing all SRD_Monster records from the D&D 5e System Reference Document
2. EACH SRD_Monster SHALL include a complete Stat_Block with all fields: name, Size_Category, Monster_Type, Alignment, Armor_Class, HP_Formula, Speed, Ability_Scores, Saving_Throws, Skills, Damage_Resistances, Damage_Immunities, Condition_Immunities, Senses, Languages, Challenge_Rating, Special_Abilities, Actions, Reactions, Legendary_Actions, and Lair_Actions
3. THE Monster_System SHALL allow users to browse the Monster_Database with filtering by Monster_Type, Challenge_Rating, and Size_Category
4. THE Monster_System SHALL allow users to search the Monster_Database by monster name
5. THE Monster_System SHALL display the full Stat_Block when a user selects an SRD_Monster from the database
6. THE Monster_System SHALL NOT allow users to edit or delete SRD_Monster records
7. THE Monster_System SHALL mark all SRD_Monster records with Monster_Source set to srd
8. THE Monster_Database SHALL be pre-populated during application setup and updated when new SRD content is released
9. THE Monster_System SHALL allow users to favorite SRD_Monster records for quick access in their Monster_Library
10. THE Monster_System SHALL display monster artwork (if available and licensed) on Stat_Block views


### Requirement 2: Custom Monster Creation

**User Story:** As a Dungeon Master, I want to create custom monster stat blocks, so that I can use homebrew creatures and third-party content in my campaigns.

#### Acceptance Criteria

1. THE Monster_System SHALL allow authenticated users to create Custom_Monster records
2. WHEN creating a Custom_Monster, THE user SHALL provide a name (required), Monster_Type (required), and Challenge_Rating (required)
3. THE Monster_System SHALL provide a form interface for entering all Stat_Block fields with appropriate input types (numeric fields, dice notation validators, multiline text for abilities)
4. THE Monster_System SHALL validate HP_Formula using standard dice notation (e.g., "8d10+16") and display an error for invalid formats
5. THE Monster_System SHALL set Monster_Source to homebrew for all Custom_Monster records
6. THE Monster_System SHALL store each Custom_Monster in the creator's Monster_Library
7. THE Monster_System SHALL allow the monster creator to edit and delete Custom_Monster records they created
8. THE Monster_System SHALL allow users to copy an SRD_Monster into their Monster_Library as a Custom_Monster for modification
9. THE Monster_System SHALL support rich text formatting in Special_Abilities, Actions, Reactions, Legendary_Actions, and Lair_Actions descriptions
10. THE Monster_System SHALL allow uploading a custom image for Custom_Monster records


### Requirement 3: Stat Block Popover Display

**User Story:** As a Dungeon Master, I want to see a monster's stat block when I hover over its name in the combat tracker, so that I can reference statistics without leaving the encounter screen.

#### Acceptance Criteria

1. THE Monster_System SHALL display a Stat_Block_Popover when the user hovers over a combatant name in the Combat_Tracker where the combatant is linked to a Monster
2. THE Stat_Block_Popover SHALL appear within 200ms of hover start
3. THE Stat_Block_Popover SHALL display the Monster's name, Size_Category, Monster_Type, Alignment, and Challenge_Rating in the header
4. THE Stat_Block_Popover SHALL display Armor_Class, HP_Formula (average HP in parentheses), and Speed in a summary section
5. THE Stat_Block_Popover SHALL display all six Ability_Scores with modifiers in parentheses
6. THE Stat_Block_Popover SHALL display Saving_Throws, Skills, Damage_Resistances, Damage_Immunities, Condition_Immunities, Senses, and Languages
7. THE Stat_Block_Popover SHALL display Special_Abilities with name and description
8. THE Stat_Block_Popover SHALL display Actions with name, attack bonus, damage dice, and description
9. THE Stat_Block_Popover SHALL display Reactions, Legendary_Actions, and Lair_Actions if present
10. THE Stat_Block_Popover SHALL remain visible while the mouse is over the popover itself, allowing users to scroll through long stat blocks
11. THE Stat_Block_Popover SHALL close when the mouse leaves both the combatant name and the popover
12. THE Stat_Block_Popover SHALL be styled to match D&D 5e stat block formatting conventions


### Requirement 4: D&D Beyond Integration

**User Story:** As a Dungeon Master, I want to link to D&D Beyond from stat block popovers, so that I can access additional lore and detailed information.

#### Acceptance Criteria

1. THE Monster_System SHALL include a DnDBeyond_Link field for each SRD_Monster pointing to the official D&D Beyond monster page
2. ALL SRD_Monster records SHALL have DnDBeyond_Link populated during database setup
3. THE Stat_Block_Popover SHALL display a "View on D&D Beyond" button for SRD_Monster records with a valid DnDBeyond_Link
4. WHEN the user clicks the "View on D&D Beyond" button, THE Monster_System SHALL open the DnDBeyond_Link in a new browser tab
5. THE Monster_System SHALL allow users to manually add DnDBeyond_Link values to Custom_Monster records
6. THE Monster_System SHALL validate DnDBeyond_Link format to ensure it is a valid URL
7. THE Stat_Block_Popover SHALL display the D&D Beyond logo next to the link button for brand recognition
8. THE Monster_System SHALL track click-through analytics for D&D Beyond links (for internal metrics only)


### Requirement 5: Monster Library and Favorites

**User Story:** As a Dungeon Master, I want to organize my frequently used monsters, so that I can quickly add them to encounters.

#### Acceptance Criteria

1. THE Monster_System SHALL provide a Monster_Library view for each user showing all Custom_Monster records they created
2. THE Monster_System SHALL allow users to mark SRD_Monster records as favorites
3. WHEN an SRD_Monster is favorited, THE Monster_System SHALL add it to the user's Monster_Library view
4. THE Monster_Library SHALL display Custom_Monster and favorited SRD_Monster records together in a unified list
5. THE Monster_System SHALL allow filtering the Monster_Library by Monster_Type, Challenge_Rating, and Monster_Source
6. THE Monster_System SHALL allow searching the Monster_Library by monster name
7. THE Monster_System SHALL display usage statistics for each Monster showing how many times it has been used in combat encounters
8. THE Monster_System SHALL allow users to quickly add Monsters from their Monster_Library to active Combat_Tracker instances via drag-and-drop or quick-add buttons
9. THE Monster_System SHALL allow users to organize the Monster_Library with custom folders or tags
10. THE Monster_System SHALL provide quick filters for common CR ranges (e.g., "CR 0-4", "CR 5-10", "CR 11-16", "CR 17+")


### Requirement 6: Integration with Combat Tracker

**User Story:** As a Dungeon Master, I want to link monster stat blocks to combatants in the combat tracker, so that stats are automatically populated and accessible.

#### Acceptance Criteria

1. THE Monster_System SHALL allow linking a Monster Stat_Block to a combatant when adding creatures to the Combat_Tracker
2. WHEN a Monster is linked to a combatant, THE Combat_Tracker SHALL automatically populate the combatant's HP using the HP_Formula (rolling dice or using average)
3. WHEN a Monster is linked to a combatant, THE Combat_Tracker SHALL automatically populate the combatant's Armor_Class
4. THE Combat_Tracker SHALL display the Monster's name as the combatant name by default, with an option to customize (e.g., "Goblin 1", "Goblin 2")
5. THE Combat_Tracker SHALL store a Combat_Instance link between the Monster and the combatant for popover display
6. THE Combat_Tracker SHALL allow the DM to add multiple instances of the same Monster with independent HP tracking
7. THE Combat_Tracker SHALL display the Monster's Challenge_Rating next to the combatant name
8. THE Combat_Tracker SHALL allow the DM to override HP values after the Monster is added (for pre-damaged or buffed creatures)
9. THE Monster_System SHALL provide a quick-add feature from the Monster_Library directly into an active Combat_Tracker
10. THE Combat_Tracker SHALL display the Monster's initiative modifier suggestion based on Dexterity score


### Requirement 7: Monster Import and Export

**User Story:** As a Dungeon Master, I want to import and export monster stat blocks, so that I can share homebrew creatures or backup my custom monsters.

#### Acceptance Criteria

1. THE Monster_System SHALL allow users to export their Monster_Library as a JSON file
2. THE exported JSON SHALL include all Custom_Monster records with complete Stat_Block data
3. THE Monster_System SHALL allow users to import monsters from a JSON file
4. WHEN importing monsters, THE Monster_System SHALL validate the JSON structure and display errors for malformed data
5. THE Monster_System SHALL allow users to select which monsters to import from the JSON file, showing a preview before confirming
6. THE Monster_System SHALL detect duplicate monsters during import (matching by name) and allow users to skip, replace, or create a copy
7. THE Monster_System SHALL support importing monsters from common formats (D&D Beyond JSON, Foundry VTT, Roll20)
8. THE Monster_System SHALL count imported monster images against the user's storage quota
9. THE Monster_System SHALL provide import templates with example formats to help users structure custom imports
10. THE Monster_System SHALL allow exporting selected monsters or the entire Monster_Library



