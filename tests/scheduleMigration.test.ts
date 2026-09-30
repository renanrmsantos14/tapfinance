import assert from "node:assert/strict";
import test from "node:test";
import { createTestDatabase } from "./helpers/sqlite";
import { CURRENT_SCHEMA_VERSION, initializeDatabase } from "../src/database/database";
import { inspectBackupDatabase } from "../src/database/inspectBackup";
import { createSchedule, materializeScheduledTransactions } from "../src/repositories/financeRepository";

test("v3 upgrade backfills original anchors and preserves deleted-instance history, values and statuses", async () => {
  const { sqlite, db } = await createTestDatabase();
  try {
    const initial = new Date(2026, 0, 31, 10).getTime();
    await createSchedule(db, { title: "Aluguel", type: "expense", amountCents: 10000, accountId: "principal", categoryId: "casa", frequency: "monthly", nextAt: initial, isSubscription: false });
    await materializeScheduledTransactions(db, initial);
    sqlite.prepare("DELETE FROM transactions WHERE occurred_at = ?").run(initial);
    const before = sqlite.prepare("SELECT * FROM transactions").all();
    sqlite.exec("ALTER TABLE schedules DROP COLUMN anchor_at; ALTER TABLE loans DROP COLUMN initial_transaction_id; DELETE FROM schema_migrations WHERE version >= 4;");
    assert.equal((await inspectBackupDatabase(db)).schemaVersion, 3);
    await initializeDatabase(db);
    await initializeDatabase(db);
    assert.equal(sqlite.prepare("SELECT anchor_at FROM schedules").get()?.anchor_at, initial);
    assert.deepEqual(sqlite.prepare("SELECT * FROM transactions").all(), before);
    assert.equal((await inspectBackupDatabase(db)).schemaVersion, CURRENT_SCHEMA_VERSION);
    assert.equal(sqlite.prepare("SELECT COUNT(*) AS count FROM schema_migrations WHERE version = 4").get()?.count, 1);
  } finally { sqlite.close(); }
});

test("backup inspection rejects future schemas and incomplete recurrence structures", async () => {
  const { sqlite, db } = await createTestDatabase();
  try {
    sqlite.exec(`INSERT INTO schema_migrations VALUES (${CURRENT_SCHEMA_VERSION + 1}, 1)`);
    await assert.rejects(inspectBackupDatabase(db), /incompatível/);
    await assert.rejects(initializeDatabase(db), /mais recente/);
    sqlite.exec(`DELETE FROM schema_migrations WHERE version = ${CURRENT_SCHEMA_VERSION + 1}; ALTER TABLE schedules DROP COLUMN anchor_at;`);
    await assert.rejects(inspectBackupDatabase(db), /estrutura/);
  } finally { sqlite.close(); }
});
