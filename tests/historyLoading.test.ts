import assert from "node:assert/strict";
import test from "node:test";
import { loadHistorySnapshot } from "../src/services/historyService";
import { createAccount, listAccounts } from "../src/repositories/financeRepository";
import { archiveCategory, listCategories } from "../src/repositories/categoryRepository";
import { createTransaction } from "../src/repositories/transactionRepository";
import { filterTransactions } from "../src/utils/transactionFilters";
import { createTestDatabase } from "./helpers/sqlite";

test("history keeps archived account and category available for filtering their original movement", async () => {
  const { sqlite, db } = await createTestDatabase();
  try {
    const accountId = await createAccount(db, { name: "Conta encerrada", type: "checking", color: "#123456" });
    const occurredAt = new Date(2026, 8, 10, 12).getTime();
    const id = await createTransaction(db, { accountId, categoryId: "casa", type: "expense", amountCents: 12345, occurredAt });
    await db.runAsync("UPDATE accounts SET is_archived = 1 WHERE id = ?", accountId);
    await archiveCategory(db, "casa");
    const snapshot = await loadHistorySnapshot(db);
    assert.equal(snapshot.accounts.find((item) => item.id === accountId)?.isArchived, true);
    assert.equal(snapshot.categories.find((item) => item.id === "casa")?.isActive, false);
    const result = filterTransactions(snapshot.items, { month: new Date(2026, 8, 1), type: "all", query: "", accountId, categoryId: "casa", status: "all", kind: "all" });
    assert.deepEqual(result.map((item) => item.id), [id]);
    assert.equal(result[0].amountCents, 12345);
    assert.equal((await listAccounts(db)).some((item) => item.id === accountId), false);
    assert.equal((await listCategories(db, "expense")).some((item) => item.id === "casa"), false);
  } finally { sqlite.close(); }
});

test("history rejects an incomplete catalog and recovers without losing existing movements", async () => {
  const { sqlite, db } = await createTestDatabase();
  try {
    const id = await createTransaction(db, { categoryId: "casa", type: "expense", amountCents: 1000, occurredAt: Date.now() });
    sqlite.exec("ALTER TABLE accounts RENAME TO accounts_unavailable");
    await assert.rejects(loadHistorySnapshot(db), /accounts/);
    sqlite.exec("ALTER TABLE accounts_unavailable RENAME TO accounts");
    const snapshot = await loadHistorySnapshot(db);
    assert.deepEqual(snapshot.items.map((item) => item.id), [id]);
    assert.ok(snapshot.categories.some((item) => item.id === "casa"));
  } finally { sqlite.close(); }
});
