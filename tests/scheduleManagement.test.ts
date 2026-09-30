import assert from "node:assert/strict";
import test from "node:test";
import { createTestDatabase } from "./helpers/sqlite";
import { createSchedule, deleteSchedule, listSchedules, materializeScheduledTransactions, setScheduleActive, updateSchedule } from "../src/repositories/financeRepository";

const local = (month: number, day: number) => new Date(2026, month - 1, day, 10).getTime();
const input = { title: "Aluguel", type: "expense" as const, amountCents: 10000, accountId: "principal", categoryId: "casa", frequency: "monthly" as const, nextAt: local(1, 31), isSubscription: false };

test("schedule editing preserves existing entries unless future pending updates are requested", async () => {
  const { sqlite, db } = await createTestDatabase();
  try {
    const id = await createSchedule(db, input);
    await materializeScheduledTransactions(db, local(1, 31));
    sqlite.prepare("UPDATE transactions SET status = 'paid' WHERE occurred_at = ?").run(local(1, 31));
    const nextAt = (await listSchedules(db))[0].nextAt;
    await updateSchedule(db, id, { ...input, title: "Moradia", amountCents: 20000, nextAt }, { now: local(2, 1) });
    assert.deepEqual(sqlite.prepare("SELECT DISTINCT title, amount_cents FROM transactions").all().map((row) => [row.title, row.amount_cents]), [["Aluguel", 10000]]);
    await updateSchedule(db, id, { ...input, title: "Moradia", amountCents: 20000, nextAt }, { updateFuturePending: true, now: local(2, 1) });
    assert.equal(sqlite.prepare("SELECT amount_cents FROM transactions WHERE status = 'paid'").get()?.amount_cents, 10000);
    assert.equal(sqlite.prepare("SELECT amount_cents FROM transactions WHERE status = 'pending'").get()?.amount_cents, 20000);
    await materializeScheduledTransactions(db, local(3, 1));
    assert.equal(sqlite.prepare("SELECT occurred_at FROM transactions WHERE occurred_at >= ? ORDER BY occurred_at LIMIT 1").get(local(3, 1))?.occurred_at, local(3, 31));
  } finally { sqlite.close(); }
});

test("editing a recurrence date resets its anchor without moving paid history", async () => {
  const { sqlite, db } = await createTestDatabase();
  try {
    const id = await createSchedule(db, input);
    await materializeScheduledTransactions(db, local(1, 31));
    await updateSchedule(db, id, { ...input, nextAt: local(3, 20) });
    await materializeScheduledTransactions(db, local(3, 20));
    assert.equal(sqlite.prepare("SELECT next_at FROM schedules").get()?.next_at, local(5, 20));
    assert.equal(sqlite.prepare("SELECT COUNT(*) AS count FROM transactions WHERE occurred_at = ?").get(local(1, 31))?.count, 1);
  } finally { sqlite.close(); }
});

test("paused schedules remain manageable and resume without duplicate occurrences", async () => {
  const { sqlite, db } = await createTestDatabase();
  try {
    const id = await createSchedule(db, input);
    await setScheduleActive(db, id, false);
    assert.equal((await listSchedules(db)).length, 0);
    assert.equal((await listSchedules(db, true))[0].isActive, false);
    await materializeScheduledTransactions(db, local(3, 1));
    assert.equal(sqlite.prepare("SELECT COUNT(*) AS count FROM transactions").get()?.count, 0);
    await setScheduleActive(db, id, true);
    await materializeScheduledTransactions(db, local(3, 1));
    await setScheduleActive(db, id, false);
    await setScheduleActive(db, id, true);
    await materializeScheduledTransactions(db, local(3, 1));
    assert.equal(sqlite.prepare("SELECT COUNT(*) AS count FROM transactions").get()?.count, 3);
  } finally { sqlite.close(); }
});

