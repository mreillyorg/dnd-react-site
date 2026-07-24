# Requirements Document

## Introduction

This document specifies the requirements for Reference Lookups in a web-based Dungeons & Dragons companion site. The system provides players and Dungeon Masters with quick access to D&D 5e System Reference Document content including spells, monsters, items, rules, and conditions. Reference lookups enhance gameplay by providing instant access to game mechanics, reducing rulebook searching, and supporting informed decision-making during sessions. This feature integrates with other systems to provide contextual references from character sheets, combat trackers, and item inventories.

## Glossary

- **Reference_System**: The component responsible for managing SRD content access, search, and display
- **SRD_Content**: Official D&D 5e System Reference Document content available under the OGL (Open Game License)
- **Reference_Category**: A classification of reference content: spells, monsters, items, rules, conditions, classes, races, feats, or backgrounds
- **Spell_Reference**: A spell entry containing name, level, school, casting time, range, components, duration, and description
- **Monster_Reference**: A monster entry with full stat block (reuses Monster_System data)
- **Item_Reference**: An item entry with name, type, rarity, and description (reuses Item_System data)
- **Rule_Reference**: A rule entry explaining game mechanics organized by topic (combat, movement, spellcasting, etc.)
- **Condition_Reference**: A condition entry describing mechanical effects (blinded, charmed, frightened, etc.)
- **Quick_Reference_Card**: A condensed summary of commonly referenced rules for at-the-table use
- **Reference_Search**: A search query across all Reference_Category types
- **Spell_Filter**: Criteria for filtering spells by level, school, class, casting time, or components
- **Monster_Filter**: Criteria for filtering monsters by type, CR, size, or environment
- **Item_Filter**: Criteria for filtering items by type, rarity, or attunement requirement
- **Reference_Bookmark**: A user-saved reference for quick access
- **Reference_History**: A log of recently viewed references for a user
- **Contextual_Reference_Link**: A hyperlink from another system component to a relevant reference
- **SRD_Version**: The version of the System Reference Document content (D&D 5e v5.1)
- **Reference_View_Count**: Tracking metric for most-viewed references
- **Spell_Level**: The spell's power level from 0 (cantrip) to 9
- **Spell_School**: The magical tradition: abjuration, conjuration, divination, enchantment, evocation, illusion, necromancy, or transmutation
- **Spell_Components**: Requirements for casting: verbal (V), somatic (S), or material (M)
- **Concentration**: A boolean flag indicating if a spell requires concentration
- **Ritual**: A boolean flag indicating if a spell can be cast as a ritual
- **Class_Spell_List**: The classes that have access to a particular spell


## Requirements

### Requirement 1: SRD Content Database

**User Story:** As a user, I want access to the complete D&D 5e SRD content, so that I have all official rules and reference material available.

#### Acceptance Criteria

1. THE Reference_System SHALL include a complete database of SRD_Content from D&D 5e System Reference Document v5.1
2. THE SRD_Content database SHALL include all spells, monsters, magic items, rules, conditions, classes, races, feats, and backgrounds from the SRD
3. EACH content entry SHALL be tagged with its Reference_Category for organization
4. THE Reference_System SHALL display proper attribution to Wizards of the Coast and the Open Game License on all reference pages
5. THE SRD_Content database SHALL be pre-populated during application setup
6. THE Reference_System SHALL support updates to SRD_Content when new versions are released
7. THE Reference_System SHALL mark all content with SRD_Version for tracking
8. THE Reference_System SHALL NOT include non-SRD content (content from official D&D books not released under OGL)
9. THE Reference_System SHALL provide a disclaimer that additional content is available in official D&D sourcebooks
10. THE Reference_System SHALL display the OGL license text on a dedicated license page


### Requirement 2: Reference Search

**User Story:** As a user, I want to search across all reference content, so that I can quickly find the information I need.

#### Acceptance Criteria

