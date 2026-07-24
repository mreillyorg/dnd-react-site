# Requirements Document

## Introduction

This document specifies the requirements for the Magic Items and Consumables Tracker in a web-based Dungeons & Dragons companion site. The system enables players and Dungeon Masters to manage magic items, track consumable quantities, enforce attunement limits, and organize items within campaigns and across characters. The tracker provides a comprehensive item database with support for custom items, SRD-standard items, and item sharing between characters. This feature enhances character management by providing detailed inventory tracking and ensures accurate representation of item-based mechanics.

## Glossary

- **Item_System**: The component responsible for managing magic items, consumables, and item assignments
- **Magic_Item**: A magical object in D&D with special properties, which may require attunement
- **Consumable**: An item with limited uses that tracks quantity (potions, scrolls, ammunition, charges)
- **Item_Database**: A collection of pre-defined Magic_Item and Consumable records available for use
- **Custom_Item**: An Item created by a user rather than sourced from the SRD or Item_Database
- **SRD_Item**: An Item sourced from the System Reference Document (official D&D content)
- **Item_Assignment**: A link between an Item and a Character indicating the character possesses the item
- **Attunement**: A magical bond between a character and a Magic_Item, limited to 3 items per character
- **Attunement_Slot**: One of the three available attunement positions for a character
- **Attunement_Required**: A boolean flag indicating whether a Magic_Item requires attunement to function
- **Item_Rarity**: The rarity classification of an Item: common, uncommon, rare, very_rare, legendary, or artifact
- **Item_Type**: The category of an Item: weapon, armor, wondrous_item, potion, scroll, ring, rod, staff, wand, or other
- **Quantity**: The number of Consumable units a character possesses
- **Charges**: A renewable resource on a Magic_Item that recharges daily or after certain conditions
- **Item_Owner**: The user who created a Custom_Item and has edit permissions
- **Campaign_Item_Pool**: A collection of Items available to all characters within a Campaign
- **Shared_Item**: An Item in the Campaign_Item_Pool that can be transferred between characters
- **Equipped**: A boolean flag indicating whether an Item is currently being used/worn by the character
- **Item_Description**: A text field containing the Item's mechanical effects and lore
- **Item_Properties**: Structured data representing mechanical attributes (damage dice, AC bonus, spell effects, etc.)
- **Weight**: The encumbrance value of an Item in pounds
- **Value**: The gold piece value of an Item
- **Item_Image**: An optional image representing the Item
- **Item_Source**: The origin of an Item: srd, homebrew, or third_party
- **Favorite_Item**: An Item marked by a user for quick access from their item library
- **Item_Library**: A personal collection of Items created or favorited by a user
- **Transfer_Request**: A request to move a Shared_Item from one character to another within a Campaign
- **Item_History**: A log of Item_Assignment changes tracking when items were acquired, transferred, or removed
- **Identified**: A boolean flag indicating whether a character knows the magical properties of an Item


## Requirements

### Requirement 1: Item Database and SRD Integration

**User Story:** As a user, I want access to a database of standard D&D items, so that I don't have to manually enter common items.

#### Acceptance Criteria

1. THE Item_System SHALL include an Item_Database containing all SRD_Item records from the D&D 5e System Reference Document
2. EACH SRD_Item SHALL include the following fields: name, Item_Type, Item_Rarity, Attunement_Required, Item_Description, Weight, and Value
3. THE Item_System SHALL allow users to browse the Item_Database with filtering by Item_Type, Item_Rarity, and Attunement_Required
4. THE Item_System SHALL allow users to search the Item_Database by item name
5. THE Item_System SHALL display full item details when a user selects an SRD_Item from the database
6. THE Item_System SHALL allow users to add an SRD_Item to a Character by creating an Item_Assignment
7. THE Item_System SHALL NOT allow users to edit or delete SRD_Item records
8. THE Item_System SHALL mark all SRD_Item records with Item_Source set to srd
9. THE Item_Database SHALL be pre-populated during application setup and updated when new SRD content is released
10. THE Item_System SHALL allow users to favorite SRD_Item records for quick access in their Item_Library


## Requirements

### Requirement 2: Custom Item Creation

**User Story:** As a user, I want to create custom magic items, so that I can track homebrew items and items not in the SRD.

