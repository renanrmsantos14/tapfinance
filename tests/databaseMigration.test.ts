import assert from "node:assert/strict";
import test from "node:test";
import { DatabaseSync, type SQLInputValue } from "node:sqlite";
import type { SQLiteDatabase } from "expo-sqlite";
import { initializeDatabase } from "../src/database/database";

function adapter(sqlite: DatabaseSync): SQLiteDatabase {
  const database = {
    execAsync: async (sql: string) => { sqlite.exec(sql); },
    runAsync: async (sql: string, ...values: SQLInputValue[]) => sqlite.prepare(sql).run(...values),
    getFirstAsync: async (sql: string, ...values: SQLInputValue[]) => sqlite.prepare(sql).get(...values) ?? null,
    prepareAsync: async (sql: string) => {
      const statement = sqlite.prepare(sql);
      return { executeAsync: async (...values: SQLInputValue[]) => statement.run(...values), finalizeAsync: async () => undefined };
    },
    withTransactionAsync: async (action: () => Promise<unknown>) => {
      sqlite.exec("BEGIN");
      try { const value = await action(); sqlite.exec("COMMIT"); return value; }
      catch (error) { sqlite.exec("ROLLBACK"); throw error; }
    },
  };
  return database as unknown as SQLiteDatabase;
}

test("fresh database initializes current schema and seeds", async () => {
  const sqlite = new DatabaseSync(":memory:");
  try {
    await initializeDatabase(adapter(sqlite));
    assert.equal((sqlite.prepare("SELECT MAX(version) AS version FROM schema_migrations").get() as { version: number }).version, 3);
    assert.equal((sqlite.prepare("SELECT COUNT(*) AS count FROM accounts").get() as { count: number }).count, 1);
    assert.equal((sqlite.prepare("SELECT COUNT(*) AS count FROM categories").get() as { count: number }).count, 13);
    for (const table of ["budgets", "goals", "loans", "schedules", "schedule_instances", "activity_log"]) {
      assert.equal((sqlite.prepare("SELECT COUNT(*) AS count FROM sqlite_master WHERE type = 'table' AND name = ?").get(table) as { count: number }).count, 1);
    }
  } finally { sqlite.close(); }
});

test("v2 migration preserves an existing transaction and maps it to primary account", async () => {
  const sqlite = new DatabaseSync(":memory:");
  try {
    sqlite.exec(`
      CREATE TABLE schema_migrations (version INTEGER PRIMARY KEY NOT NULL, applied_at INTEGER NOT NULL);
      INSERT INTO schema_migrations VALUES (1, 1), (2, 2);
      CREATE TABLE categories (id TEXT PRIMARY KEY NOT NULL, name TEXT NOT NULL, icon TEXT NOT NULL, type TEXT NOT NULL, position INTEGER NOT NULL, is_active INTEGER NOT NULL DEFAULT 1, created_at INTEGER NOT NULL);
      CREATE TABLE transactions (id TEXT PRIMARY KEY NOT NULL, type TEXT NOT NULL, amount_cents INTEGER NOT NULL, category_id TEXT NOT NULL, description TEXT, occurred_at INTEGER NOT NULL, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL, source_suggestion_id TEXT);
      INSERT INTO categories VALUES ('old', 'Anterior', 'tag', 'expense', 0, 1, 1);
      INSERT INTO transactions VALUES ('old-tx', 'expense', 1234, 'old', 'Preservar', 1000, 1000, 1000, NULL);
    `);
    await initializeDatabase(adapter(sqlite));
    const row = sqlite.prepare("SELECT account_id, amount_cents, description FROM transactions WHERE id = 'old-tx'").get() as { account_id: string; amount_cents: number; description: string };
    assert.equal(row.account_id, "principal");
    assert.equal(row.amount_cents, 1234);
    assert.equal(row.description, "Preservar");
    assert.equal((sqlite.prepare("SELECT MAX(version) AS version FROM schema_migrations").get() as { version: number }).version, 3);
  } finally { sqlite.close(); }
});