1. THE Reference_System SHALL provide a Reference_Search feature accessible from the main navigation
2. THE Reference_Search SHALL accept text queries and search across all Reference_Category types
3. THE Reference_Search SHALL return results ranked by relevance with name matches prioritized over description matches
4. THE search results SHALL display entry name, Reference_Category, and a brief excerpt showing the matching text
5. THE Reference_Search SHALL support filtering results by Reference_Category (e.g., show only spells)
6. THE Reference_Search SHALL provide autocomplete suggestions as the user types, showing top 10 matching entries
7. THE Reference_Search SHALL highlight the matching search terms in the results
8. THE Reference_Search SHALL support fuzzy matching to handle misspellings (e.g., "fier bolt" finds "Fire Bolt")
9. THE Reference_Search SHALL track Reference_History for each user showing their recent searches
10. THE Reference_System SHALL provide a "popular searches" list on the reference home page showing the most common queries
11. THE Reference_Search SHALL return results within 500ms for typical queries


### Requirement 3: Spell Reference and Filtering

**User Story:** As a spellcaster, I want to browse and filter spells, so that I can find spells appropriate for my character.

#### Acceptance Criteria

1. THE Reference_System SHALL provide a spell browser displaying all Spell_Reference entries
2. THE spell browser SHALL allow filtering by Spell_Level (including cantrips as level 0)
3. THE spell browser SHALL allow filtering by Spell_School
4. THE spell browser SHALL allow filtering by Class_Spell_List (show only Wizard spells, only Cleric spells, etc.)
5. THE spell browser SHALL allow filtering by Concentration (show only concentration spells or non-concentration spells)
6. THE spell browser SHALL allow filtering by Ritual (show only ritual spells)
7. THE spell browser SHALL allow filtering by casting time (action, bonus action, reaction, longer)
8. THE spell browser SHALL allow filtering by Spell_Components (e.g., show only spells without material components)
9. THE spell browser SHALL allow sorting by name, level, or school
10. THE spell browser SHALL display spells in a list or card view with name, level, school, and casting time visible
11. WHEN a user selects a spell, THE Reference_System SHALL display the complete spell entry including range, duration, components, description, and higher levels scaling
12. THE spell detail view SHALL indicate which classes have access to the spell
13. THE spell detail view SHALL include Class_Spell_List tags (e.g., "Wizard, Sorcerer")
14. THE Reference_System SHALL allow users to add spells to Reference_Bookmark for quick access


### Requirement 4: Monster Reference

**User Story:** As a Dungeon Master, I want to look up monster stat blocks, so that I can reference creature statistics outside of combat.

#### Acceptance Criteria

1. THE Reference_System SHALL integrate with the Monster_System to provide Monster_Reference entries
2. THE Reference_System SHALL provide a monster browser displaying all SRD_Monster entries
3. THE monster browser SHALL reuse Monster_Filter functionality from the Monster_System (type, CR, size, environment)
4. THE monster browser SHALL allow sorting by name, CR, or monster type
5. WHEN a user selects a monster, THE Reference_System SHALL display the full Stat_Block
6. THE monster detail view SHALL reuse the Stat_Block display component from the Monster_System
7. THE Reference_System SHALL allow users to add monsters to Reference_Bookmark
8. THE monster browser SHALL display monster count per Challenge_Rating range (e.g., "CR 0-4: 45 monsters")
9. THE Reference_System SHALL provide quick filters for common use cases (legendary creatures, flying creatures, undead)
10. THE monster detail view SHALL include the DnDBeyond_Link if available


### Requirement 5: Magic Item Reference

**User Story:** As a user, I want to browse magic items, so that I can find items for my character or campaign.

#### Acceptance Criteria

1. THE Reference_System SHALL integrate with the Item_System to provide Item_Reference entries
2. THE Reference_System SHALL provide an item browser displaying all SRD_Item entries
3. THE item browser SHALL reuse Item_Filter functionality from the Item_System (type, rarity, attunement)
4. THE item browser SHALL allow sorting by name, rarity, or item type
5. WHEN a user selects an item, THE Reference_System SHALL display the complete item description including properties, attunement requirements, and mechanical effects
6. THE Reference_System SHALL allow users to add items to Reference_Bookmark
7. THE item browser SHALL display item count per Item_Rarity (e.g., "Uncommon: 23 items")
8. THE item detail view SHALL include a button to add the item to a character's inventory (if user owns characters)
9. THE Reference_System SHALL provide quick filters for common use cases (weapons, armor, wondrous items, consumables)
10. THE item detail view SHALL display the item's value in gold pieces if available


