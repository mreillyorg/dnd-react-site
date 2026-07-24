# Requirements Document

## Introduction

This document covers the Combat Tracker feature for the web-based D&D companion site. The feature enables players and Dungeon Masters to track hit points for player characters and monsters across multiple concurrent combat encounters and game sessions.

The Combat Tracker supports all standard D&D 5e hit point mechanics: damage, healing, temporary hit points, death saves, and hit dice recovery. It integrates with the Character Creation feature to pre-populate player character stats and supports DM-managed monster combatants alongside player-managed characters. The Combat Tracker also stores monster stat blocks (custom and imported), displays them in mouseover popovers on combatant cards, and includes direct links to each monster's D&D Beyond page.

---

## Glossary

- **Combat_Tracker**: The feature described in this document responsible for tracking hit points and combat state across encounters and sessions.
- **Encounter**: A single combat event containing one or more Combatants, associated with a Session.
- **Session**: A game session grouping one or more Encounters and persisted for a campaign.
- **Combatant**: Any participant in an Encounter being tracked, either a Player_Character or a Monster.
- **Player_Character**: A Combatant linked to a Character_Sheet created via the Character Creation feature.
- **Monster**: A Combatant representing an enemy or NPC not tied to a Character_Sheet, created ad hoc by the DM.
- **Stat_Block**: The full mechanical profile of a Monster, including ability scores, AC, speed, traits, actions, and other properties as defined in the D&D 5e SRD or custom entry.
- **Stat_Block_Popover**: A mouseover or focus-triggered UI overlay that displays a Monster's Stat_Block without navigating away from the Encounter view.
- **DnD_Beyond_Link**: A URL pointing to the corresponding monster page on D&D Beyond (https://www.dndbeyond.com/monsters/<slug>).
- **Edition**: The ruleset version of D&D being used for a Combatant, either D&D 5e (2014) or D&D 5.5e (2024).
- **Current_HP**: The combatant's current hit point total at any point during an Encounter.
- **Max_HP**: The maximum hit point total for a Combatant.
- **Temp_HP**: Temporary hit points that absorb damage before Current_HP is reduced, do not stack, and do not regenerate.
- **Death_Save**: A d20 saving throw made when a Player_Character has 0 Current_HP, with three successes indicating stabilization and three failures indicating death.
- **Damage_Type**: The category of damage dealt (e.g., slashing, fire, poison), relevant to resistances and immunities.
- **Resistance**: A Combatant property that halves incoming damage of a specific Damage_Type (rounded down).
- **Immunity**: A Combatant property that reduces incoming damage of a specific Damage_Type to zero.
- **Vulnerability**: A Combatant property that doubles incoming damage of a specific Damage_Type.
- **Hit_Die**: A die type rolled to recover hit points during a short rest, determined by the character's Class.
- **Condition**: A status effect applied to a Combatant (e.g., Poisoned, Unconscious).
- **DM**: Dungeon Master, the user who manages the Encounter and monster Combatants.
- **Player**: A user who controls one or more Player_Characters.
- **Combat_Tracker_System**: The Combat Tracker system described in this document.

---

## Requirements

### Requirement 1: Encounter Management

**User Story:** As a DM or player, I want to create and manage multiple concurrent combat encounters within a session, so that I can track HP for different fights happening simultaneously or sequentially without losing data.

#### Acceptance Criteria

1. THE Combat_Tracker_System SHALL allow a user to create a named Encounter within a Session.
2. THE Combat_Tracker_System SHALL allow a user to maintain multiple Encounters in the active state simultaneously within a single Session.
3. WHEN an Encounter is created, THE Combat_Tracker_System SHALL set the Encounter status to active and display it in the active encounters list.
4. THE Combat_Tracker_System SHALL allow a user to rename an active Encounter at any time.
5. WHEN a user ends an Encounter, THE Combat_Tracker_System SHALL set the Encounter status to completed and preserve the final HP state of all Combatants as a historical record.
6. THE Combat_Tracker_System SHALL allow a user to view completed Encounters from the current Session.
7. THE Combat_Tracker_System SHALL allow a user to delete an Encounter after confirming the deletion in a modal dialog.
8. WHEN a user confirms deletion of an Encounter, THE Combat_Tracker_System SHALL permanently remove the Encounter and all associated Combatant data.

---

### Requirement 2: Session Management

**User Story:** As a DM, I want to organize encounters by session and persist HP state across browser reloads, so that combat tracking survives interruptions and maps to real game sessions.

#### Acceptance Criteria

1. THE Combat_Tracker_System SHALL persist all Session and Encounter data to the server so that state survives browser reload and session logout.
2. THE Combat_Tracker_System SHALL allow a user to create a named Session associated with a Campaign.
3. THE Combat_Tracker_System SHALL allow a user to view a list of all Sessions for a Campaign, ordered by most recent first.
4. WHEN a user resumes a Session with active Encounters, THE Combat_Tracker_System SHALL restore all Combatant HP values, death save states, conditions, and Temp_HP exactly as they were when the Session was last saved.
5. THE Combat_Tracker_System SHALL allow a user to close and reopen a Session without losing any Encounter data.
6. THE Combat_Tracker_System SHALL allow a DM to archive a completed Session, moving it out of the active sessions list while retaining all data for review.

---

### Requirement 3: Combatant Management

**User Story:** As a DM or player, I want to add player characters and monsters to an encounter, so that all participants are tracked in one place.

#### Acceptance Criteria

1. THE Combat_Tracker_System SHALL allow a user to add a Player_Character to an Encounter by selecting from the user's character list.
2. WHEN a Player_Character is added to an Encounter, THE Combat_Tracker_System SHALL pre-populate the Combatant's name, Max_HP, Current_HP, and Edition from the linked Character_Sheet.
3. THE Combat_Tracker_System SHALL allow a DM to add a Monster to an Encounter by specifying a name, Max_HP, and Edition (D&D 5e 2014 or D&D 5.5e 2024).
4. THE Combat_Tracker_System SHALL allow a DM to add multiple Monster instances with the same name, automatically appending a numeric suffix to distinguish them (e.g., "Goblin 1", "Goblin 2").
5. THE Combat_Tracker_System SHALL allow a user to remove a Combatant from an active Encounter.
6. THE Combat_Tracker_System SHALL allow a DM to manually override the Max_HP of any Combatant in an Encounter.
7. WHEN a Max_HP override is applied to a Player_Character Combatant, THE Combat_Tracker_System SHALL use the overridden value for that Encounter without modifying the linked Character_Sheet.
8. WHEN a Character_Sheet's Max_HP is updated via the Character Creation feature, THE Combat_Tracker_System SHALL update the Max_HP of the linked Player_Character Combatant in any active Encounter to the new value, unless a manual override is in effect.

---

### Requirement 4: Damage and Healing

**User Story:** As a DM or player, I want to apply damage and healing to combatants quickly and accurately, so that HP stays current without slowing down combat.

#### Acceptance Criteria

1. WHEN a user applies damage to a Combatant with Temp_HP greater than zero, THE Combat_Tracker_System SHALL reduce Temp_HP first and apply any remaining damage to Current_HP.
2. WHEN Temp_HP is reduced to zero by a damage application, THE Combat_Tracker_System SHALL set Temp_HP to zero and apply the overflow damage to Current_HP in the same operation.
3. WHEN a user applies damage to a Combatant, THE Combat_Tracker_System SHALL not reduce Current_HP below zero.
4. WHEN a user applies healing to a Combatant, THE Combat_Tracker_System SHALL not increase Current_HP above Max_HP.
5. WHEN a user applies healing to a Combatant with Current_HP of zero, THE Combat_Tracker_System SHALL set the Combatant's death save successes and failures to zero.
6. THE Combat_Tracker_System SHALL allow a user to apply damage or healing to multiple selected Combatants in a single action.
7. THE Combat_Tracker_System SHALL display a running log of all damage and healing events for each Combatant within an Encounter, including the amount and timestamp of each event.
8. THE Combat_Tracker_System SHALL allow a user to undo the most recent damage or healing action applied to a Combatant within the current Encounter.

---

### Requirement 5: Temporary Hit Points

**User Story:** As a player, I want to track temporary hit points for my character separately from regular HP, so that buffs and spells are correctly accounted for during combat.

#### Acceptance Criteria

1. THE Combat_Tracker_System SHALL track Temp_HP as a value separate from Current_HP and Max_HP for each Combatant.
2. WHEN a user sets Temp_HP for a Combatant that already has Temp_HP greater than zero, THE Combat_Tracker_System SHALL replace the existing Temp_HP with the new value only if the new value is greater, per the 5e SRD rule that temporary hit points do not stack.
3. WHEN a user sets Temp_HP for a Combatant that has zero Temp_HP, THE Combat_Tracker_System SHALL apply the new Temp_HP value directly.
4. THE Combat_Tracker_System SHALL display Temp_HP as a visually distinct value from Current_HP and Max_HP in the Combatant's HP display.
5. WHEN a user applies healing to a Combatant, THE Combat_Tracker_System SHALL not increase Temp_HP.

---

### Requirement 6: Death Saves

**User Story:** As a player, I want to track death saving throws for my character when they drop to 0 HP, so that the life-or-death outcome of unconscious rounds is accurately recorded.

#### Acceptance Criteria

1. WHEN a Player_Character Combatant's Current_HP reaches zero, THE Combat_Tracker_System SHALL display the Death_Save tracking interface for that Combatant, showing three success boxes and three failure boxes.
2. THE Combat_Tracker_System SHALL allow a user to record a Death_Save success or failure by toggling the corresponding box.
3. WHEN a Player_Character Combatant accumulates three Death_Save successes, THE Combat_Tracker_System SHALL mark the Combatant as stabilized and hide the Death_Save interface.
4. WHEN a Player_Character Combatant accumulates three Death_Save failures, THE Combat_Tracker_System SHALL mark the Combatant as dead and display a dead status indicator.
5. WHEN a stabilized Player_Character Combatant receives healing, THE Combat_Tracker_System SHALL clear the stabilized status and set Current_HP to the healed amount.
6. WHEN a Player_Character Combatant at zero Current_HP takes damage, THE Combat_Tracker_System SHALL record two Death_Save failures per the 5e rule for taking damage while unconscious.
7. WHEN a Player_Character Combatant at zero Current_HP takes a critical hit, THE Combat_Tracker_System SHALL record two Death_Save failures in addition to any already applied for that hit.
8. THE Combat_Tracker_System SHALL not display the Death_Save interface for Monster Combatants.

---

### Requirement 7: Damage Type Modifiers

**User Story:** As a DM, I want to configure damage resistances, immunities, and vulnerabilities for monsters, so that the tracker applies the correct damage after modifiers without requiring mental arithmetic.

#### Acceptance Criteria

1. THE Combat_Tracker_System SHALL allow a DM to assign Resistance, Immunity, or Vulnerability to one or more Damage_Types for any Combatant.
2. WHEN a user applies damage of a Damage_Type for which the Combatant has Resistance, THE Combat_Tracker_System SHALL halve the damage (rounded down) before applying it to the Combatant's HP.
3. WHEN a user applies damage of a Damage_Type for which the Combatant has Immunity, THE Combat_Tracker_System SHALL apply zero damage to the Combatant's HP.
4. WHEN a user applies damage of a Damage_Type for which the Combatant has Vulnerability, THE Combat_Tracker_System SHALL double the damage before applying it to the Combatant's HP.
5. WHEN a user applies damage with no Damage_Type specified, THE Combat_Tracker_System SHALL apply the full damage value with no modifier.
6. THE Combat_Tracker_System SHALL display a visual indicator on a Combatant's card for each assigned Resistance, Immunity, and Vulnerability.

---

### Requirement 8: Conditions

**User Story:** As a DM or player, I want to apply and remove status conditions to combatants during an encounter, so that ongoing effects are visible to all participants without relying on physical tokens or memory.

#### Acceptance Criteria

1. THE Combat_Tracker_System SHALL allow a user to apply any of the standard Conditions for the Combatant's Edition (D&D 5e 2014 or D&D 5.5e 2024) to any Combatant.
2. THE Combat_Tracker_System SHALL allow a user to remove an applied Condition from a Combatant.
3. WHEN Exhaustion is applied to a Combatant, THE Combat_Tracker_System SHALL track the exhaustion level and display the mechanical effects for the current level per the Combatant's Edition SRD.
4. THE Combat_Tracker_System SHALL display all active Conditions for a Combatant as visible icons or labels on the Combatant's card.
5. WHEN a Combatant's Current_HP is set to zero, THE Combat_Tracker_System SHALL automatically apply the Unconscious Condition to that Combatant.
6. WHEN a Combatant's Current_HP is restored above zero, THE Combat_Tracker_System SHALL automatically remove the Unconscious Condition from that Combatant.

---

### Requirement 9: Short Rest and Hit Die Recovery

**User Story:** As a player, I want to spend hit dice during a short rest to recover hit points, so that the tracker reflects rest-based healing accurately.

#### Acceptance Criteria

1. THE Combat_Tracker_System SHALL allow a user to initiate a short rest for one or more Player_Character Combatants in an Encounter.
2. WHEN a short rest is initiated for a Player_Character Combatant, THE Combat_Tracker_System SHALL display the available Hit_Die types and the current count of unspent Hit_Dice.
3. THE Combat_Tracker_System SHALL allow a user to spend one or more Hit_Dice during a short rest, adding the die result plus the character's Constitution modifier to Current_HP per the 5e SRD.
4. WHEN Hit_Dice are spent, THE Combat_Tracker_System SHALL decrement the unspent Hit_Die count accordingly.
5. WHEN a long rest is initiated for a Player_Character Combatant, THE Combat_Tracker_System SHALL apply rest recovery according to the Combatant's Edition: restore Current_HP to Max_HP, restore all Spell_Slots, clear all death save boxes, and restore Hit_Dice per the Edition's SRD long rest rules.
6. THE Combat_Tracker_System SHALL not allow a user to spend more Hit_Dice than the character has remaining.

---

### Requirement 10: Multi-User Encounter Sharing

**User Story:** As a DM, I want players to see their character's HP state in real time during an encounter, so that each player can monitor their own character without needing to ask the DM.

#### Acceptance Criteria

1. THE Combat_Tracker_System SHALL allow a DM to share an active Encounter with the Campaign's players using a shareable link or in-app invite.
2. WHEN a player joins a shared Encounter, THE Combat_Tracker_System SHALL display only the HP state of that player's own Player_Character by default.
3. THE Combat_Tracker_System SHALL allow a player to apply damage, healing, Temp_HP, and conditions to their own Player_Character within a shared Encounter.
4. WHEN any participant updates a Combatant's HP in a shared Encounter, THE Combat_Tracker_System SHALL reflect the updated value for all participants within 2 seconds.
5. THE Combat_Tracker_System SHALL allow the DM to configure whether monster HP values are visible to players in a shared Encounter.
6. WHEN a player is not authenticated, THE Combat_Tracker_System SHALL not allow that user to join a shared Encounter.

---

### Requirement 11: HP Display and Visual State

**User Story:** As a DM or player, I want to see each combatant's HP state at a glance with clear visual indicators, so that I can assess the battlefield situation instantly during fast-paced combat.

#### Acceptance Criteria

1. THE Combat_Tracker_System SHALL display each Combatant's Current_HP, Max_HP, and Temp_HP on the Combatant's card in the Encounter view.
2. THE Combat_Tracker_System SHALL render a HP bar for each Combatant that visually represents Current_HP as a proportion of Max_HP.
3. WHEN a Combatant's Current_HP falls to 50% or below Max_HP, THE Combat_Tracker_System SHALL display the HP bar in a visually distinct warning color.
4. WHEN a Combatant's Current_HP falls to 25% or below Max_HP, THE Combat_Tracker_System SHALL display the HP bar in a visually distinct critical color.
5. WHEN a Combatant's Current_HP reaches zero, THE Combat_Tracker_System SHALL display the Combatant's card in a visually distinct downed state.
6. WHEN a Combatant is marked as dead, THE Combat_Tracker_System SHALL display the Combatant's card in a visually distinct dead state.
7. THE Combat_Tracker_System SHALL be fully usable on screens with a minimum width of 320px (mobile) and scale appropriately up to desktop resolutions.
8. THE Combat_Tracker_System SHALL display all Encounter Combatants in a single scrollable view without requiring the user to navigate between tabs to see individual combatants.

---

### Requirement 12: Integration with Character Creation

**User Story:** As a player, I want my character's HP data to stay synchronized between the Character Sheet and the Combat Tracker, so that leveling up or editing my sheet is automatically reflected in combat tracking.

#### Acceptance Criteria

1. WHEN a Player_Character is added to an Encounter, THE Combat_Tracker_System SHALL read the character's name, Max_HP, current Hit_Dice totals, Constitution modifier, and Edition from the Character_Sheet via the Character Creation integration.
2. WHEN a Character_Sheet's Max_HP changes due to a level-up or manual edit, THE Combat_Tracker_System SHALL update the linked Combatant's Max_HP in all active Encounters where no manual override is in effect.
3. WHEN HP changes are made to a Player_Character Combatant within the Combat_Tracker_System, THE Combat_Tracker_System SHALL not modify the Current_HP value stored on the linked Character_Sheet.
4. WHEN a user views a Player_Character Combatant's card, THE Combat_Tracker_System SHALL provide a navigation link to that character's Character_Sheet.

---

### Requirement 13: Monster Stat Block Storage

**User Story:** As a DM, I want to store monster stat blocks within the Combat Tracker, so that I have immediate access to a monster's full mechanical profile during an encounter without leaving the app.

#### Acceptance Criteria

1. THE Combat_Tracker_System SHALL allow a DM to create a custom Monster Stat_Block by entering name, size, type, alignment, AC, HP, speed, ability scores, saving throw proficiencies, skill proficiencies, damage resistances, damage immunities, condition immunities, senses, languages, challenge rating, traits, actions, bonus actions, reactions, and legendary actions.
2. THE Combat_Tracker_System SHALL allow a DM to import a Monster Stat_Block from the D&D 5e SRD monster list by searching by name and selecting from the results.
3. WHEN a Monster Stat_Block is imported from the SRD, THE Combat_Tracker_System SHALL pre-populate all Stat_Block fields from the SRD data.
4. THE Combat_Tracker_System SHALL persist all stored Stat_Blocks to the server, associated with the DM's account and accessible across Campaigns.
5. THE Combat_Tracker_System SHALL allow a DM to edit any field of a stored Stat_Block after creation.
6. THE Combat_Tracker_System SHALL allow a DM to delete a stored Stat_Block after confirming the deletion in a modal dialog.
7. WHEN a DM adds a Monster Combatant to an Encounter, THE Combat_Tracker_System SHALL allow the DM to link the Combatant to an existing stored Stat_Block by searching and selecting from the DM's stored Stat_Blocks.
8. WHEN a Monster Combatant is linked to a Stat_Block, THE Combat_Tracker_System SHALL pre-populate the Combatant's Max_HP, damage resistances, damage immunities, and vulnerabilities from that Stat_Block.
9. THE Combat_Tracker_System SHALL allow a DM to duplicate a stored Stat_Block to use as the basis for a custom variant.

---

### Requirement 14: Monster Stat Block Popovers

**User Story:** As a DM, I want to see a monster's full stat block by hovering over its combatant card, so that I can reference AC, abilities, actions, and traits mid-combat without switching views.

#### Acceptance Criteria

1. WHEN a user hovers over or focuses a Monster Combatant's card that has a linked Stat_Block, THE Combat_Tracker_System SHALL display a Stat_Block_Popover showing the full Stat_Block content.
2. THE Stat_Block_Popover SHALL display the monster's name, size, type, alignment, AC, HP, speed, ability scores with modifiers, saving throws, skills, damage resistances, damage immunities, damage vulnerabilities, condition immunities, senses, languages, challenge rating, traits, actions, bonus actions, reactions, and legendary actions.
3. THE Stat_Block_Popover SHALL be positioned to remain fully visible within the viewport, repositioning automatically if it would otherwise overflow the screen edge.
4. WHEN a user moves the cursor away from a Monster Combatant's card or removes focus, THE Combat_Tracker_System SHALL dismiss the Stat_Block_Popover.
5. THE Stat_Block_Popover SHALL remain open when the user moves the cursor onto the popover itself, allowing the user to read or scroll its content.
6. WHEN a Monster Combatant has no linked Stat_Block, THE Combat_Tracker_System SHALL not display a Stat_Block_Popover for that Combatant.
7. THE Stat_Block_Popover SHALL be accessible via keyboard focus in addition to mouse hover, so that keyboard-only users can access stat block information.
8. THE Combat_Tracker_System SHALL render the Stat_Block_Popover in a styled layout consistent with the standard D&D stat block visual format.

---

### Requirement 15: D&D Beyond Linkability

**User Story:** As a DM, I want stat block popovers to include a direct link to the monster's D&D Beyond page, so that I can quickly access the full official entry for rulings, flavor text, or additional details.

#### Acceptance Criteria

1. THE Combat_Tracker_System SHALL allow a DM to store a DnD_Beyond_Link on any Monster Stat_Block, either entered manually or auto-populated when importing from the SRD.
2. WHEN a Monster Stat_Block is imported from the SRD, THE Combat_Tracker_System SHALL auto-populate the DnD_Beyond_Link using the pattern `https://www.dndbeyond.com/monsters/<slug>` derived from the monster's canonical name.
3. WHEN a Stat_Block_Popover is displayed for a Monster Combatant whose Stat_Block has a DnD_Beyond_Link, THE Combat_Tracker_System SHALL display a clearly labelled link to that URL within the popover.
4. THE DnD_Beyond_Link SHALL open in a new browser tab so that the user does not lose the current Encounter view.
5. WHEN a Monster Stat_Block has no DnD_Beyond_Link stored, THE Combat_Tracker_System SHALL not display a D&D Beyond link in the Stat_Block_Popover.
6. THE Combat_Tracker_System SHALL allow a DM to manually edit or remove the DnD_Beyond_Link on any stored Stat_Block.
7. THE DnD_Beyond_Link element in the Stat_Block_Popover SHALL be visually distinct and recognisable as an external link (e.g., with an external link icon).

---

### Requirement 16: Multi-Edition Support

**User Story:** As a DM or player, I want the Combat Tracker to respect the edition rules for each combatant, so that mixed-edition encounters work correctly when tracking characters from both D&D 5e (2014) and D&D 5.5e (2024).

#### Acceptance Criteria

1. THE Combat_Tracker_System SHALL store and display the Edition (D&D 5e 2014 or D&D 5.5e 2024) for each Combatant.
2. WHEN a Player_Character Combatant's Edition differs from another Combatant's Edition in the same Encounter, THE Combat_Tracker_System SHALL apply the correct Edition-specific rules to each Combatant independently.
3. WHEN applying Exhaustion to a Combatant, THE Combat_Tracker_System SHALL use the exhaustion mechanics defined in the Combatant's Edition (6 levels for D&D 5e 2014, or the revised exhaustion system for D&D 5.5e 2024).
4. WHEN processing Death_Saves for a Player_Character Combatant, THE Combat_Tracker_System SHALL apply the death save rules for the Combatant's Edition.
5. WHEN a long rest is applied to a Player_Character Combatant, THE Combat_Tracker_System SHALL restore Hit_Dice according to the Combatant's Edition (half the character's total Hit_Dice rounded down for D&D 5e 2014, or the revised Hit_Die recovery rules for D&D 5.5e 2024).
6. THE Combat_Tracker_System SHALL display the Edition for each Combatant on the Combatant's card as a subtle visual indicator or tooltip.
7. WHEN the Combatant's Edition affects the available Condition list, THE Combat_Tracker_System SHALL display only the Conditions defined in that Edition's SRD.

---

### Requirement 17: Access Control

**User Story:** As a DM, I want to control who can modify monster HP and encounter settings, so that players cannot accidentally or intentionally alter data they should not control.

#### Acceptance Criteria

1. THE Combat_Tracker_System SHALL restrict creation, deletion, and configuration of Encounters and Sessions to authenticated users with the DM role for that Campaign.
2. THE Combat_Tracker_System SHALL restrict modification of Monster Combatant HP, resistances, immunities, and vulnerabilities to the DM of the Encounter.
3. THE Combat_Tracker_System SHALL allow Players to modify the HP, conditions, Temp_HP, and death saves of their own Player_Character Combatants.
4. IF an unauthenticated user attempts to access or modify Encounter data, THEN THE Combat_Tracker_System SHALL reject the request and return an authorization error.
5. THE Combat_Tracker_System SHALL NOT restrict the number of active Sessions or Encounters a user can create.
6. THE Combat_Tracker_System SHALL restrict creation, editing, and deletion of stored Stat_Blocks to the DM account that owns them.
