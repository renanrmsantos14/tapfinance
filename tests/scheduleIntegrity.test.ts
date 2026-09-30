import assert from "node:assert/strict";
import test from "node:test";
import { createTestDatabase as fixture } from "./helpers/sqlite";
import { createSchedule, materializeScheduledTransactions } from "../src/repositories/financeRepository";

const schedule = (nextAt: number) => ({ title: "Aluguel", type: "expense" as const, amountCents: 10000, accountId: "principal", categoryId: "casa", frequency: "monthly" as const, nextAt, isSubscription: false });
const local = (year: number, month: number, day: number) => new Date(year, month - 1, day, 10).getTime();

test("monthly recurrence returns to day 31 after February, including later app opens", async () => {
  const { sqlite, db } = await fixture();
  try {
    await createSchedule(db, schedule(local(2026, 1, 31)));
    await materializeScheduledTransactions(db, local(2026, 1, 31));
    await materializeScheduledTransactions(db, local(2026, 3, 31));
    const dates = sqlite.prepare("SELECT occurred_at FROM transactions ORDER BY occurred_at").all().map((row) => new Date(Number(row.occurred_at)));
    assert.deepEqual(dates.map((date) => [date.getMonth() + 1, date.getDate(), date.getHours()]), [[1, 31, 10], [2, 28, 10], [3, 31, 10], [4, 30, 10]]);
  } finally { sqlite.close(); }
});

test("yearly recurrence restores February 29 in the next leap year", async () => {
  const { sqlite, db } = await fixture();
  try {
    await createSchedule(db, { ...schedule(local(2024, 2, 29)), frequency: "yearly" });
    await materializeScheduledTransactions(db, local(2028, 2, 29));
    const dates = sqlite.prepare("SELECT occurred_at FROM transactions ORDER BY occurred_at").all().map((row) => new Date(Number(row.occurred_at)));
    assert.deepEqual(dates.map((date) => [date.getFullYear(), date.getMonth() + 1, date.getDate()]), [[2024, 2, 29], [2025, 2, 28], [2026, 2, 28], [2027, 2, 28], [2028, 2, 29]]);
  } finally { sqlite.close(); }
});

test("simultaneous refreshes never duplicate recurring transactions or rewind next date", async () => {
  const { sqlite, db } = await fixture();
  try {
    await createSchedule(db, schedule(local(2026, 1, 15)));
    await Promise.all([materializeScheduledTransactions(db, local(2026, 1, 15)), materializeScheduledTransactions(db, local(2026, 1, 15))]);
    assert.equal(sqlite.prepare("SELECT COUNT(*) AS count FROM transactions").get()?.count, 2);
    assert.equal(sqlite.prepare("SELECT next_at FROM schedules").get()?.next_at, local(2026, 3, 15));
    assert.equal(sqlite.prepare("SELECT COUNT(*) AS count FROM transactions WHERE status = 'paid'").get()?.count, 0);
  } finally { sqlite.close(); }
});

test("one-time schedule creates a single pending entry and deactivates", async () => {
  const { sqlite, db } = await fixture();
  try {
    await createSchedule(db, { ...schedule(local(2026, 1, 15)), frequency: "once" });
    await materializeScheduledTransactions(db, local(2026, 1, 15));
    await materializeScheduledTransactions(db, local(2026, 1, 15));
    assert.equal(sqlite.prepare("SELECT COUNT(*) AS count FROM transactions").get()?.count, 1);
    assert.equal(sqlite.prepare("SELECT is_active FROM schedules").get()?.is_active, 0);
  } finally { sqlite.close(); }
});

test("schedule rejects an income with an expense category before persisting", async () => {
  const { sqlite, db } = await fixture();
  try {
    await assert.rejects(createSchedule(db, { ...schedule(local(2026, 1, 15)), type: "income" }), /categoria/i);
    assert.equal(sqlite.prepare("SELECT COUNT(*) AS count FROM schedules").get()?.count, 0);
  } finally { sqlite.close(); }
});

test("schedule rejects invalid money, dates and archived accounts", async () => {
  const { sqlite, db } = await fixture();
  try {
    for (const amountCents of [0, -1, 1.5, NaN, Number.MAX_SAFE_INTEGER + 1]) {
      await assert.rejects(createSchedule(db, { ...schedule(local(2026, 1, 15)), amountCents }), /valor/i);
    }
    await assert.rejects(createSchedule(db, { ...schedule(NaN) }), /data/i);
    sqlite.exec("UPDATE accounts SET is_archived = 1");
    await assert.rejects(createSchedule(db, schedule(local(2026, 1, 15))), /conta/i);
    assert.equal(sqlite.prepare("SELECT COUNT(*) AS count FROM schedules").get()?.count, 0);
  } finally { sqlite.close(); }
});

test("failed generation rolls back every occurrence and next date, and a later retry succeeds", async () => {
  const { sqlite, db } = await fixture();
  try {
    await createSchedule(db, schedule(local(2026, 1, 31)));
    sqlite.exec(`CREATE TRIGGER fail_second_occurrence BEFORE INSERT ON transactions
      WHEN NEW.occurred_at = ${local(2026, 2, 28)} BEGIN SELECT RAISE(ABORT, 'test failure'); END;`);
    await assert.rejects(materializeScheduledTransactions(db, local(2026, 1, 31)), /test failure/);
    assert.equal(sqlite.prepare("SELECT COUNT(*) AS count FROM transactions").get()?.count, 0);
    assert.equal(sqlite.prepare("SELECT COUNT(*) AS count FROM schedule_instances").get()?.count, 0);
    assert.equal(sqlite.prepare("SELECT next_at FROM schedules").get()?.next_at, local(2026, 1, 31));
    sqlite.exec("DROP TRIGGER fail_second_occurrence");
    await materializeScheduledTransactions(db, local(2026, 1, 31));
    assert.equal(sqlite.prepare("SELECT COUNT(*) AS count FROM transactions").get()?.count, 2);
  } finally { sqlite.close(); }
});

test("deleting the original transaction does not lose the recurrence anchor", async () => {
  const { sqlite, db } = await fixture();
  try {
    await createSchedule(db, schedule(local(2026, 1, 31)));
    await materializeScheduledTransactions(db, local(2026, 1, 31));
    sqlite.prepare("DELETE FROM transactions WHERE occurred_at = ?").run(local(2026, 1, 31));
    await materializeScheduledTransactions(db, local(2026, 3, 31));
    assert.equal(sqlite.prepare("SELECT COUNT(*) AS count FROM transactions WHERE occurred_at = ?").get(local(2026, 3, 31))?.count, 1);
    assert.equal(sqlite.prepare("SELECT COUNT(*) AS count FROM transactions WHERE occurred_at = ?").get(local(2026, 1, 31))?.count, 0);
  } finally { sqlite.close(); }
});
