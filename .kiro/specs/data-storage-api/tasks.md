# Implementation Plan: Data Storage & APIs

## Overview

Stand up the backend data layer: Prisma schema + migrations, the serialised Operation_Queue for SQLite write safety, the Apollo Server 4 / Express GraphQL endpoint, a service layer that owns transaction boundaries, structured error handling, the `/health` endpoint, and the test infrastructure (Vitest + fast-check) that validates all six correctness properties.

The implementation is sequenced so that each step is independently buildable and testable before the next layer is added.

---

## Tasks

- [-] 1. Backend project structure and environment configuration
  - Create the `server/` directory tree: `server/app.ts`, `server/db/`, `server/graphql/schema/`, `server/graphql/resolvers/`, `server/services/`, `server/errors/`, `server/config.ts`
  - Install backend dependencies: `@apollo/server`, `express`, `graphql`, `@graphql-tools/schema`, `@prisma/client`, `prisma`, `dotenv`, `vitest`, `@vitest/ui`, `fast-check` (all testing deps)
  - Create `.env.example` listing all required and optional environment variables (`DATABASE_URL`, `DB_QUEUE_MAX_DEPTH`, `DB_QUEUE_WARN_MS`, `GRAPHQL_INTROSPECTION`, `NODE_ENV`)
  - Create `.env` for local development with `DATABASE_URL=file:./dev.db` and `DATABASE_PROVIDER=sqlite`
  - Create `.env.mysql.example` showing the MySQL `DATABASE_URL` format and MySQL-specific config
  - Add `server` build script to `package.json` (e.g., `tsc -p tsconfig.server.json`)
  - Add test scripts to `package.json`: `"test": "vitest"`, `"test:run": "vitest run"`, `"test:coverage": "vitest run --coverage"`
  - Add a `tsconfig.server.json` that targets Node.js (CommonJS or ESM) and covers the `server/` directory
  - Configure Vitest to require minimum 80% coverage on lines, functions, branches, and statements
  - _Requirements: 8.1, 8.2, 8.3_
  - **TESTING REQUIRED: This task includes test infrastructure setup - all subsequent tasks must include tests**

- [ ] 2. Prisma schema and initial migration
  - [ ] 2.1 Write `prisma/schema.prisma` with all domain models
    - Add the `generator client` block and `datasource db` block reading `DATABASE_PROVIDER` and `DATABASE_URL` from env
    - Define all models: `User`, `Character`, `Campaign`, `Session`, `Encounter`, `Combatant`, `StatBlock`, `Inventory`, `Item`, `ItemSlot` exactly as specified in the design, using only SQLite + MySQL compatible field types (no JSON, no enums — use `String` for enum-like fields)
    - Verify all relations use explicit `@relation` annotations and all foreign keys reference valid `@id` fields
    - _Requirements: 2.1, 2.2, 2.3, 3.1, 5.1_
  - [ ] 2.2 Write unit test for schema provider-compatibility (**REQUIRED**)
    - Assert that no model uses a SQLite-only or MySQL-only field type
    - Assert that `DATABASE_PROVIDER` and `DATABASE_URL` are read from environment, not hard-coded
    - **Test must pass before moving to 2.3**
    - _Requirements: 2.3, 5.1_
  - [ ] 2.3 Generate the initial Prisma migration
    - Run `prisma migrate dev --name init` to produce `prisma/migrations/TIMESTAMP_init/migration.sql`
    - Commit the migration file; add a note that migration files must never be manually edited
    - Run `prisma generate` to produce the typed `PrismaClient`
    - Add `prisma generate` to the `build` script in `package.json`
    - **Cannot proceed without passing test from 2.2**
    - _Requirements: 2.2, 2.6, 2.7_

- [ ] 3. PrismaClient singleton and SQLite PRAGMA initialisation
  - [ ] 3.1 Implement `server/db/prisma.ts`
    - Export a single `PrismaClient` instance with `log: ['error', 'warn']`
    - After `$connect()`, apply `PRAGMA foreign_keys = ON` and `PRAGMA synchronous = FULL` via `$executeRawUnsafe` when `DATABASE_URL` starts with `file:`
    - Keep the PRAGMA block a no-op when `DATABASE_URL` is a MySQL connection string
    - _Requirements: 3.3, 3.4_
  - [ ] 3.2 Write unit tests for PrismaClient singleton (**REQUIRED**)
    - Test that `PRAGMA foreign_keys = ON` is called when `DATABASE_URL` starts with `file:`
    - Test that no PRAGMA is applied when `DATABASE_URL` is a MySQL-style connection string
    - **Test must pass before moving to next task**
    - _Requirements: 3.3_

