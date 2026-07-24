# Requirements Document

## Introduction

This document covers the Initiative Tracker feature for the web-based D&D companion site. The feature enables Dungeon Masters and players to manage turn order during D&D 5e combat encounters by tracking initiative scores, managing the active turn, and providing a clear visual representation of combat flow.

The Initiative Tracker supports initiative rolling with custom modifiers, tie resolution, integration with the Character Creation feature to populate Dexterity modifiers automatically, and synchronization across multiple participants in shared encounters. The tracker provides round tracking, turn progression, and visual indicators to help the DM run encounters smoothly.

---

## Glossary

- **Initiative_Tracker**: The feature described in this document responsible for managing turn order during combat encounters.
- **Initiative_Score**: A numeric value determining turn order in combat, typically calculated as a d20 roll plus a Dexterity modifier.
- **Initiative_Modifier**: A numeric bonus or penalty applied to an initiative roll, typically derived from a combatant's Dexterity modifier.
- **Encounter**: A single combat event associated with a Session, containing one or more Combatants.
- **Combatant**: Any participant in an Encounter being tracked, either a Player_Character or a Monster.
- **Player_Character**: A Combatant linked to a Character_Sheet created via the Character Creation feature.
- **Monster**: A Combatant representing an enemy or NPC created by the DM.
- **Turn_Order**: The sequence of Combatants arranged by Initiative_Score from highest to lowest.
- **Active_Turn**: The current turn in the Turn_Order, indicating which Combatant is currently acting.
- **Round**: A complete cycle through all Combatants in the Turn_Order, starting with the highest Initiative_Score and ending with the lowest.
- **Round_Counter**: A numeric display showing which combat round is currently in progress, starting at 1.
- **Character_Sheet**: A Player_Character's data stored via the Character Creation feature, including Dexterity modifier and other stats.
- **DM**: Dungeon Master, the user who manages the Encounter and monster Combatants.
- **Player**: A user who controls one or more Player_Characters.
- **Initiative_Tracker_System**: The Initiative Tracker system described in this document.

---

## Requirements

### Requirement 1: Initiative Rolling and Entry

**User Story:** As a DM or player, I want to roll initiative for all combatants at the start of an encounter, so that turn order is established quickly and fairly.

#### Acceptance Criteria

1. WHEN an Encounter begins, THE Initiative_Tracker_System SHALL allow a user to roll initiative for each Combatant by simulating a d20 roll and adding the Combatant's Initiative_Modifier.
2. THE Initiative_Tracker_System SHALL allow a user to manually enter an Initiative_Score for any Combatant.
3. WHEN a Player_Character is added to an Encounter, THE Initiative_Tracker_System SHALL retrieve the Dexterity modifier from the linked Character_Sheet and set it as the Initiative_Modifier.
4. THE Initiative_Tracker_System SHALL allow a DM to manually set the Initiative_Modifier for any Monster Combatant.
5. THE Initiative_Tracker_System SHALL display each Combatant's Initiative_Modifier clearly on the initiative entry interface.
6. THE Initiative_Tracker_System SHALL allow a user to roll initiative for multiple Combatants simultaneously using a batch roll action.
7. WHEN a Combatant's Initiative_Score is set or modified, THE Initiative_Tracker_System SHALL recalculate the Turn_Order and update the display within 1 second.

---

### Requirement 2: Turn Order Display and Management

**User Story:** As a DM, I want to see all combatants arranged by initiative score with clear visual indicators of the current turn, so that I can manage combat flow without confusion.

#### Acceptance Criteria