### Requirement 6: Rules Reference

**User Story:** As a user, I want to look up game rules, so that I can resolve questions about game mechanics during play.

#### Acceptance Criteria

1. THE Reference_System SHALL provide a rules browser organized by topic hierarchy
2. THE rules browser SHALL include Rule_Reference entries for: combat, movement, spellcasting, ability checks, saving throws, resting, conditions, cover, advantage/disadvantage, and other core mechanics
3. THE rules browser SHALL display a table of contents showing all rule topics
4. THE rules browser SHALL support nested topics (e.g., Combat > Attack Actions > Making an Attack)
5. WHEN a user selects a rule topic, THE Reference_System SHALL display the rule text with examples
6. THE Rule_Reference content SHALL include cross-references to related rules with hyperlinks
7. THE Reference_System SHALL allow users to add rules to Reference_Bookmark
8. THE rules browser SHALL provide breadcrumb navigation showing the current location in the hierarchy
9. THE Reference_System SHALL include a "Most Referenced Rules" widget showing commonly viewed rules
10. THE rules browser SHALL include diagrams and tables where helpful (e.g., cover diagram, condition summary table)


### Requirement 7: Condition Reference

**User Story:** As a user, I want to look up condition effects, so that I can understand what happens when a character is blinded, charmed, etc.

#### Acceptance Criteria

1. THE Reference_System SHALL provide a condition browser displaying all Condition_Reference entries
2. THE condition browser SHALL include all SRD conditions: blinded, charmed, deafened, exhaustion, frightened, grappled, incapacitated, invisible, paralyzed, petrified, poisoned, prone, restrained, stunned, and unconscious
3. EACH Condition_Reference SHALL display the condition name and complete mechanical effects
4. THE condition browser SHALL display conditions in alphabetical order with a summary table
5. THE Reference_System SHALL allow users to add conditions to Reference_Bookmark
6. THE Condition_Reference SHALL include cross-references to related rules (e.g., "See also: Grappling rules")
7. THE condition detail view SHALL indicate common sources of the condition (spells, monster abilities)
8. THE Reference_System SHALL provide a printable condition reference card with all conditions on one page
9. THE Combat_Tracker SHALL provide Contextual_Reference_Link to Condition_Reference when applying conditions to combatants


### Requirement 8: Quick Reference Cards

**User Story:** As a user, I want printable quick reference cards, so that I can have condensed rules summaries at the table.

#### Acceptance Criteria

1. THE Reference_System SHALL provide Quick_Reference_Card PDFs for common rule topics
2. THE Quick_Reference_Card collection SHALL include: combat actions, conditions, cover and concealment, spellcasting, ability checks and saves, and movement
3. EACH Quick_Reference_Card SHALL fit on a single page with print-friendly formatting
4. THE Reference_System SHALL provide a "Print Quick Ref" button on relevant reference pages
5. THE Quick_Reference_Card SHALL use tables, bullet points, and icons for easy scanning
6. THE Reference_System SHALL allow users to download all Quick_Reference_Card files as a zip archive
7. THE Quick_Reference_Card SHALL include page numbers and references to full rules in the Player's Handbook
8. THE Reference_System SHALL provide both letter and A4 paper size options for Quick_Reference_Card downloads
9. THE Quick_Reference_Card SHALL be accessible to all users


### Requirement 9: Bookmarks and Recent History

**User Story:** As a user, I want to save favorite references and see my recent lookups, so that I can quickly access frequently needed information.

#### Acceptance Criteria