- [ ] 4. Configuration loader with fail-fast validation
  - [ ] 4.1 Implement `server/config.ts`
    - Read and validate all env vars: `DATABASE_URL` (required — process exits with code 1 if missing), `DATABASE_PROVIDER` (defaults `sqlite`), `DB_QUEUE_MAX_DEPTH` (default `100`), `DB_QUEUE_WARN_MS` (default `500`), `GRAPHQL_INTROSPECTION` (default `true` in dev, `false` in prod), `NODE_ENV`
    - Export a frozen `config` object with typed fields; throw a clear error message for missing required vars
    - _Requirements: 8.1, 8.2, 8.4_
  - [ ] 4.2 Write unit tests for config loader (**REQUIRED**)
    - Test fail-fast on missing `DATABASE_URL`
    - Test correct defaults for all optional vars
    - Test `GRAPHQL_INTROSPECTION` defaulting based on `NODE_ENV`
    - **All tests must pass before moving to next task**
    - _Requirements: 8.4, 8.2_

- [ ] 5. Operation_Queue (serial FIFO write queue)
  - [ ] 5.1 Implement `server/db/operationQueue.ts` — serial implementation
    - Define the `OperationQueue` interface with `enqueue<T>()`, `drain()`, and `pendingCount`
    - Define `QueueFullError` with `code: 'QUEUE_FULL'`
    - Implement `SerialOperationQueue`: tail-chaining promise pattern, depth tracking, queue-full rejection, per-operation timing with debug log and warn-threshold log
    - Export a factory `createOperationQueue(maxDepth, warnMs)` that returns the serial implementation
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_
  - [ ] 5.2 Implement passthrough queue for MySQL
    - Add a `PassthroughOperationQueue` class where `enqueue(fn)` calls `fn()` directly, `drain()` resolves immediately, and `pendingCount` is always 0
    - Export `createQueue(config)` that returns `SerialOperationQueue` for SQLite and `PassthroughOperationQueue` for MySQL
    - _Requirements: 4.6_
  - [ ] 5.3 Write property test for Operation_Queue serialisation order (Property 3) (**REQUIRED**)
    - **Property 3: Operation_Queue serialises writes in FIFO order under SQLite**
    - Generate arrays of 2–20 async operations, submit concurrently, assert no two overlap and order matches submission
    - **This property test MUST pass before proceeding**
    - **Validates: Requirements 4.1**
  - [ ] 5.4 Write property test for Operation_Queue queue-full rejection (Property 4) (**REQUIRED**)
    - **Property 4: Operation_Queue rejects operations when at capacity**
    - Generate `DB_QUEUE_MAX_DEPTH` values 1–50, fill queue with never-resolving stubs, assert next `enqueue()` rejects with `code === 'QUEUE_FULL'`
    - **This property test MUST pass before proceeding**
    - **Validates: Requirements 4.3, 4.4**
  - [ ] 5.5 Write unit tests for Operation_Queue (**REQUIRED**)
    - Test `drain()` resolves after all queued operations complete
    - Test passthrough mode: operations execute immediately, `pendingCount` stays 0
    - Test debug log emitted per operation
    - Test warn log when wait time exceeds `DB_QUEUE_WARN_MS`
    - **All tests must pass before moving to next task**
    - _Requirements: 4.2, 4.5, 4.6, 4.7_

- [ ] 6. Checkpoint — queue and config foundation
  - **GATE: All tests from tasks 1-5 must pass before proceeding**
  - Run `npm run test:run` and verify all tests pass
  - Check test coverage meets 80% minimum threshold
  - Ensure all tests pass (config, PrismaClient, OperationQueue). Ask the user if questions arise.

