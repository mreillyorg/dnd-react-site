---
inclusion: always
---

# Product

A web-based Dungeons & Dragons companion site. The product helps D&D players and Dungeon Masters manage their campaigns, characters, and game sessions.

Core use cases (to be refined):
- User registration and management
- Dark Mode / Light Mode sticky selection per user
- Character creation and management
- Combat Tracker for different sessions and combats
  - HP tracking per combatant (players, monsters, NPCs)
  - Monster stat block storage (custom and imported)
  - Mouseover popover showing full stat block for any combatant
  - D&D Beyond linkability: stat block popovers include a direct link to the monster's D&D Beyond page
- Initiative Tracker
- Magic Item and Consumables tracker
- Campaign tracking and notes
- Reference lookups (rules, spells, monsters, items)
- Session scheduling and party coordination
- Exports for Adventurer's League DM logs
- Subscription model
- Data Storage & APIs
  - GraphQL API as the data access layer for all features
  - Prisma ORM for schema management, typed client generation, and migrations
  - SQLite in Rollback Journal Mode as the default persistence layer (zero-infrastructure local setup)
  - Serialised in-process write queue to prevent SQLite write contention under concurrent GraphQL load
  - MySQL identified as an optional future provider to investigate for production scalability; Prisma schema authored to remain provider-compatible

The target audience is tabletop RPG players ranging from beginners to experienced groups.
