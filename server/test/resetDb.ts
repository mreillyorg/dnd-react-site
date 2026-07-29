import { beforeEach } from "vitest";
import mysql from "mysql2/promise";
import { drizzle } from "drizzle-orm/mysql2";

import * as schema from "../db/schema.ts";

/**
 * Per-test-file setup hook that truncates all tables before each test
 * when running with the test MySQL database.
 *
 * This ensures test isolation: each test starts with an empty database.
 * The global setup (server/test/setup.ts) handles schema creation;
 * this file handles row-level cleanup.
 */

const databaseUrl = process.env["DATABASE_URL"];

if (databaseUrl) {
  const pool = mysql.createPool(databaseUrl);
  const db = drizzle(pool, { schema, mode: "default" });

  beforeEach(async () => {
    // Disable FK checks for truncation
    await pool.execute("SET FOREIGN_KEY_CHECKS = 0");

    // Truncate all tables in reverse-dependency order
    await db.delete(schema.itemAssignments);
    await db.delete(schema.combatants);
    await db.delete(schema.sessionNotes);
    await db.delete(schema.combatEncounters);
    await db.delete(schema.npcs);
    await db.delete(schema.locations);
    await db.delete(schema.quests);
    await db.delete(schema.timelineEntries);
    await db.delete(schema.sessions);
    await db.delete(schema.characters);
    await db.delete(schema.campaigns);
    await db.delete(schema.monsters);
    await db.delete(schema.items);
    await db.delete(schema.authSessions);
    await db.delete(schema.oauthIdentities);
    await db.delete(schema.users);

    // Re-enable FK checks
    await pool.execute("SET FOREIGN_KEY_CHECKS = 1");
  });
}
