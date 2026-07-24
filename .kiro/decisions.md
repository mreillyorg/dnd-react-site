# Project Decision & Audit Log

A chronological record of significant product and technical decisions made during the life of this project. Each entry captures what changed, why, and any relevant context.

---

## 2026-07-24 (~02:36) — Project Initialisation

### Project scaffolded with Vite + React + TypeScript
- **What**: Created the project using Vite with the React + TypeScript template. Core files created: `package.json`, `vite.config.ts`, `tsconfig.json`, `src/main.tsx`, `src/App.tsx`, `index.html`.
- **Why**: Vite was chosen as the build tool for fast HMR and native TypeScript support. React + TypeScript for a type-safe component-based frontend.

### Steering documents created
- **What**: Created initial steering docs at `.kiro/steering/product.md`, `tech.md`, and `structure.md` to define the product vision, tech stack, and project layout conventions.
- **Why**: Establishes shared context for all subsequent development and AI-assisted work.

### Product use cases defined
- **What**: Defined the initial set of core use cases in `product.md`: user registration, dark/light mode, character creation, HP Tracker, Initiative Tracker, magic items, campaign tracking, reference lookups, session scheduling, AL exports, and subscription model.
- **Why**: Provides the product scope and backlog for the companion site.

---

## 2026-07-24 (~02:49) — Test Infrastructure

### Vitest + React Testing Library configured
- **What**: Added test setup: `src/test/setup.ts` with `@testing-library/jest-dom`, Vitest configured in `vite.config.ts` with jsdom environment and globals. `package.json` updated with test scripts (`test`, `test:watch`, `test:coverage`).
- **Why**: Establishes the unit testing baseline per the tech stack decision. Tests are co-located with source files. RTL is used over Enzyme for behavior-focused testing.

---

## 2026-07-24 (~02:53) — Kiro Agents

### Kiro agents folder initialised
- **What**: `.kiro/agents/` folder created.
- **Why**: Enables custom agent configurations for AI-assisted development workflows within this project.

---

## 2026-07-24 (~02:54–03:10) — Character Creation Spec

### Character Creation and Management requirements written
- **What**: Created `.kiro/specs/character-creation/requirements.md` covering 16 requirements: character creation wizard, character sheet display, ability scores and derived statistics, levelling up, spell management, inventory/equipment, HP and condition tracking during play, character notes, character list management, integration with other features, data validation and rules enforcement, multi-edition support (5e 2014 and 5.5e 2024), DnDBeyond character import, DnDBeyond linking, DnDBeyond sync, and PDF export.
- **Why**: Character creation is the foundational player-facing feature that nearly all other features depend on (HP Tracker, Initiative Tracker, campaign tools).
- **Key decisions**:
  - Supports both D&D 5e (2014) and D&D 5.5e (2024) editions per combatant.
  - DnDBeyond import and sync included to reduce data entry friction for existing players.
  - PDF export targets the official Wizards of the Coast character sheet layout.

---

## 2026-07-24 (~02:57–03:06) — HP Tracker Spec

### HP Tracker requirements written (later renamed to Combat Tracker)
- **What**: Created `.kiro/specs/hp-tracker/requirements.md` covering 15 requirements: encounter management, session management, combatant management, damage and healing, temporary HP, death saves, damage type modifiers (resistance/immunity/vulnerability), conditions, short rest and hit die recovery, multi-user encounter sharing, HP display and visual state, Character Creation integration, multi-edition support, and access control.
- **Why**: HP tracking is a high-frequency DM task during every session. Tight integration with Character Creation avoids duplication.
- **Key decisions**:
  - Supports multiple concurrent encounters per session.
  - Damage type modifiers are applied automatically by the tracker.
  - Server-persisted so state survives browser reloads.

---

## 2026-07-24 (~02:59–03:00) — Initiative Tracker Spec

### Initiative Tracker requirements written
- **What**: Created `.kiro/specs/initiative-tracker/requirements.md` covering 12 requirements: initiative rolling and entry, turn order display and management, turn progression and round tracking, delayed/readied actions, adding/removing combatants mid-encounter, Character Creation integration, multi-user synchronisation, initiative re-roll and reset, persistence and encounter state, visual state and indicators, access control, and HP Tracker integration.
- **Why**: Initiative tracking is an every-session DM need. Integrates with both Character Creation (Dexterity modifier) and HP Tracker (shared encounter/combatant data).
- **Key decisions**:
  - Initiative Tracker and HP Tracker share the same Encounter and Combatant model.
  - Real-time sync to all participants within 2 seconds.
  - Supports delayed and readied actions by allowing mid-round reordering.

