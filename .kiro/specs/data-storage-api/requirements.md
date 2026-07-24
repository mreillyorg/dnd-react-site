# Requirements Document

## Introduction

This document covers the Data Storage & APIs feature for the web-based D&D companion site. It defines the persistence layer and API data layer that all other features depend on for reading and writing application data.

The API is exposed as a **GraphQL API** built on top of **Prisma ORM**. Prisma manages the schema, migrations, and typed database client. The default database provider is **SQLite in Rollback Journal Mode**, chosen for its simplicity and zero-infrastructure setup. MySQL is identified as an optional future provider to investigate for production scalability, and the Prisma schema is authored to remain compatible with a MySQL migration path.

Because SQLite enforces a single-writer constraint, all database writes are routed through a serialised in-process queue to prevent write contention and journal corruption under concurrent GraphQL request load.

---

## Glossary

- **Data_Storage_System**: The system described in this document, encompassing the Prisma ORM layer, the GraphQL API, the serialised write queue, and the underlying database.
- **Prisma_Schema**: The `schema.prisma` file that defines the data model, database provider, and connection URL. It is the single source of truth for the database schema.
- **Prisma_Client**: The auto-generated, fully typed TypeScript client produced by `prisma generate`, used exclusively for all database access.
- **Prisma_Migration**: A versioned migration file produced by `prisma migrate dev` or `prisma migrate deploy`, applied automatically by Prisma's migration engine.
- **GraphQL_API**: The GraphQL endpoint (e.g., `/graphql`) that exposes all application data operations to clients via queries and mutations.
- **GraphQL_Schema**: The SDL type definitions and resolvers that define the public API surface, derived from but distinct from the Prisma_Schema.
- **Resolver**: A server-side function that handles a GraphQL query or mutation field and delegates data access exclusively to the Prisma_Client.
- **Operation_Queue**: The in-process serialised queue through which all write Prisma_Client calls are routed when using SQLite, ensuring writes execute one at a time.
- **Read_Operation**: Any Prisma_Client call that retrieves data without modifying the database (e.g., `findMany`, `findUnique`).
- **Write_Operation**: Any Prisma_Client call that inserts, updates, or deletes data (e.g., `create`, `update`, `delete`, `upsert`).
- **Transaction**: A group of Prisma_Client operations executed atomically via `prisma.$transaction()`; either all succeed or all are rolled back.
- **SQLite_Provider**: The `sqlite` Prisma datasource provider, used as the default database backend.
- **MySQL_Provider**: The `mysql` Prisma datasource provider, identified as an optional future backend to investigate.
- **DATABASE_URL**: The environment variable that supplies the database connection string to Prisma. Its format determines which provider is active.

---

## Requirements

### Requirement 1: GraphQL API Layer

**User Story:** As a developer, I want all application data exposed through a single GraphQL endpoint, so that clients can request exactly the data they need and the API surface is self-documenting via the GraphQL schema.

#### Acceptance Criteria

1. THE Data_Storage_System SHALL expose a single GraphQL endpoint (e.g., `/graphql`) that handles all data queries and mutations for the application.
2. THE GraphQL_Schema SHALL define types, queries, and mutations for every domain entity (users, characters, campaigns, sessions, encounters, combatants, stat blocks, items, etc.).
3. EVERY Resolver SHALL delegate all data access exclusively to the Prisma_Client; raw SQL and direct database driver calls SHALL NOT appear in resolver code.
4. THE GraphQL_API SHALL support introspection in development environments to enable schema exploration via tools such as GraphiQL or Apollo Sandbox.
5. THE GraphQL_API SHALL disable introspection in production environments unless explicitly re-enabled via an environment variable.
6. THE Data_Storage_System SHALL return GraphQL-standard error objects for all failures, including an error code extension, without exposing internal database error messages or Prisma internals to the client.
7. THE GraphQL_API SHALL enforce authentication on all queries and mutations that access user-specific or campaign-specific data, rejecting unauthenticated requests with a GraphQL authentication error.
8. THE GraphQL_Schema SHALL be kept in sync with the Prisma_Schema; any Prisma model change SHALL be accompanied by a corresponding GraphQL type and resolver update.

---

### Requirement 2: Prisma ORM and Schema Management

**User Story:** As a developer, I want Prisma ORM to manage the data model, database client, and migrations, so that the schema is version-controlled, the client is fully typed, and schema changes are applied consistently across all environments.

#### Acceptance Criteria

