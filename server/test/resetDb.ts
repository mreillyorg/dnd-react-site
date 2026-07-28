import { beforeEach } from "vitest";
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";

import * as schema from "../db/schema.ts";

/**
 * Per-test-file setup hook that truncates all tables before each test
 * when running with the test SQLite database.
 *
 * This ensures test isolation: each test starts with an empty database.
 * The global setup (server/test/setup.ts) handles schema creation;
 * this file handles row-level cleanup.
 *
 * The reset only activates when DATABASE_URL points to the test database.
 */

const databaseUrl = process.env["DATABASE_URL"];

if (databaseUrl && databaseUrl.includes(".test-vitest.db")) {
  const client = createClient({ url: databaseUrl });
  const db = drizzle(client, { schema });

  beforeEach(async () => {
    // Disable FK checks for truncation
    await client.execute("PRAGMA foreign_keys = OFF");

    // Truncate all tables in reverse-dependency order
    db.delete(schema.itemAssignments).run();
    db.delete(schema.combatants).run();
    db.delete(schema.sessionNotes).run();
    db.delete(schema.combatEncounters).run();
    db.delete(schema.npcs).run();
    db.delete(schema.locations).run();
    db.delete(schema.quests).run();
    db.delete(schema.timelineEntries).run();
    db.delete(schema.sessions).run();
    db.delete(schema.characters).run();
    db.delete(schema.campaigns).run();
    db.delete(schema.monsters).run();
    db.delete(schema.items).run();
    db.delete(schema.authSessions).run();
    db.delete(schema.oauthIdentities).run();
    db.delete(schema.users).run();

    // Re-enable FK checks
    await client.execute("PRAGMA foreign_keys = ON");
  });
}
