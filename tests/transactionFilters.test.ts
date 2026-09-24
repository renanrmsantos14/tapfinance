import assert from "node:assert/strict";
import test from "node:test";
import type { Transaction } from "../src/types/transaction";
import { filterTransactions, transactionDayKey } from "../src/utils/transactionFilters";

const base: Transaction = {
  id: "one", type: "expense", amountCents: 5000, categoryId: "food", categoryName: "Alimentação", categoryIcon: "tag",
  description: "Almoço", occurredAt: new Date(2026, 8, 24, 10).getTime(), createdAt: 0, updatedAt: 0,
  accountId: "main", accountName: "Principal", title: "Restaurante", notes: "Equipe", status: "paid", kind: "standard",
  transferGroupId: null, goalId: null, loanId: null, scheduleId: null,
};

test("transaction filters combine month, account, category, status, kind and search", () => {
  const items = [base, { ...base, id: "two", accountId: "other", status: "pending" as const }, { ...base, id: "three", occurredAt: new Date(2026, 9, 1).getTime() }];
  const filters = { month: new Date(2026, 8, 1), type: "expense" as const, query: "equipe", accountId: "main", categoryId: "food", status: "paid" as const, kind: "standard" as const };
  assert.deepEqual(filterTransactions(items, filters).map((item) => item.id), ["one"]);
  assert.deepEqual(filterTransactions(items, { ...filters, kind: "transfer" }).map((item) => item.id), []);
});

test("day grouping key follows local calendar date", () => {
  assert.equal(transactionDayKey(new Date(2026, 8, 24, 23, 59).getTime()), "2026-09-24");
});