---

## 2026-07-24 (~03:14–03:34) — User Registration and Theme Selection Specs

### User Registration and Management requirements written
- **What**: Created `.kiro/specs/user-registration/requirements.md` covering 8 requirements: OAuth account creation and authentication, email verification, session management, profile management, user security levels and permissions, multi-channel user messaging (in-app, Discord, email), account security features, and account deletion/data privacy.
- **Why**: Authentication and user management is a prerequisite for all personalized features. OAuth-only avoids the complexity and liability of password management.
- **Key decisions**:
  - OAuth-only authentication via Google, Discord, GitHub, Facebook, Apple, and Microsoft.
  - Four security levels: Admin, DM, Player, Spectator.
  - Multi-channel messaging supports Discord webhook integration for party coordination.
  - Full GDPR-style account deletion with 7-day grace period.

### Theme Selection requirements written
- **What**: Created `.kiro/specs/theme-selection/requirements.md` covering 10 requirements: toggle interface, persistence for unauthenticated users (localStorage), persistence for authenticated users (profile storage), system theme detection, theme migration on login, application scope, accessibility (WCAG 2.1 AA), performance (no FOUC), error handling, and validation.
- **Why**: Dark/light mode is a basic accessibility and usability expectation. Per-user persistence prevents the setting from resetting between sessions.
- **Key decisions**:
  - Defaults to OS/browser `prefers-color-scheme` on first visit.
  - On login, profile storage preference wins over localStorage.
  - Theme applied before first contentful paint to prevent flash of wrong theme.

---

## 2026-07-24

### Renamed HP Tracker to Combat Tracker
- **What**: The "HP Tracker" use case was renamed to "Combat Tracker" across `product.md` and the spec at `.kiro/specs/hp-tracker/requirements.md`.
- **Why**: The feature scope is broader than just hit point tracking. It encompasses full combat management including monster stat blocks, popovers, and D&D Beyond linkability.
- **Impact**: Spec terminology updated throughout (`HP_Tracker_System` → `Combat_Tracker_System`). Spec folder name `hp-tracker` retained for continuity.

### Expanded Combat Tracker requirements
- **What**: Added three new requirements to `.kiro/specs/hp-tracker/requirements.md`:
  - Requirement 13: Monster Stat Block Storage (custom creation, SRD import, linking to combatants)
  - Requirement 14: Monster Stat Block Popovers (hover/focus trigger, full stat block display, keyboard accessible, viewport-aware positioning)
  - Requirement 15: D&D Beyond Linkability (auto-populated slug on SRD import, link in popover, opens in new tab)
- **Why**: Product direction requires DMs to have full monster stat block access mid-combat without leaving the app, with direct links to D&D Beyond for official rulings.

### Added Data Storage & APIs use case
- **What**: Added "Data Storage & APIs" as a new use case in `product.md` and created `.kiro/specs/data-storage-api/requirements.md`.
- **Why**: The persistence and API layer is a foundational cross-cutting concern that all other features depend on. Making it an explicit use case ensures it is designed and specced with the same rigour as user-facing features.

### Adopted GraphQL + Prisma ORM for the API and data layer
- **What**: The Data Storage & APIs spec and `tech.md` were updated to specify:
  - GraphQL as the sole API layer (no REST endpoints for application data)
  - Prisma ORM for schema management, typed client generation, and migrations
  - SQLite in Rollback Journal Mode as the default database provider
  - A serialised in-process write queue for SQLite to prevent write contention under concurrent GraphQL load
  - MySQL identified as an optional future provider; Prisma schema kept provider-compatible
- **Why**: GraphQL gives clients precise data fetching and a self-documenting schema. Prisma provides type safety, migration management, and provider portability. SQLite keeps local development zero-infrastructure. The write queue addresses SQLite's single-writer constraint without requiring WAL mode.
- **Impact**: `tech.md` updated with a Backend Data Layer section. `product.md` updated with the full Data Storage & APIs breakdown. Write queue is bypassed automatically when MySQL is the active provider.

### Removed stale scaffolding notices from steering docs
- **What**: Removed "This project has not been scaffolded yet" warnings from `structure.md` and `tech.md`. Updated headings and language to reflect the project's current state.
- **Why**: The project already has a working Vite/React/TypeScript scaffold, test setup, and five specs written. The notices were misleading.

### Fixed typo in Initiative Tracker use case
- **What**: Corrected "Iniative Tracker" to "Initiative Tracker" in `product.md`.
- **Why**: Typo.