1. THE Initiative_Tracker_System SHALL display all Combatants in the Turn_Order sorted by Initiative_Score from highest to lowest.
2. THE Initiative_Tracker_System SHALL highlight the Combatant whose Active_Turn it is with a visually distinct active turn indicator.
3. WHEN two or more Combatants have the same Initiative_Score, THE Initiative_Tracker_System SHALL order them by the higher Initiative_Modifier first.
4. WHEN two or more Combatants have the same Initiative_Score and the same Initiative_Modifier, THE Initiative_Tracker_System SHALL allow the DM to manually reorder those tied Combatants.
5. THE Initiative_Tracker_System SHALL allow a DM to manually reorder any Combatants in the Turn_Order at any time during the Encounter.
6. THE Initiative_Tracker_System SHALL display the Round_Counter prominently in the Encounter view.
7. THE Initiative_Tracker_System SHALL allow a user to view the Turn_Order on screens with a minimum width of 320px (mobile) and scale appropriately up to desktop resolutions.

---

### Requirement 3: Turn Progression and Round Tracking

**User Story:** As a DM, I want to advance to the next turn with a single action, so that combat flows smoothly without requiring manual tracking of who goes next.

#### Acceptance Criteria

1. THE Initiative_Tracker_System SHALL provide a "Next Turn" action that advances the Active_Turn to the next Combatant in the Turn_Order.
2. WHEN the Active_Turn reaches the last Combatant in the Turn_Order and the "Next Turn" action is triggered, THE Initiative_Tracker_System SHALL increment the Round_Counter by 1 and set the Active_Turn to the first Combatant in the Turn_Order.
3. THE Initiative_Tracker_System SHALL allow a DM to set the Active_Turn to any specific Combatant in the Turn_Order at any time.
4. THE Initiative_Tracker_System SHALL allow a DM to manually set the Round_Counter to any positive integer value.
5. WHEN the Encounter begins, THE Initiative_Tracker_System SHALL set the Round_Counter to 1 and the Active_Turn to the Combatant with the highest Initiative_Score.

---

### Requirement 4: Delayed and Readied Actions

**User Story:** As a DM, I want to move a combatant's position in the turn order when they delay or ready an action, so that the initiative tracker reflects tactical decisions made during combat.

#### Acceptance Criteria

1. THE Initiative_Tracker_System SHALL allow a DM to mark a Combatant as delaying their turn during that Combatant's Active_Turn.
2. WHEN a Combatant is marked as delaying, THE Initiative_Tracker_System SHALL remove that Combatant from the current Turn_Order position and allow the DM to re-insert the Combatant at any later position in the Turn_Order.
3. WHEN a Combatant re-enters the Turn_Order after delaying, THE Initiative_Tracker_System SHALL set that Combatant's Initiative_Score to match their new position in the Turn_Order.
4. THE Initiative_Tracker_System SHALL display a visual indicator on a Combatant's card when that Combatant is currently delaying their turn.
5. WHEN a Combatant delays past the end of the round, THE Initiative_Tracker_System SHALL allow the Combatant to act in the next round at any position in the Turn_Order chosen by the DM.

---

### Requirement 5: Adding and Removing Combatants Mid-Encounter

**User Story:** As a DM, I want to add or remove combatants during an ongoing encounter, so that reinforcements, fleeing enemies, or late arrivals are handled correctly without restarting initiative.

#### Acceptance Criteria

1. THE Initiative_Tracker_System SHALL allow a DM to add a new Combatant to an Encounter that has already started.
2. WHEN a new Combatant is added to an active Encounter, THE Initiative_Tracker_System SHALL prompt the DM to roll or enter an Initiative_Score for that Combatant.
3. WHEN a new Combatant's Initiative_Score is set, THE Initiative_Tracker_System SHALL insert the Combatant into the Turn_Order at the correct position based on Initiative_Score.
4. WHEN a new Combatant is inserted into the Turn_Order at a position that has already passed in the current Round, THE Initiative_Tracker_System SHALL not grant that Combatant an Active_Turn until the next Round begins.
5. THE Initiative_Tracker_System SHALL allow a DM to remove a Combatant from the Turn_Order at any time.
6. WHEN the Combatant currently taking the Active_Turn is removed, THE Initiative_Tracker_System SHALL automatically advance the Active_Turn to the next Combatant in the Turn_Order.

---

### Requirement 6: Integration with Character Creation Feature

**User Story:** As a player, I want my character's Dexterity modifier to automatically populate when rolling initiative, so that I don't need to manually look up or enter the modifier every encounter.