#### Acceptance Criteria

1. THE Item_System SHALL allow any authenticated user to create Custom_Item records
2. WHEN creating a Custom_Item, THE user SHALL provide a name (required) and Item_Type (required)
3. THE Item_System SHALL allow the user to set the following optional fields: Item_Rarity, Attunement_Required, Item_Description, Weight, Value, Quantity, Charges, and Equipped
4. THE Item_System SHALL allow the user to upload an Item_Image
5. THE Item_System SHALL set Item_Source to homebrew for all Custom_Item records
6. THE Item_System SHALL store each Custom_Item in the creator's Item_Library
7. THE Item_System SHALL allow the Item_Owner to edit and delete Custom_Item records they created
8. THE Item_System SHALL NOT allow users to edit or delete Custom_Item records created by other users
9. THE Item_System SHALL allow users to copy a Custom_Item created by another user into their own Item_Library, creating a new independent Custom_Item record
10. THE Item_System SHALL support rich text formatting in Item_Description including bold, italic, lists, and tables for mechanical properties


### Requirement 3: Item Assignment to Characters

**User Story:** As a player, I want to assign items to my characters, so that I can track each character's inventory.

#### Acceptance Criteria

1. THE Item_System SHALL allow a user to create an Item_Assignment linking an Item to a Character they own
2. WHEN creating an Item_Assignment, THE user SHALL select an Item from their Item_Library or the Item_Database
3. THE Item_System SHALL allow the user to set Quantity when assigning a Consumable to a Character
4. THE Item_System SHALL display all Item_Assignment records on the Character sheet as an inventory list
5. THE inventory list SHALL show Item name, Item_Type, Item_Rarity, Quantity (for Consumables), Attunement_Required, and Equipped status
6. THE Item_System SHALL allow the user to update Quantity, Equipped status, and Attunement status for each Item_Assignment
7. THE Item_System SHALL allow the user to remove an Item_Assignment, which unlinks the Item from the Character without deleting the Item record
8. THE Item_System SHALL allow users to filter the inventory by Item_Type and Item_Rarity
9. THE Item_System SHALL allow users to search the inventory by Item name
10. THE Item_System SHALL display total inventory Weight on the Character sheet
11. THE Item_System SHALL calculate and display carrying capacity based on the Character's Strength score (Strength × 15 lbs per D&D 5e rules)
12. WHEN total inventory Weight exceeds carrying capacity, THE Item_System SHALL display an encumbrance warning on the Character sheet


### Requirement 4: Attunement Management

**User Story:** As a player, I want to manage attunement for my character's magic items, so that I follow D&D 5e attunement rules (maximum 3 attuned items).

#### Acceptance Criteria

1. THE Item_System SHALL track which Item_Assignment records are attuned for each Character
2. THE Item_System SHALL enforce a maximum of 3 Attunement_Slot uses per Character
3. WHEN a user attempts to attune a fourth item, THE Item_System SHALL block the action and display an error message indicating the attunement limit
4. THE Item_System SHALL allow the user to un-attune an Item_Assignment to free an Attunement_Slot
5. THE Item_System SHALL display the number of used Attunement_Slot records on the Character sheet (e.g., "Attuned Items: 2/3")
6. THE Item_System SHALL visually distinguish attuned items from non-attuned items in the inventory list with a badge or icon
7. THE Item_System SHALL display an attunement toggle button next to each Item_Assignment where Attunement_Required is true
8. WHEN an item does not require attunement, THE Item_System SHALL NOT display an attunement toggle
9. THE Item_System SHALL allow the user to attune items only for Characters they own
10. THE Item_System SHALL track attunement duration (short rest requirement) if implementing rest mechanics in the future


### Requirement 5: Consumable Quantity Tracking

**User Story:** As a player, I want to track quantities for consumables like potions and scrolls, so that I know how many uses I have left.

#### Acceptance Criteria

