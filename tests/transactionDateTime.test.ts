import assert from "node:assert/strict";
import test from "node:test";
import { formatDate, formatTime, replaceDateAndTime } from "../src/utils/dates";
import { createTransaction, getTransaction, updateTransaction } from "../src/repositories/transactionRepository";
import { createTestDatabase } from "./helpers/sqlite";

test("unchanged date and time preserve exact transaction timestamp and a date change keeps seconds", () => {
  const timestamp = new Date(2026, 8, 30, 10, 12, 30, 123).getTime();
  assert.equal(replaceDateAndTime(timestamp, formatDate(timestamp), formatTime(timestamp)), timestamp);
  assert.equal(replaceDateAndTime(timestamp, "01/10/2026", "10:12"), new Date(2026, 9, 1, 10, 12, 30, 123).getTime());
});

test("explicit clock changes replace hours and minutes and clear hidden seconds", () => {
  const timestamp = new Date(2026, 8, 30, 10, 12, 30, 123).getTime();
  assert.equal(replaceDateAndTime(timestamp, "01/10/2026", "23:59"), new Date(2026, 9, 1, 23, 59).getTime());
  assert.equal(replaceDateAndTime(timestamp, "30/09/2026", "00:00"), new Date(2026, 8, 30).getTime());
});

test("invalid date or clock input is rejected instead of normalized", () => {
  for (const time of ["24:00", "12:60", "-1:00", "9:05", "12", "", "12:30:00"]) assert.equal(replaceDateAndTime(Date.now(), "01/10/2026", time), null);
  for (const date of ["31/02/2026", "01/13/2026", "", "1/10/2026"]) assert.equal(replaceDateAndTime(Date.now(), date, "12:30"), null);
  assert.equal(replaceDateAndTime(NaN, "01/10/2026", "12:30"), null);
});

test("selected date and time persist in SQLite while an untouched bank timestamp remains exact", async () => {
  const { sqlite, db } = await createTestDatabase();
  try {
    const timestamp = new Date(2026, 8, 30, 10, 12, 30, 123).getTime();
    const draft = { type: "expense" as const, amountCents: 1200, accountId: "principal", categoryId: "casa", description: "Teste", occurredAt: replaceDateAndTime(timestamp, formatDate(timestamp), formatTime(timestamp))! };
    const id = await createTransaction(db, draft, "bank-time-test");
    assert.equal((await getTransaction(db, id))?.occurredAt, timestamp);
    const selected = replaceDateAndTime(timestamp, "01/10/2026", "23:59")!;
    await updateTransaction(db, id, { ...draft, occurredAt: selected });
    assert.equal((await getTransaction(db, id))?.occurredAt, new Date(2026, 9, 1, 23, 59).getTime());
  } finally { sqlite.close(); }
});