1. THE Data_Storage_System SHALL use Prisma ORM as the sole ORM and database access library; no other ORM or raw database driver SHALL be used for application data access.
2. THE Prisma_Schema SHALL be the single source of truth for the database schema; schema changes SHALL be made by editing `schema.prisma` and generating a new Prisma_Migration, never by editing the database directly.
3. THE Prisma_Schema datasource SHALL be configured to read the provider and `DATABASE_URL` from environment variables, allowing the provider to be switched without code changes.
4. WHEN the application starts in a non-test environment, THE Data_Storage_System SHALL run `prisma migrate deploy` (or equivalent programmatic call) to apply any pending Prisma_Migrations before accepting requests.
5. WHEN a Prisma_Migration fails to apply, THE Data_Storage_System SHALL log the error with the migration name and halt application startup.
6. THE Prisma_Client SHALL be regenerated (`prisma generate`) as part of the build process so that the generated client always matches the current Prisma_Schema.
7. Prisma_Migration files SHALL be committed to version control and SHALL NOT be manually edited after creation.
8. THE Data_Storage_System SHALL use Prisma's `$transaction()` API for all Write_Operations that affect more than one model, ensuring atomicity.

---

### Requirement 3: SQLite Default Provider

**User Story:** As a developer, I want SQLite to be the default database provider, so that the application can be run and developed locally with zero external infrastructure.

#### Acceptance Criteria

1. THE Prisma_Schema SHALL default to the `sqlite` provider when no `DATABASE_URL` override is present in the environment.
2. THE Data_Storage_System SHALL operate SQLite in Rollback Journal Mode (the SQLite default `journal_mode=DELETE`); WAL mode SHALL NOT be configured.
3. THE Data_Storage_System SHALL apply `PRAGMA foreign_keys = ON` and `PRAGMA synchronous = FULL` for every SQLite connection, configurable via Prisma's `previewFeatures` or a connection initialisation hook.
4. THE SQLite database file path SHALL be defined entirely by the `DATABASE_URL` environment variable (e.g., `file:./dev.db`); no path SHALL be hard-coded in application source.
5. THE Data_Storage_System SHALL support an in-memory SQLite database for tests by setting `DATABASE_URL=file::memory:?cache=shared`, applying all Prisma_Migrations on test startup.
6. THE Data_Storage_System SHALL document the SQLite setup, including the `DATABASE_URL` format and Rollback Journal Mode rationale, in the project README and `.env.example`.

---

### Requirement 4: Serialised Write Queue for SQLite

**User Story:** As a developer, I want all database writes serialised through an in-process queue when using SQLite, so that SQLite's single-writer constraint is never violated and journal corruption under concurrent GraphQL load is prevented.

#### Acceptance Criteria

1. WHEN the active provider is SQLite, THE Data_Storage_System SHALL route every Write_Operation through a single in-process Operation_Queue that executes writes one at a time in FIFO order.
2. THE Operation_Queue SHALL return a Promise for each submitted Write_Operation that resolves with the Prisma_Client result when the operation completes.
3. THE Operation_Queue SHALL have a configurable maximum queue depth via an environment variable (e.g., `DB_QUEUE_MAX_DEPTH`), with a documented default.
4. WHEN the Operation_Queue depth exceeds the configured maximum, THE Data_Storage_System SHALL reject the incoming Write_Operation immediately with a structured queue-full error rather than dropping it silently.
5. THE Data_Storage_System SHALL log each Write_Operation's queue wait time and execution duration at debug level.
6. WHEN the active provider is MySQL, THE Operation_Queue SHALL be bypassed; MySQL's own concurrency controls handle write contention natively.
7. WHEN the application shuts down gracefully, THE Data_Storage_System SHALL drain the Operation_Queue, completing all queued Write_Operations before closing the Prisma_Client connection.

---

### Requirement 5: MySQL Provider Investigation Path

**User Story:** As a developer, I want the system designed so that switching from SQLite to MySQL requires only a provider and connection string change, so that a future migration to MySQL for production scalability is low-risk.

#### Acceptance Criteria

