import assert from "node:assert/strict";
import test from "node:test";
import { loadHomeSnapshot } from "../src/services/homeService";
import { createTransaction } from "../src/repositories/transactionRepository";
import { createTestDatabase } from "./helpers/sqlite";

test("home snapshot uses the current local month and orders nearest pending movements without mixing future paid entries", async () => {
  const { sqlite, db } = await createTestDatabase();
  try {
    const now = new Date(2026, 8, 15, 12).getTime();
    const base = { type: "expense" as const, amountCents: 1000, categoryId: "casa", accountId: "principal" };
    await createTransaction(db, { ...base, occurredAt: new Date(2026, 7, 31).getTime() });
    const recent = await createTransaction(db, { ...base, occurredAt: now - 1 });
    const upcoming: string[] = [];
    for (const offset of [4, 1, 3, 2]) {
      const id = await createTransaction(db, { ...base, occurredAt: now + offset * 86400000, status: "pending" });
      upcoming[offset - 1] = id;
    }
    const futurePaid = await createTransaction(db, { ...base, occurredAt: now + 1000 });
    const snapshot = await loadHomeSnapshot(db, now);
    assert.equal(snapshot.period.start, new Date(2026, 8, 1).getTime());
    assert.equal(snapshot.period.end, new Date(2026, 9, 1).getTime());
    assert.equal(snapshot.summaries.find((item) => item.currency === "BRL")?.expense, 2000);
    assert.equal(snapshot.transactions[0].id, recent);
    assert.equal(snapshot.transactions.some((item) => item.id === futurePaid), false);
    assert.deepEqual(snapshot.upcoming.map((item) => item.id), upcoming.slice(0, 3));
  } finally { sqlite.close(); }
});

test("home rejects incomplete loads and retries without pretending failure is an empty financial summary", async () => {
  const { sqlite, db } = await createTestDatabase();
  try {
    sqlite.exec("ALTER TABLE budgets RENAME TO budgets_unavailable");
    await assert.rejects(loadHomeSnapshot(db), /budgets/);
    sqlite.exec("ALTER TABLE budgets_unavailable RENAME TO budgets");
    const snapshot = await loadHomeSnapshot(db);
    assert.deepEqual(snapshot.summaries, [{ currency: "BRL", income: 0, expense: 0, balance: 0 }]);
    assert.ok(snapshot.accounts.length > 0);
    await assert.rejects(loadHomeSnapshot(db, NaN), /período/i);
  } finally { sqlite.close(); }
});