1. THE Reference_System SHALL allow users to create Reference_Bookmark records for any reference entry
2. THE Reference_System SHALL provide a "My Bookmarks" page displaying all Reference_Bookmark records organized by Reference_Category
3. THE Reference_System SHALL allow users to add notes to Reference_Bookmark records
4. THE Reference_System SHALL allow users to organize Reference_Bookmark records into custom folders
5. THE Reference_System SHALL display a bookmark icon on reference detail pages that is filled when the entry is bookmarked
6. THE Reference_System SHALL track Reference_History showing the last 50 references viewed by the user
7. THE Reference_History SHALL display timestamp, entry name, and Reference_Category
8. THE Reference_System SHALL provide a "Recent" dropdown in the reference navigation showing the last 10 viewed references
9. THE Reference_System SHALL allow users to clear their Reference_History
10. THE Reference_System SHALL display Reference_Bookmark and Reference_History on the reference home page for quick access


### Requirement 10: Contextual Reference Links

**User Story:** As a user, I want to access relevant references from other parts of the application, so that I can look up information without leaving my current task.

#### Acceptance Criteria

1. THE Character_System SHALL provide Contextual_Reference_Link from character features to relevant Spell_Reference or Rule_Reference entries
2. THE Item_System SHALL provide Contextual_Reference_Link from magic items to relevant Spell_Reference entries when items have spell effects
3. THE Combat_Tracker SHALL provide Contextual_Reference_Link from action buttons to relevant Rule_Reference entries (e.g., "Attack" links to attack rules)
4. THE Monster_System SHALL provide Contextual_Reference_Link from monster abilities to relevant Spell_Reference or Condition_Reference entries
5. WHEN a user clicks a Contextual_Reference_Link, THE Reference_System SHALL open the reference in a modal overlay without navigating away from the current page
6. THE modal overlay SHALL allow users to open the full reference page in a new tab if desired
7. THE Reference_System SHALL display related references at the bottom of each reference detail page (e.g., spells that cause a condition on the condition page)
8. THE Reference_System SHALL auto-link spell names, condition names, and rule terms in descriptions to their respective references
9. THE auto-linked references SHALL be displayed as inline hyperlinks with distinctive styling


### Requirement 11: Class and Race References

**User Story:** As a player, I want to look up class and race features, so that I understand my character's abilities.

#### Acceptance Criteria

1. THE Reference_System SHALL provide class reference pages for all SRD classes: Barbarian, Bard, Cleric, Druid, Fighter, Monk, Paladin, Ranger, Rogue, Sorcerer, Warlock, and Wizard
2. EACH class reference SHALL include hit dice, proficiencies, equipment, class features by level, and subclass options (if SRD includes subclasses)
3. THE Reference_System SHALL provide race reference pages for all SRD races: Dwarf, Elf, Halfling, Human, Dragonborn, Gnome, Half-Elf, Half-Orc, and Tiefling
4. EACH race reference SHALL include ability score increases, size, speed, languages, and racial traits
5. THE class reference SHALL include a level progression table showing features gained at each level
6. THE class reference SHALL link to Class_Spell_List for spellcasting classes
7. THE Reference_System SHALL allow filtering the spell browser to show only spells available to a specific class
8. THE Reference_System SHALL provide a class comparison table showing key differences between classes
9. THE Character_System SHALL provide Contextual_Reference_Link from character sheets to class and race references





### Requirement 13: Mobile and Offline Access

**User Story:** As a user, I want to access references on mobile devices and offline, so that I can use them at the gaming table without internet.

#### Acceptance Criteria

1. THE Reference_System SHALL provide a mobile-responsive interface optimized for smartphones and tablets
2. THE mobile reference interface SHALL use a card-based layout for easy touch navigation
3. THE Reference_System SHALL implement Progressive Web App (PWA) capabilities for offline access
4. WHEN a user enables offline mode, THE Reference_System SHALL cache frequently accessed references for offline viewing
5. THE offline cache SHALL prioritize bookmarked references and recent history
6. THE Reference_System SHALL display an offline indicator showing which references are available without internet
7. THE mobile interface SHALL provide gesture-based navigation (swipe to go back, pull to refresh)
8. THE Reference_System SHALL allow users to download reference categories for offline access (e.g., download all spells)
9. THE downloaded references SHALL be stored in the device's local storage with a configurable cache size limit
10. THE Reference_System SHALL provide a "Download for Offline" button on reference pages
11. THE Reference_System SHALL sync Reference_Bookmark and Reference_History when the device comes back online
