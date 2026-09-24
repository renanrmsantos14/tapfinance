import assert from "node:assert/strict";
import test from "node:test";
import type { SQLiteDatabase } from "expo-sqlite";
import { deleteTransaction, updateTransaction } from "../src/repositories/transactionRepository";

test("deleting either transfer side deletes the linked pair in one transaction", async () => {
  const executed: { sql: string; values: unknown[] }[] = [];
  const tx = {
    getFirstAsync: async () => ({ kind: "transfer", transfer_group_id: "pair-1" }),
    runAsync: async (sql: string, ...values: unknown[]) => { executed.push({ sql, values }); return { changes: 2 }; },
  };
  const db = { withExclusiveTransactionAsync: async (action: (transaction: typeof tx) => Promise<void>) => action(tx) } as unknown as SQLiteDatabase;
  await deleteTransaction(db, "one-side");
  assert.equal(executed.length, 1);
  assert.match(executed[0].sql, /DELETE FROM transactions WHERE kind = 'transfer' AND transfer_group_id = \?/);
  assert.deepEqual(executed[0].values, ["pair-1"]);
});

test("editing one transfer side as a normal expense is rejected", async () => {
  let updated = false;
  const db = {
    getFirstAsync: async () => ({ kind: "transfer" }),
    runAsync: async () => { updated = true; },
  } as unknown as SQLiteDatabase;
  await assert.rejects(updateTransaction(db, "one-side", { type: "expense", amountCents: 1000, categoryId: "food", occurredAt: Date.now() }), /não podem ser editadas/);
  assert.equal(updated, false);
});