- [ ] 7. Error handling module
  - [ ] 7.1 Implement `server/errors/mapPrismaError.ts`
    - Map `PrismaClientKnownRequestError` codes (P2000, P2001, P2002, P2003, P2007, P2025, P1001) to domain codes (`VALIDATION_ERROR`, `NOT_FOUND`, `CONFLICT`, `FOREIGN_KEY_VIOLATION`, `DATABASE_UNAVAILABLE`)
    - Wrap unknown/panic errors: log full detail internally, return a sanitised `INTERNAL_SERVER_ERROR` with no Prisma internals
    - _Requirements: 7.1, 7.2_
  - [ ] 7.2 Implement `server/errors/formatGraphQLError.ts`
    - Apollo `formatError` plugin that ensures every `GraphQLError` in the response has a non-empty `extensions.code`
    - Strip any remaining Prisma-internal content (model names, raw SQL, Prisma error codes) from the `message` field before sending to client
    - _Requirements: 1.6, 7.3_
  - [ ] 7.3 Write property test for error extensions.code (Property 1) (**REQUIRED**)
    - **Property 1: All GraphQL errors contain an extensions.code field**
    - Generate arbitrary Prisma error instances (varying codes, messages), feed through `mapPrismaError()` and `formatGraphQLError()`, assert every result has a non-empty `extensions.code` and no Prisma-internal content
    - **This property test MUST pass before proceeding**
    - **Validates: Requirements 1.6, 7.1, 7.3**
  - [ ] 7.4 Write unit tests for error mapping (**REQUIRED**)
    - Test each Prisma code maps to the expected domain code
    - Test unknown error returns `INTERNAL_SERVER_ERROR` and does not leak internals
    - Test `formatGraphQLError` passes through non-Prisma errors with their original code
    - **All tests must pass before moving to next task**
    - _Requirements: 7.1, 7.2, 7.3_

- [ ] 8. GraphQL schema (SDL) and context builder
  - [ ] 8.1 Write SDL type definitions in `server/graphql/schema/`
    - Create one `.graphql` file per domain: `user.graphql`, `character.graphql`, `campaign.graphql`, `session.graphql`, `encounter.graphql`, `combatant.graphql`, `statBlock.graphql`, `item.graphql`
    - Define types, input types, queries (read operations), and mutations (write operations) for every domain entity listed in Requirement 1.2
    - Add a `base.graphql` with the root `Query` and `Mutation` types
    - _Requirements: 1.1, 1.2, 1.8_
  - [ ] 8.2 Implement `server/graphql/context.ts`
    - Build `GraphQLContext` containing `prisma: PrismaClient`, `queue: OperationQueue`, and `currentUser: AuthUser | null`
    - Extract the auth token from the `Authorization` header; set `currentUser` to the resolved user or `null` if absent/invalid
    - _Requirements: 1.7_
  - [ ] 8.3 Assemble schema with `makeExecutableSchema` in `server/graphql/schema/index.ts`
    - Import all SDL files, import all resolver maps, call `makeExecutableSchema({ typeDefs, resolvers })`
    - Export the assembled `schema`
    - **Write unit tests verifying schema loads without errors and includes all expected types**
    - _Requirements: 1.1_

- [ ] 9. Service layer (transaction boundaries)
  - [ ] 9.1 Implement service functions for User and Character in `server/services/`
    - `userService.ts`: `createUser`, `getUserById`, `getUserByEmail`; writes go through `ctx.queue.enqueue(() => ctx.prisma.$transaction(...))`
    - `characterService.ts`: `createCharacter` (character + default inventory in one transaction), `getCharacterById`, `listCharactersByUser`, `updateCharacter`, `deleteCharacter`
    - **Write unit tests for each service function using mocked Prisma client**
    - _Requirements: 2.8, 6.1, 6.2, 6.3, 6.4_
  - [ ] 9.2 Implement service functions for Campaign, Session, and Encounter
    - `campaignService.ts`: `createCampaign`, `getCampaignById`, `listCampaignsByOwner`, `updateCampaign`, `deleteCampaign`
    - `sessionService.ts`: `createSession`, `getSessionById`, `listSessionsByCampaign`, `updateSession`, `deleteSession`
    - `encounterService.ts`: `createEncounter`, `getEncounterById`, `listEncountersBySession`, `updateEncounter`, `deleteEncounter`
    - **Write unit tests for each service function**
    - _Requirements: 2.8, 6.1, 6.4_
  - [ ] 9.3 Implement service functions for Combatant, StatBlock, Inventory, and Item
    - `combatantService.ts`: `createCombatant`, `updateCombatant` (HP, initiative), `deleteCombatant`, `listCombatantsByEncounter`
    - `statBlockService.ts`: `createStatBlock`, `getStatBlockById`, `listStatBlocks`, `updateStatBlock`, `deleteStatBlock`
    - `inventoryService.ts`: `addItemToInventory`, `removeItemFromInventory`, `updateItemSlot`, `getInventoryByCharacter`
    - **Write unit tests for each service function**
    - _Requirements: 2.8, 6.1, 6.4_
  - [ ] 9.4 Write property test for transaction atomicity (Property 5) (**REQUIRED**)
    - **Property 5: Transaction atomicity — partial failures produce no partial writes**
    - Generate pairs of valid + intentionally-failing Prisma operations in `$transaction()`, assert post-failure row counts equal pre-transaction counts
    - **This property test MUST pass before proceeding**
    - **Validates: Requirements 2.8, 6.1, 6.2, 6.3**

