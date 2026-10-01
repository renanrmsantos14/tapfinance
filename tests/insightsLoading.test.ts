import assert from "node:assert/strict";
import test from "node:test";
import { loadInsightsSnapshot } from "../src/services/insightsService";
import { createAccount } from "../src/repositories/financeRepository";
import { createTransaction } from "../src/repositories/transactionRepository";
import { createTestDatabase } from "./helpers/sqlite";

test("reports separate currencies and category percentages, retain archived history and respect selected month", async () => {
  const { sqlite, db } = await createTestDatabase();
  try {
    const month = new Date(2026, 8, 1).getTime();
    const usd = await createAccount(db, { name: "USD", type: "checking", currency: "USD", color: "#69C5C8" });
    const base = { categoryId: "casa", type: "expense" as const, occurredAt: month };
    await createTransaction(db, { ...base, accountId: "principal", amountCents: 10000 });
    await createTransaction(db, { ...base, accountId: usd, amountCents: 3000 });
    await createTransaction(db, { ...base, categoryId: "alimentacao", accountId: usd, amountCents: 1000 });
    await createTransaction(db, { ...base, accountId: usd, amountCents: 8000, status: "pending" });
    await createTransaction(db, { ...base, accountId: usd, amountCents: 9000, occurredAt: new Date(2026, 9, 1).getTime() });
    sqlite.prepare("UPDATE accounts SET is_archived = 1 WHERE id = ?").run(usd);
    const snapshot = await loadInsightsSnapshot(db, month);
    assert.equal(snapshot.count, 3);
    assert.deepEqual(snapshot.groups.map(({ currency, expense, balance, count }) => ({ currency, expense, balance, count })), [
      { currency: "BRL", expense: 10000, balance: -10000, count: 1 },
      { currency: "USD", expense: 4000, balance: -4000, count: 2 },
    ]);
    const dollars = snapshot.groups.find((item) => item.currency === "USD")!;
    assert.deepEqual(dollars.categories.map(({ id, total, percentage }) => ({ id, total, percentage })), [
      { id: "casa", total: 3000, percentage: 75 },
      { id: "alimentacao", total: 1000, percentage: 25 },
    ]);
    assert.equal((await loadInsightsSnapshot(db, new Date(2026, 9, 1).getTime())).groups.find((item) => item.currency === "USD")?.expense, 9000);
  } finally { sqlite.close(); }
});

test("reports include every expense category instead of silently truncating after eight", async () => {
  const { sqlite, db } = await createTestDatabase();
  try {
    const month = new Date(2026, 8, 1).getTime();
    for (let index = 0; index < 9; index += 1) {
      const categoryId = `report-category-${index}`;
      sqlite.prepare("INSERT INTO categories (id, name, icon, type, position, created_at) VALUES (?, ?, 'house', 'expense', ?, ?)").run(categoryId, `Categoria ${index}`, index + 20, month);
      await createTransaction(db, { categoryId, type: "expense", amountCents: 100, occurredAt: month });
    }
    const snapshot = await loadInsightsSnapshot(db, month);
    assert.equal(snapshot.groups[0].categories.length, 9);
    assert.equal(snapshot.groups[0].categories.reduce((sum, category) => sum + category.total, 0), snapshot.groups[0].expense);
  } finally { sqlite.close(); }
});

test("reports reject incomplete queries and invalid months, then recover without treating errors as zero", async () => {
  const { sqlite, db } = await createTestDatabase();
  try {
    sqlite.exec("ALTER TABLE categories RENAME TO categories_unavailable");
    await assert.rejects(loadInsightsSnapshot(db), /categories/);
    sqlite.exec("ALTER TABLE categories_unavailable RENAME TO categories");
    const snapshot = await loadInsightsSnapshot(db);
    assert.equal(snapshot.count, 0);
    assert.equal(snapshot.groups[0].expense, 0);
    await assert.rejects(loadInsightsSnapshot(db, NaN), /período/i);
  } finally { sqlite.close(); }
});