#### Acceptance Criteria

1. WHEN a Player_Character is added to an Encounter, THE Initiative_Tracker_System SHALL retrieve the character's name and Dexterity modifier from the linked Character_Sheet via the Character Creation integration.
2. WHEN a Character_Sheet's Dexterity modifier changes due to a level-up or manual edit, THE Initiative_Tracker_System SHALL update the linked Combatant's Initiative_Modifier in all active Encounters immediately.
3. WHEN a Player_Character's Initiative_Modifier is updated from the Character_Sheet, THE Initiative_Tracker_System SHALL not automatically recalculate the Initiative_Score if initiative has already been rolled for that Encounter.
4. THE Initiative_Tracker_System SHALL allow a DM to manually override the Initiative_Modifier for any Player_Character in a specific Encounter due to temporary effects or conditions.
5. WHEN a manual Initiative_Modifier override is applied to a Player_Character, THE Initiative_Tracker_System SHALL use the overridden value for that Encounter without modifying the linked Character_Sheet.

---

### Requirement 7: Multi-User Encounter Synchronization

**User Story:** As a player in a shared encounter, I want to see the current turn order and active turn in real time, so that I know when my turn is coming and can prepare my actions.

#### Acceptance Criteria

1. WHEN the DM shares an Encounter with the Campaign's players, THE Initiative_Tracker_System SHALL display the Turn_Order, Active_Turn indicator, and Round_Counter to all participants in real time.
2. WHEN the DM advances the Active_Turn, THE Initiative_Tracker_System SHALL update the Active_Turn indicator for all participants within 2 seconds.
3. WHEN a Combatant's Initiative_Score changes or a Combatant is added or removed, THE Initiative_Tracker_System SHALL update the Turn_Order for all participants within 2 seconds.
4. THE Initiative_Tracker_System SHALL allow the DM to configure whether Monster Combatants are visible to players in the Turn_Order.
5. WHEN Monster visibility is disabled, THE Initiative_Tracker_System SHALL display only Player_Character Combatants in the Turn_Order for players, while displaying all Combatants for the DM.

---

### Requirement 8: Initiative Re-Roll and Reset

**User Story:** As a DM, I want to re-roll initiative or reset the tracker for a new encounter, so that I can quickly transition from one combat to the next without losing the current encounter's combatants.

#### Acceptance Criteria

1. THE Initiative_Tracker_System SHALL allow a DM to re-roll initiative for all Combatants in an active Encounter with a single action.
2. WHEN initiative is re-rolled, THE Initiative_Tracker_System SHALL simulate a d20 roll for each Combatant, add the Initiative_Modifier, recalculate the Turn_Order, reset the Round_Counter to 1, and set the Active_Turn to the first Combatant.
3. THE Initiative_Tracker_System SHALL allow a DM to re-roll initiative for a single Combatant without affecting other Combatants.
4. THE Initiative_Tracker_System SHALL allow a DM to reset the Initiative_Tracker for an Encounter, clearing all Initiative_Scores and the Turn_Order while retaining the list of Combatants.
5. WHEN a reset is triggered, THE Initiative_Tracker_System SHALL prompt the DM to confirm the action in a modal dialog before clearing initiative data.

---

### Requirement 9: Initiative Persistence and Encounter State

**User Story:** As a DM, I want initiative scores and turn order to be saved when I leave an encounter, so that I can resume combat later without needing to re-roll or reconstruct the turn order.

#### Acceptance Criteria

1. THE Initiative_Tracker_System SHALL persist all Initiative_Scores, the Turn_Order, the Active_Turn, and the Round_Counter to the server when any change is made to the initiative state.
2. WHEN a user reloads the browser or logs out and back in, THE Initiative_Tracker_System SHALL restore the Initiative_Scores, Turn_Order, Active_Turn, and Round_Counter exactly as they were when last saved.
3. WHEN an Encounter is ended, THE Initiative_Tracker_System SHALL preserve the final initiative state as a historical record.
4. THE Initiative_Tracker_System SHALL allow a user to view the final Turn_Order and Round_Counter for completed Encounters.