1. THE Prisma_Schema SHALL use only field types and relation patterns that are compatible with both the `sqlite` and `mysql` Prisma providers, avoiding SQLite-only or MySQL-only constructs where possible.
2. WHEN `DATABASE_URL` is set to a MySQL connection string and the Prisma_Schema provider is set to `mysql`, THE Data_Storage_System SHALL connect to MySQL without any code changes beyond the environment variable and provider value.
3. THE Data_Storage_System SHALL document in the project README the steps required to switch from SQLite to MySQL: updating `DATABASE_URL`, updating the provider in `schema.prisma`, running `prisma migrate deploy`, and disabling the Operation_Queue.
4. THE Data_Storage_System SHALL maintain a separate `.env.mysql.example` file showing the MySQL `DATABASE_URL` format and any MySQL-specific configuration.
5. WHEN running against MySQL, THE Data_Storage_System SHALL disable the Operation_Queue (Requirement 4, criterion 6) and rely on MySQL's native transaction isolation for concurrency control.
6. THE project SHALL include a documented investigation checklist for MySQL adoption covering: connection pooling strategy, migration testing against a MySQL instance, performance benchmarking vs SQLite under expected load, and any Prisma_Schema adjustments required for MySQL-specific constraints.

---

### Requirement 6: Transaction Management

**User Story:** As a developer, I want all multi-model writes wrapped in Prisma transactions, so that partial failures leave the database in a consistent state regardless of the active provider.

#### Acceptance Criteria

1. THE Data_Storage_System SHALL use `prisma.$transaction()` for every Write_Operation that modifies more than one Prisma model.
2. WHEN all operations within a `prisma.$transaction()` call complete successfully, Prisma SHALL commit the transaction.
3. WHEN any operation within a `prisma.$transaction()` call throws an error, Prisma SHALL roll back the entire transaction and THE Data_Storage_System SHALL propagate a structured error to the calling Resolver.
4. Resolvers SHALL not manage transactions directly; transaction boundaries SHALL be encapsulated in dedicated data-access service functions called by Resolvers.
5. THE Data_Storage_System SHALL not use interactive transactions (long-lived `$transaction` callbacks holding an open connection) unless no batch alternative exists, and SHALL document any exceptions.

---

### Requirement 7: Error Handling and Observability

**User Story:** As a developer and operator, I want all database and GraphQL errors structured, logged, and sanitised before reaching API consumers, so that failures are diagnosable without exposing internals.

#### Acceptance Criteria

1. WHEN a Prisma_Client operation throws a `PrismaClientKnownRequestError`, THE Data_Storage_System SHALL map it to a structured application error with a domain error code (e.g., `CONFLICT`, `NOT_FOUND`, `FOREIGN_KEY_VIOLATION`) before surfacing it in the GraphQL error response.
2. WHEN a Prisma_Client operation throws a `PrismaClientUnknownRequestError` or `PrismaClientRustPanicError`, THE Data_Storage_System SHALL log the full error internally and return a generic internal server error to the GraphQL client without Prisma-specific details.
3. THE GraphQL error response SHALL include an `extensions.code` field for all errors to allow clients to handle error types programmatically.
4. THE Data_Storage_System SHALL log all database errors with the resolver name, operation type, and relevant entity identifiers at error level.
5. THE Data_Storage_System SHALL log a warning when Operation_Queue wait time for any Write_Operation exceeds a configurable threshold (e.g., `DB_QUEUE_WARN_MS`).
6. THE Data_Storage_System SHALL expose a `/health` HTTP endpoint (separate from the GraphQL endpoint) that verifies the Prisma_Client can reach the database and returns a structured status response, usable by load balancers and monitoring tools.

---

### Requirement 8: Configuration and Environment

**User Story:** As a developer, I want all storage and API configuration driven by environment variables, so that the system runs correctly across development, test, and production without code changes.

#### Acceptance Criteria

1. THE Data_Storage_System SHALL read all configuration from environment variables; no database URLs, credentials, or provider names SHALL be hard-coded in source files.
2. THE following environment variables SHALL be supported and documented:
   - `DATABASE_URL` — Prisma connection string (required; no default).
   - `DB_QUEUE_MAX_DEPTH` — Maximum Operation_Queue depth for SQLite (optional; documented default).
   - `DB_QUEUE_WARN_MS` — Queue wait time warning threshold in milliseconds (optional; documented default).
   - `GRAPHQL_INTROSPECTION` — Enables GraphQL introspection when set to `true` (optional; defaults to `true` in development, `false` in production).
   - `NODE_ENV` — Controls development vs production behaviour.
3. ALL supported environment variables SHALL be listed with descriptions and example values in a `.env.example` file at the project root.
4. THE Data_Storage_System SHALL fail fast at startup with a clear error message if `DATABASE_URL` is not set.
5. THE Data_Storage_System SHALL support a test environment where `DATABASE_URL` points to an in-memory SQLite database, all Prisma_Migrations are applied on startup, and the Prisma_Client is reset between test suites.
