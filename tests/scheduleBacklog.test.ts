import assert from "node:assert/strict";
import test from "node:test";
import { createTestDatabase } from "./helpers/sqlite";
import { createSchedule, materializeScheduledTransactions } from "../src/repositories/financeRepository";

const local = (year: number, month: number, day: number) => new Date(year, month - 1, day, 10).getTime();
const input = { title: "Aluguel", type: "expense" as const, amountCents: 10000, accountId: "principal", categoryId: "casa", frequency: "monthly" as const, nextAt: local(2023, 1, 31), isSubscription: false };

test("one refresh catches up years of monthly occurrences without the twelve-entry cutoff or duplicate retries", async () => {
  const { sqlite, db } = await createTestDatabase();
  try {
    const id = await createSchedule(db, input);
    await materializeScheduledTransactions(db, local(2026, 1, 31));
    const rows = sqlite.prepare("SELECT id, occurred_at, status, amount_cents FROM transactions ORDER BY occurred_at").all();
    assert.equal(rows.length, 38);
    assert.equal(rows[0].occurred_at, local(2023, 1, 31));
    assert.equal(rows[13].occurred_at, local(2024, 2, 29));
    assert.equal(rows[37].occurred_at, local(2026, 2, 28));
    assert.equal(rows.every((row) => row.status === "pending" && row.amount_cents === 10000), true);
    assert.equal(sqlite.prepare("SELECT next_at FROM schedules WHERE id = ?").get(id)?.next_at, local(2026, 3, 31));
    sqlite.prepare("UPDATE transactions SET status = 'paid' WHERE id = ?").run(String(rows[0].id));
    sqlite.prepare("DELETE FROM transactions WHERE id = ?").run(String(rows[1].id));
    const history = sqlite.prepare("SELECT * FROM transactions ORDER BY occurred_at").all();
    await Promise.all([materializeScheduledTransactions(db, local(2026, 1, 31)), materializeScheduledTransactions(db, local(2026, 1, 31))]);
    assert.deepEqual(sqlite.prepare("SELECT * FROM transactions ORDER BY occurred_at").all(), history);
    assert.equal(sqlite.prepare("SELECT COUNT(*) AS count FROM schedule_instances WHERE schedule_id = ?").get(id)?.count, 38);
  } finally { sqlite.close(); }
});

test("weekly backlog reaches the 45-day horizon in one refresh and preserves local clock", async () => {
  const { sqlite, db } = await createTestDatabase();
  try {
    await createSchedule(db, { ...input, frequency: "weekly", nextAt: local(2025, 1, 6) });
    await materializeScheduledTransactions(db, local(2026, 1, 6));
    const rows = sqlite.prepare("SELECT occurred_at FROM transactions ORDER BY occurred_at").all();
    assert.equal(rows.length, 59);
    assert.equal(rows[58].occurred_at, local(2026, 2, 16));
    assert.equal(rows.every((row) => new Date(Number(row.occurred_at)).getHours() === 10), true);
    assert.equal(sqlite.prepare("SELECT next_at FROM schedules").get()?.next_at, local(2026, 2, 23));
  } finally { sqlite.close(); }
});

test("failure beyond occurrence twelve rolls back the entire schedule and a retry fills the backlog", async () => {
  const { sqlite, db } = await createTestDatabase();
  try {
    await createSchedule(db, input);
    sqlite.exec(`CREATE TRIGGER fail_late_occurrence BEFORE INSERT ON transactions WHEN NEW.occurred_at = ${local(2024, 1, 31)} BEGIN SELECT RAISE(ABORT, 'late failure'); END;`);
    await assert.rejects(materializeScheduledTransactions(db, local(2026, 1, 31)), /late failure/);
    assert.equal(sqlite.prepare("SELECT COUNT(*) AS count FROM transactions").get()?.count, 0);
    assert.equal(sqlite.prepare("SELECT COUNT(*) AS count FROM schedule_instances").get()?.count, 0);
    assert.equal(sqlite.prepare("SELECT next_at FROM schedules").get()?.next_at, input.nextAt);
    sqlite.exec("DROP TRIGGER fail_late_occurrence");
    await materializeScheduledTransactions(db, local(2026, 1, 31));
    assert.equal(sqlite.prepare("SELECT COUNT(*) AS count FROM transactions").get()?.count, 38);
  } finally { sqlite.close(); }
});

test("invalid refresh dates and corrupted recurring values cannot silently create incomplete entries", async () => {
  const { sqlite, db } = await createTestDatabase();
  try {
    await createSchedule(db, input);
    await assert.rejects(materializeScheduledTransactions(db, NaN), /data/i);
    await assert.rejects(materializeScheduledTransactions(db, 8_640_000_000_000_000), /data/i);
    sqlite.exec("UPDATE schedules SET amount_cents = 1.5");
    await assert.rejects(materializeScheduledTransactions(db, local(2026, 1, 31)), /valor/i);
    assert.equal(sqlite.prepare("SELECT COUNT(*) AS count FROM transactions").get()?.count, 0);
  } finally { sqlite.close(); }
});