---

### Requirement 10: Visual State and Indicators

**User Story:** As a DM or player, I want clear visual indicators for the active turn, upcoming turns, and round number, so that I can quickly understand the current combat state at a glance.

#### Acceptance Criteria

1. THE Initiative_Tracker_System SHALL display the Active_Turn with a visually distinct active turn indicator such as highlighting, border, or icon.
2. THE Initiative_Tracker_System SHALL display the Round_Counter in a prominent, fixed position visible at all times during the Encounter.
3. THE Initiative_Tracker_System SHALL display each Combatant's Initiative_Score and Initiative_Modifier clearly on the Combatant's card in the Turn_Order view.
4. WHEN a Combatant is delaying their turn, THE Initiative_Tracker_System SHALL display a visual indicator on that Combatant's card.
5. THE Initiative_Tracker_System SHALL display all Combatants in the Turn_Order in a single scrollable view without requiring tab navigation to see individual combatants.
6. WHEN the Active_Turn changes, THE Initiative_Tracker_System SHALL provide a subtle visual or audio cue to indicate the transition.

---

### Requirement 11: Access Control and Permissions

**User Story:** As a DM, I want to control who can modify initiative scores and advance turns, so that players cannot accidentally or intentionally disrupt the turn order.

#### Acceptance Criteria

1. THE Initiative_Tracker_System SHALL restrict the ability to add, remove, or reorder Combatants in the Turn_Order to authenticated users with the DM role for that Campaign.
2. THE Initiative_Tracker_System SHALL restrict the ability to advance the Active_Turn, modify the Round_Counter, or reset initiative to the DM of the Encounter.
3. THE Initiative_Tracker_System SHALL allow Players to roll initiative for their own Player_Character Combatants in a shared Encounter.
4. THE Initiative_Tracker_System SHALL allow the DM to configure whether Players can roll initiative for their own characters or whether the DM rolls for all Combatants.
5. IF an unauthenticated user attempts to access or modify Initiative_Tracker data, THEN THE Initiative_Tracker_System SHALL reject the request and return an authorization error.

---

### Requirement 12: Integration with HP Tracker

**User Story:** As a DM, I want the Initiative Tracker and HP Tracker to share the same Encounter and Combatant data, so that I have a unified view of combat state without duplicating combatant entries.

#### Acceptance Criteria

1. WHEN an Encounter is created in the Initiative_Tracker_System, THE Initiative_Tracker_System SHALL share the Encounter ID and Combatant list with the HP_Tracker feature.
2. WHEN a Combatant is added to or removed from an Encounter via the Initiative_Tracker_System, THE Initiative_Tracker_System SHALL synchronize that change with the HP_Tracker feature within 2 seconds.
3. WHEN a Combatant's name is changed in the HP_Tracker feature, THE Initiative_Tracker_System SHALL reflect the updated name in the Turn_Order within 2 seconds.
4. THE Initiative_Tracker_System SHALL display a navigation control allowing the user to switch between the Initiative_Tracker view and the HP_Tracker view for the same Encounter without losing context.
5. THE Initiative_Tracker_System SHALL display a Combatant's Current_HP from the HP_Tracker feature on the Combatant's card in the Turn_Order view as a read-only value.

---

## Notes

### Parser and Serializer Requirements

This feature does not require custom parsers or serializers beyond standard JSON serialization for API communication with the backend.

### Testability Considerations

- **Initiative rolling**: Property-based testing is appropriate for verifying d20 simulation, modifier arithmetic, and tie-breaking logic across a wide range of inputs.
- **Turn order calculation**: Property-based testing can verify sort stability, tie resolution, and reordering invariants.
- **State persistence**: Property-based testing can verify round-trip serialization and deserialization of initiative state.
- **Real-time synchronization**: Integration testing with 2-3 concurrent clients is sufficient to verify WebSocket or polling behavior; 100 iterations would not find significantly more bugs than 3.