1. THE Item_System SHALL allow users to set and update Quantity for Item_Assignment records where the Item is a Consumable
2. WHEN Quantity reaches 0, THE Item_System SHALL display a visual indicator (e.g., grayed out or "depleted" label) on the Item_Assignment
3. THE Item_System SHALL provide increment and decrement buttons on the inventory view to adjust Quantity quickly
4. THE Item_System SHALL allow users to manually enter Quantity values
5. THE Item_System SHALL NOT allow negative Quantity values
6. WHEN Quantity is 0, THE Item_System SHALL allow the user to remove the Item_Assignment or increase Quantity to restore availability
7. THE Item_System SHALL support fractional Quantities for items like spell component pouches that deplete gradually (e.g., "0.5 remaining")
8. THE Item_System SHALL display Quantity prominently in the inventory list next to each Consumable item
9. THE Item_System SHALL allow filtering the inventory to show only Consumable items with Quantity greater than 0
10. THE Item_System SHALL track Charges separately from Quantity for Magic_Item records that have daily charges (e.g., "Wand of Magic Missiles: 7 charges")


### Requirement 6: Campaign Item Pool and Sharing

**User Story:** As a Dungeon Master or party leader, I want to manage shared items at the campaign level, so that party members can transfer items between characters.

#### Acceptance Criteria

1. THE Item_System SHALL provide a Campaign_Item_Pool for each Campaign, accessible to the Campaign_Owner and Campaign_Member users
2. THE Campaign_Owner SHALL be able to add Items to the Campaign_Item_Pool
3. WHEN an Item is added to the Campaign_Item_Pool, THE Item_System SHALL mark it as a Shared_Item
4. THE Item_System SHALL display all Shared_Item records on a Campaign inventory page
5. THE Item_System SHALL allow any Campaign_Member to create an Item_Assignment linking a Shared_Item to their Character, representing the character taking possession
6. WHEN a Shared_Item is assigned to a Character, THE Item_System SHALL remove it from the Campaign_Item_Pool (or decrement Quantity for Consumables)
7. THE Item_System SHALL allow a Campaign_Member to transfer an Item from their Character back to the Campaign_Item_Pool
8. THE Item_System SHALL provide a Transfer_Request feature allowing Campaign_Member users to request an Item from another Character
9. WHEN a Transfer_Request is created, THE Item_System SHALL notify the Item's current owner
10. THE current owner SHALL be able to approve or deny the Transfer_Request
11. WHEN a Transfer_Request is approved, THE Item_System SHALL remove the Item_Assignment from the original Character and create a new Item_Assignment for the requesting Character
12. THE Item_System SHALL log all item transfers in the Item_History showing who transferred what to whom and when


### Requirement 7: Item Identification Mechanic

**User Story:** As a Dungeon Master, I want to mark items as unidentified, so that players must discover their properties through gameplay.

#### Acceptance Criteria

1. THE Item_System SHALL support an Identified flag on each Item_Assignment
2. WHEN an Item_Assignment is created, THE Item_System SHALL set Identified to true by default for player-created assignments
3. WHEN the Campaign_Owner adds an Item to a Character or the Campaign_Item_Pool, THE Item_System SHALL allow setting Identified to false
4. WHEN Identified is false, THE Item_System SHALL display only the Item name and Item_Type to the Character owner, hiding Item_Description, Item_Rarity, and magical properties
5. WHEN Identified is false, THE Item_System SHALL display a placeholder description such as "This item's magical properties are unknown"
6. THE Item_System SHALL allow the Campaign_Owner to change Identified from false to true for any Item_Assignment in the Campaign
7. THE Item_System SHALL allow players to request identification for unidentified items, notifying the Campaign_Owner
8. WHEN an Item_Assignment is marked as Identified, THE Item_System SHALL reveal the full Item_Description and properties to the Character owner
9. THE Item_System SHALL display an "Unidentified" badge on unidentified items in the inventory view
10. THE Item_System SHALL allow filtering the inventory to show only unidentified items


### Requirement 8: Item Library and Favorites

**User Story:** As a user, I want to organize my custom items and favorite SRD items, so that I can quickly access items I use frequently.

#### Acceptance Criteria

