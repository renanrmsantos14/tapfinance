import assert from "node:assert/strict";
import test from "node:test";
import { loadCalendarSnapshot, calendarMonthDays, getCalendarDayTransactions } from "../src/services/calendarService";
import { createAccount } from "../src/repositories/financeRepository";
import { createTransaction } from "../src/repositories/transactionRepository";
import { createTestDatabase } from "./helpers/sqlite";

test("calendar grids use Monday-first full weeks, leap years and valid month dates", () => {
  const february = calendarMonthDays(new Date(2024, 1, 1));
  assert.deepEqual(february.slice(0, 4), [null, null, null, 1]);
  assert.equal(february.includes(29), true);
  assert.equal(february.length, 35);
  assert.equal(calendarMonthDays(new Date(2026, 2, 1)).length, 42);
  assert.equal(calendarMonthDays(new Date(2026, 1, 1)).includes(29), false);
  assert.throws(() => calendarMonthDays(new Date(NaN)), /período/i);
});

test("calendar keeps currencies separate, counts pending days and selects only the chosen local date", async () => {
  const { sqlite, db } = await createTestDatabase();
  try {
    const month = new Date(2026, 8, 1).getTime();
    const usd = await createAccount(db, { name: "Dólares", type: "checking", currency: "USD", color: "#69C5C8" });
    const base = { type: "expense" as const, categoryId: "casa", occurredAt: new Date(2026, 8, 15, 23, 59).getTime() };
    const real = await createTransaction(db, { ...base, accountId: "principal", amountCents: 1000 });
    const pending = await createTransaction(db, { ...base, accountId: usd, amountCents: 7000, status: "pending" });
    const dollars = await createTransaction(db, { ...base, accountId: usd, amountCents: 2000, occurredAt: new Date(2026, 8, 16).getTime() });
    await createTransaction(db, { ...base, amountCents: 9999, occurredAt: new Date(2026, 9, 1).getTime() });
    sqlite.prepare("UPDATE accounts SET is_archived = 1 WHERE id = ?").run(usd);
    const snapshot = await loadCalendarSnapshot(db, month);
    assert.equal(snapshot.items.length, 3);
    assert.deepEqual(snapshot.summaries, [
      { currency: "BRL", income: 0, expense: 1000, balance: -1000 },
      { currency: "USD", income: 0, expense: 2000, balance: -2000 },
    ]);
    assert.equal(snapshot.dayCounts[15], 2);
    assert.equal(snapshot.dayCounts[16], 1);
    assert.deepEqual(new Set(getCalendarDayTransactions(snapshot, 15).map((item) => item.id)), new Set([real, pending]));
    assert.deepEqual(getCalendarDayTransactions(snapshot, 16).map((item) => item.id), [dollars]);
    assert.equal(getCalendarDayTransactions(snapshot, null).length, 3);
    assert.equal(getCalendarDayTransactions(snapshot, 14).length, 0);
    assert.throws(() => getCalendarDayTransactions(snapshot, 31), /dia/i);
  } finally { sqlite.close(); }
});

test("calendar rejects incomplete loads and invalid periods, then retries with verified empty data", async () => {
  const { sqlite, db } = await createTestDatabase();
  try {
    sqlite.exec("ALTER TABLE categories RENAME TO unavailable_categories");
    await assert.rejects(loadCalendarSnapshot(db), /categories/);
    sqlite.exec("ALTER TABLE unavailable_categories RENAME TO categories");
    const snapshot = await loadCalendarSnapshot(db);
    assert.equal(snapshot.items.length, 0);
    assert.deepEqual(snapshot.summaries, [{ currency: "BRL", income: 0, expense: 0, balance: 0 }]);
    await assert.rejects(loadCalendarSnapshot(db, NaN), /período/i);
  } finally { sqlite.close(); }
});
