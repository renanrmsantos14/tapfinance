import assert from "node:assert/strict";
import test from "node:test";
import type { Transaction } from "../src/types/transaction";
import { filterTransactions, getTransactionTagOptions, transactionDayKey } from "../src/utils/transactionFilters";

const base: Transaction = {
  id: "one", type: "expense", amountCents: 5000, categoryId: "food", categoryName: "Alimentação", categoryIcon: "tag",
  description: "Almoço", occurredAt: new Date(2026, 8, 24, 10).getTime(), createdAt: 0, updatedAt: 0,
  accountId: "main", accountName: "Principal", title: "Restaurante", notes: "Equipe", status: "paid", kind: "standard",
  transferGroupId: null, goalId: null, loanId: null, scheduleId: null, tags: [],
};

test("transaction search finds tags without changing other filters", () => {
  const items = [{ ...base, tags: ["Viagem executiva"] }, { ...base, id: "two", tags: ["Trabalho"], accountId: "other" }];
  const filters = { month: new Date(2026, 8, 1), type: "all" as const, query: "VIAGEM", accountId: "main", categoryId: null, status: "all" as const, kind: "all" as const };
  assert.deepEqual(filterTransactions(items, filters).map((item) => item.id), ["one"]);
});

test("transaction filters combine month, account, category, status, kind and search", () => {
  const items = [base, { ...base, id: "two", accountId: "other", status: "pending" as const }, { ...base, id: "three", occurredAt: new Date(2026, 9, 1).getTime() }];
  const filters = { month: new Date(2026, 8, 1), type: "expense" as const, query: "equipe", accountId: "main", categoryId: "food", status: "paid" as const, kind: "standard" as const };
  assert.deepEqual(filterTransactions(items, filters).map((item) => item.id), ["one"]);
  assert.deepEqual(filterTransactions(items, { ...filters, kind: "transfer" }).map((item) => item.id), []);
});

test("day grouping key follows local calendar date", () => {
  assert.equal(transactionDayKey(new Date(2026, 8, 24, 23, 59).getTime()), "2026-09-24");
});

test("exact tag filter is independent from text search and combines with the other filters", () => {
  const filters = { month: new Date(2026, 8, 1), type: "all" as const, query: "", accountId: null, categoryId: null, status: "paid" as const, kind: "standard" as const, tag: "viagem" };
  const items = [{ ...base, tags: ["Viagem"] }, { ...base, id: "partial", tags: ["Viagem executiva"] }, { ...base, id: "text-only", description: "Viagem", tags: [] }, { ...base, id: "pending", tags: ["VIAGEM"], status: "pending" as const }];
  assert.deepEqual(filterTransactions(items, filters).map((item) => item.id), ["one"]);
  assert.deepEqual(filterTransactions(items, { ...filters, query: "missing" }), []);
  assert.deepEqual(filterTransactions(items, { ...filters, tag: "" }).map((item) => item.id), ["text-only"]);
  assert.equal(filterTransactions(items, { ...filters, tag: null }).length, 3);
});

test("tag options deduplicate normalized names without mutating transactions or dropping an unavailable selection", () => {
  const items = [{ ...base, tags: ["Refeição", "Trabalho"] }, { ...base, id: "two", tags: [" REFEIÇÃO ", "trabalho", ""] }];
  const before = structuredClone(items);
  const options = getTransactionTagOptions(items, "Viagem");
  assert.deepEqual(options, ["Refeição", "Trabalho", "Viagem"]);
  assert.ok(getTransactionTagOptions(items, "TRABALHO").includes("TRABALHO"));
  assert.deepEqual(items, before);
  assert.deepEqual(filterTransactions(items, { month: new Date(2026, 8, 1), type: "all", query: "", accountId: null, categoryId: null, status: "all", kind: "all", tag: "REFEIÇÃO" }).map((item) => item.id), ["one", "two"]);
});

test("an exact range replaces the calendar month and keeps its end exclusive", () => {
  const items = [base, { ...base, id: "two", occurredAt: new Date(2026, 8, 7, 23, 59).getTime() }, { ...base, id: "three", occurredAt: new Date(2026, 8, 8).getTime() }];
  const filters = { month: new Date(2026, 0, 1), type: "all" as const, query: "", accountId: null, categoryId: null, status: "all" as const, kind: "all" as const };
  assert.deepEqual(filterTransactions(items, { ...filters, range: { start: new Date(2026, 8, 1).getTime(), end: new Date(2026, 8, 8).getTime() } }).map((item) => item.id), ["two"]);
  assert.deepEqual(filterTransactions(items, { ...filters, range: null }).map((item) => item.id), []);
});