1. THE Item_System SHALL provide an Item_Library view for each user showing all Custom_Item records they created
2. THE Item_System SHALL allow users to mark SRD_Item records as Favorite_Item
3. WHEN an SRD_Item is favorited, THE Item_System SHALL add it to the user's Item_Library view
4. THE Item_Library SHALL display Custom_Item and Favorite_Item records together in a unified list
5. THE Item_System SHALL allow filtering the Item_Library by Item_Type, Item_Rarity, and Item_Source
6. THE Item_System SHALL allow searching the Item_Library by Item name
7. THE Item_System SHALL display usage statistics for each Item in the Item_Library showing how many Characters have the Item assigned
8. THE Item_System SHALL allow users to quickly assign Items from their Item_Library to Characters via drag-and-drop or quick-assign buttons
9. THE Item_System SHALL allow users to organize the Item_Library with custom folders or tags
10. THE Item_System SHALL provide bulk operations for Item_Library management (delete multiple items, assign multiple items to a character)


### Requirement 9: Item Import and Export

**User Story:** As a Dungeon Master, I want to import and export item lists, so that I can share items between campaigns or import items from external sources.

#### Acceptance Criteria

1. THE Item_System SHALL allow users to export their Item_Library as a JSON file
2. THE exported JSON SHALL include all Custom_Item records with complete metadata
3. THE Item_System SHALL allow users to import items from a JSON file
4. WHEN importing items, THE Item_System SHALL validate the JSON structure and display errors for malformed data
5. THE Item_System SHALL allow users to select which items to import from the JSON file, showing a preview before confirming
6. THE Item_System SHALL detect duplicate items during import (matching by name) and allow users to skip, replace, or create a copy
7. THE Item_System SHALL support importing items from D&D Beyond URLs (if API access is available)
8. THE Item_System SHALL allow exporting the Campaign_Item_Pool as a CSV or JSON file for record-keeping
9. THE Item_System SHALL count imported Item_Image files against the user's storage quota
10. THE Item_System SHALL provide import templates with example formats to help users structure custom imports


### Requirement 10: Item History and Audit Trail

**User Story:** As a player or Dungeon Master, I want to see the history of item ownership and transfers, so that I can track where items came from and who has had them.

#### Acceptance Criteria

1. THE Item_System SHALL maintain an Item_History log for each Item_Assignment
2. THE Item_History SHALL record the following events: item_acquired, item_transferred, item_removed, quantity_changed, and attunement_changed
3. EACH Item_History entry SHALL include timestamp, event type, Character involved, user who performed the action, and old/new values
4. THE Item_System SHALL display the Item_History on the Item detail view accessible from the inventory
5. THE Item_System SHALL allow filtering Item_History by event type and date range
6. THE Item_System SHALL display a timeline visualization of Item_History showing the item's journey through the Campaign
7. THE Item_System SHALL allow the Campaign_Owner to view Item_History for all items in the Campaign_Item_Pool
8. THE Item_System SHALL track the source of each Item_Assignment (loot, shop purchase, crafting, gift, etc.) as an optional field
9. THE Item_System SHALL allow adding notes to Item_History entries (e.g., "Found in the dragon's hoard")
10. THE Item_System SHALL provide an export option for Item_History as a CSV file


### Requirement 11: Integration with Character Sheet

**User Story:** As a player, I want my items to integrate with my character sheet, so that item bonuses and effects are reflected in my stats.

#### Acceptance Criteria

1. THE Item_System SHALL parse Item_Properties from Item_Description to identify mechanical bonuses (AC, attack bonus, saving throws, etc.)
2. WHEN an Item is Equipped, THE Item_System SHALL apply its bonuses to the Character sheet (if auto-calculation is implemented)
3. THE Character_System SHALL display equipped weapon stats including damage dice and attack modifiers on the character sheet
4. THE Character_System SHALL display equipped armor stats including AC value and armor type
5. THE Item_System SHALL display a warning when equipped items conflict (e.g., two shields equipped, wearing heavy and light armor simultaneously)
6. THE Item_System SHALL allow users to toggle auto-calculation of item bonuses on or off per character
7. THE Item_System SHALL display active magical effects from equipped items on the Character sheet (e.g., "Ring of Protection: +1 AC and saving throws")
8. THE Item_System SHALL provide quick reference cards for equipped items accessible from the Character sheet
9. THE Item_System SHALL allow marking items as "always prepared" for spellcasting items like wands and staves
10. THE Item_System SHALL integrate with the Combat_Tracker to show equipped weapons and ammunition during combat