- [ ] 10. GraphQL resolvers
  - [ ] 10.1 Implement resolvers for User and Character
    - `user.resolver.ts`: map `Query.me`, `Mutation.createUser`, `Mutation.updateUser`; call service functions; protect with auth check (throw `UNAUTHENTICATED` if `ctx.currentUser` is null for protected fields)
    - `character.resolver.ts`: map queries and mutations to character service; enforce ownership check
    - _Requirements: 1.3, 1.7, 6.4_
  - [ ] 10.2 Implement resolvers for Campaign, Session, and Encounter
    - Wire `campaign.resolver.ts`, `session.resolver.ts`, `encounter.resolver.ts` to their respective services
    - Apply `UNAUTHENTICATED` guard on all campaign/session/encounter mutations
    - _Requirements: 1.3, 1.7_
  - [ ] 10.3 Implement resolvers for Combatant, StatBlock, Inventory, and Item
    - Wire `combatant.resolver.ts`, `statBlock.resolver.ts`, `inventory.resolver.ts`, `item.resolver.ts` to services
    - _Requirements: 1.3_
  - [ ] 10.4 Write property test for auth rejection (Property 2) (**REQUIRED**)
    - **Property 2: Protected resolvers reject unauthenticated requests**
    - Generate arbitrary GraphQL operation strings and variable maps for protected queries/mutations, execute against the schema with no auth context, assert every response has at least one error with `extensions.code === 'UNAUTHENTICATED'`
    - **This property test MUST pass before proceeding**
    - **Validates: Requirements 1.7**
  - [ ] 10.5 Write unit tests for resolvers (**REQUIRED**)
    - Mock the service layer; test each resolver calls the correct service function
    - Test auth guard throws `UNAUTHENTICATED` when `currentUser` is null
    - Test error propagation from service layer to resolver
    - **All tests must pass before moving to next task**
    - _Requirements: 1.3, 1.7_

- [ ] 11. Checkpoint — schema, services, and resolvers
  - **GATE: All tests from tasks 6-10 must pass before proceeding**
  - Run `npm run test:run` and verify all tests pass
  - Check test coverage meets 80% minimum threshold
  - Ensure all tests pass (error mapping, service layer, resolvers, property tests 1–5). Ask the user if questions arise.