test("a completed one-time schedule must be assigned a new date before resuming", async () => {
  const { sqlite, db } = await createTestDatabase();
  try {
    const id = await createSchedule(db, { ...input, frequency: "once" });
    await materializeScheduledTransactions(db, local(1, 31));
    await assert.rejects(setScheduleActive(db, id, true), /data/i);
    await updateSchedule(db, id, { ...input, frequency: "once", nextAt: local(3, 20) });
    await setScheduleActive(db, id, true);
    await materializeScheduledTransactions(db, local(3, 20));
    assert.equal(sqlite.prepare("SELECT COUNT(*) AS count FROM transactions").get()?.count, 2);
  } finally { sqlite.close(); }
});

test("deleting a schedule preserves and detaches every existing transaction", async () => {
  const { sqlite, db } = await createTestDatabase();
  try {
    const id = await createSchedule(db, input);
    await materializeScheduledTransactions(db, local(1, 31));
    await deleteSchedule(db, id);
    assert.equal((await listSchedules(db, true)).length, 0);
    assert.equal(sqlite.prepare("SELECT COUNT(*) AS count FROM schedule_instances").get()?.count, 0);
    assert.equal(sqlite.prepare("SELECT COUNT(*) AS count FROM transactions WHERE schedule_id IS NULL").get()?.count, 2);
  } finally { sqlite.close(); }
});

test("failed pending update rolls back recurrence configuration and existing transactions", async () => {
  const { sqlite, db } = await createTestDatabase();
  try {
    const id = await createSchedule(db, input);
    await materializeScheduledTransactions(db, local(1, 31));
    const nextAt = (await listSchedules(db))[0].nextAt;
    sqlite.exec("CREATE TRIGGER fail_schedule_edit BEFORE UPDATE ON transactions BEGIN SELECT RAISE(ABORT, 'test failure'); END;");
    await assert.rejects(updateSchedule(db, id, { ...input, nextAt, title: "Novo" }, { updateFuturePending: true, now: local(1, 1) }), /test failure/);
    assert.equal((await listSchedules(db))[0].title, "Aluguel");
    assert.equal(sqlite.prepare("SELECT title FROM transactions LIMIT 1").get()?.title, "Aluguel");
  } finally { sqlite.close(); }
});

test("resuming validates archived references and editing rejects invalid configuration without writes", async () => {
  const { sqlite, db } = await createTestDatabase();
  try {
    const id = await createSchedule(db, input);
    await setScheduleActive(db, id, false);
    await assert.rejects(updateSchedule(db, id, { ...input, amountCents: -1 }), /valor/i);
    await assert.rejects(updateSchedule(db, id, { ...input, type: "income" }), /categoria/i);
    sqlite.exec("UPDATE accounts SET is_archived = 1");
    await assert.rejects(setScheduleActive(db, id, true), /conta/i);
    assert.equal((await listSchedules(db, true))[0].isActive, false);
    assert.equal((await listSchedules(db, true))[0].amountCents, input.amountCents);
    assert.equal((await listSchedules(db, true))[0].type, input.type);
  } finally { sqlite.close(); }
});

test("updating future pending entries preserves overdue, paid, notes, tags and dates", async () => {
  const { sqlite, db } = await createTestDatabase();
  try {
    const id = await createSchedule(db, input);
    await materializeScheduledTransactions(db, local(1, 31));
    sqlite.exec("UPDATE transactions SET notes = 'Nota pessoal', tags_json = '[\"fixo\"]'");
    await updateSchedule(db, id, { ...input, nextAt: (await listSchedules(db))[0].nextAt, title: "Novo", amountCents: 20000 }, { updateFuturePending: true, now: local(2, 1) });
    assert.equal(sqlite.prepare("SELECT amount_cents FROM transactions WHERE occurred_at = ?").get(local(1, 31))?.amount_cents, 10000);
    assert.deepEqual(sqlite.prepare("SELECT notes, tags_json, occurred_at, amount_cents FROM transactions WHERE occurred_at = ?").get(local(2, 28)), Object.assign(Object.create(null), { notes: "Nota pessoal", tags_json: '["fixo"]', occurred_at: local(2, 28), amount_cents: 20000 }));
  } finally { sqlite.close(); }
});