- [ ] 12. Express app, Apollo Server, and health endpoint
  - [ ] 12.1 Implement `server/app.ts`
    - Load config (fail fast on missing `DATABASE_URL`)
    - Run `prisma migrate deploy` before accepting requests; halt with exit code 1 on migration failure
    - Apply SQLite PRAGMAs via `prisma.ts` singleton initialisation
    - Create `OperationQueue` singleton using `createQueue(config)`
    - Build Apollo Server 4 with `makeExecutableSchema`, `formatError` plugin, and introspection toggle via `GRAPHQL_INTROSPECTION`
    - Mount Apollo as Express middleware at `POST /graphql`
    - Mount `GET /health` endpoint: run `prisma.$queryRaw\`SELECT 1\`` with a short timeout; return `200 { status: 'ok', database: 'connected' }` or `503 { status: 'degraded', database: 'unreachable' }`
    - Register `SIGTERM`/`SIGINT` handlers for graceful shutdown
    - _Requirements: 1.1, 1.4, 1.5, 2.4, 2.5, 3.2, 7.6, 8.4_
  - [ ] 12.2 Implement graceful shutdown handler
    - On `SIGTERM`/`SIGINT`: stop accepting new connections, call `queue.drain()`, then `prisma.$disconnect()`
    - _Requirements: 4.7_
  - [ ] 12.3 Write property test for graceful shutdown drain (Property 6) (**REQUIRED**)
    - **Property 6: Graceful shutdown drains all queued writes**
    - Generate N write operations, start draining, simulate shutdown signal, assert all N operations resolve/reject before `prisma.$disconnect()` is called
    - **This property test MUST pass before proceeding**
    - **Validates: Requirements 4.7**
  - [ ] 12.4 Write integration tests for health endpoint and GraphQL round-trip (**REQUIRED**)
    - Test `GET /health` returns `200` when DB is reachable (in-memory SQLite)
    - Test `GET /health` returns `503` when DB is unreachable (mocked PrismaClient throwing)
    - Test full GraphQL round-trip: `createCharacter` mutation followed by `character` query returns persisted data
    - **All tests must pass before moving to next task**
    - _Requirements: 7.6, 1.1_

- [ ] 13. Vitest global test setup and teardown
  - [ ] 13.1 Create `server/test/setup.ts` (Vitest global setup file)
    - Set `DATABASE_URL=file::memory:?cache=shared` and `NODE_ENV=test`
    - Run `prisma migrate deploy` once before all suites start
    - Export a `teardown` that truncates all tables in reverse-dependency order using a single `prisma.$transaction([prisma.itemSlot.deleteMany(), ...])`
    - _Requirements: 3.5, 8.5_
  - [ ] 13.2 Wire the global setup into `vite.config.ts`
    - Add `globalSetup` pointing to `server/test/setup.ts` and `setupFiles` for the per-test reset hook
    - Ensure `fast-check` tests run with at least 100 iterations (the fast-check default)
    - _Requirements: 8.5_

- [ ] 14. Final checkpoint — full test suite
  - **FINAL GATE: ALL tests must pass with 80%+ coverage**
  - Run `npm run test:coverage` and confirm:
    - All unit tests pass (0 failures)
    - All 6 property-based tests pass (Properties 1–6)
    - All integration tests pass (0 failures)
    - Coverage meets or exceeds 80% on lines, functions, branches, and statements
  - **DO NOT PROCEED to implementation without passing all tests**
  - Ask the user if questions arise.

---

## Notes

- **TESTING IS MANDATORY**: Every implementation task includes corresponding tests that MUST pass before proceeding.
- **Coverage requirement**: Minimum 80% coverage on lines, functions, branches, and statements.
- **Gate checkpoints**: Tasks 6, 11, and 14 are explicit gates where all tests must pass before continuing.
- All six property-based tests (Properties 1–6) are **REQUIRED** — they validate critical correctness properties and must pass before shipping.
- Each task references specific requirements for traceability.
- The Operation_Queue passthrough for MySQL (task 5.2) ensures the same codebase works for both providers with no conditional logic in resolvers or services.
- The global Vitest setup (task 13) is critical — without it, in-memory SQLite tests will fail with "table not found" errors.
- `prisma migrate deploy` is used at startup (not `migrate dev`) to match production behaviour.
- All service functions route writes through `ctx.queue.enqueue()` even when using MySQL passthrough — the abstraction is transparent to callers.

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["2.1", "4.1"] },
    { "id": 1, "tasks": ["2.2", "2.3", "4.2", "3.1"] },
    { "id": 2, "tasks": ["3.2", "5.1"] },
    { "id": 3, "tasks": ["5.2", "7.1"] },
    { "id": 4, "tasks": ["5.3", "5.4", "5.5", "7.2"] },
    { "id": 5, "tasks": ["7.3", "7.4", "8.1"] },
    { "id": 6, "tasks": ["8.2", "8.3"] },
    { "id": 7, "tasks": ["9.1", "9.2", "9.3", "13.1"] },
    { "id": 8, "tasks": ["9.4", "10.1", "10.2", "10.3", "13.2"] },
    { "id": 9, "tasks": ["10.4", "10.5", "12.1"] },
    { "id": 10, "tasks": ["12.2"] },
    { "id": 11, "tasks": ["12.3", "12.4"] }
  ]
}
```
