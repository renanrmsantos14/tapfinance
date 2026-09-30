import assert from "node:assert/strict";
import test from "node:test";
import { createTestDatabase } from "./helpers/sqlite";
import { createBudget, getBudgetCategoryBreakdown, getBudgetConfiguration, listBudgets, updateBudget } from "../src/repositories/financeRepository";
import { createTransaction } from "../src/repositories/transactionRepository";

const startAt = new Date(2026, 0, 1).getTime();
const endAt = new Date(2026, 1, 1).getTime();
const input = { name: "Despesas", amountCents: 100000, color: "#69C5C8", cycle: "custom" as const, startAt, endAt, categoryLimits: [{ categoryId: "casa", limitCents: 50000 }] };

test("budget creation rejects invalid custom periods and dates without persisting", async () => {
  const { sqlite, db } = await createTestDatabase();
  try {
    for (const dates of [{ endAt: null }, { endAt: startAt }, { endAt: startAt - 1 }, { startAt: NaN }, { endAt: Infinity }]) {
      await assert.rejects(createBudget(db, { ...input, ...dates }), /período|data/i);
    }
    assert.equal(sqlite.prepare("SELECT COUNT(*) AS count FROM budgets").get()?.count, 0);
  } finally { sqlite.close(); }
});

test("creation and editing reject invalid, duplicate and missing category limits equally", async () => {
  const { sqlite, db } = await createTestDatabase();
  try {
    const id = await createBudget(db, input);
    for (const categoryLimits of [
      [{ categoryId: "casa", limitCents: 0 }], [{ categoryId: "casa", limitCents: -1 }],
      [{ categoryId: "casa", limitCents: 1.5 }], [{ categoryId: "casa", limitCents: NaN }],
      [{ categoryId: "missing", limitCents: null }], [{ categoryId: "salario", limitCents: null }],
      [{ categoryId: "casa", limitCents: null }, { categoryId: "casa", limitCents: null }],
    ]) {
      await assert.rejects(createBudget(db, { ...input, categoryLimits }), /categoria/i);
      await assert.rejects(updateBudget(db, id, { ...input, categoryLimits }), /categoria/i);
    }
    assert.equal(sqlite.prepare("SELECT COUNT(*) AS count FROM budgets").get()?.count, 1);
    assert.deepEqual((await getBudgetConfiguration(db, id))?.categoryLimits, input.categoryLimits);
  } finally { sqlite.close(); }
});

test("budget totals and breakdown agree and exclude pending, transfers, corrections and period boundaries", async () => {
  const { sqlite, db } = await createTestDatabase();
  try {
    const id = await createBudget(db, input);
    const draft = { type: "expense" as const, categoryId: "casa", amountCents: 10000, occurredAt: startAt };
    await createTransaction(db, draft);
    await createTransaction(db, { ...draft, occurredAt: endAt - 1, amountCents: 5000 });
    await createTransaction(db, { ...draft, occurredAt: endAt });
    await createTransaction(db, { ...draft, status: "pending" });
    await createTransaction(db, { ...draft, kind: "transfer" });
    await createTransaction(db, { ...draft, kind: "correction" });
    await createTransaction(db, { ...draft, categoryId: "lazer" });
    const summary = (await listBudgets(db))[0];
    const details = await getBudgetCategoryBreakdown(db, id);
    assert.equal(summary.spentCents, 15000);
    assert.equal(details?.budget.spentCents, summary.spentCents);
    assert.equal(details?.categories.reduce((sum, item) => sum + item.amountCents, 0), summary.spentCents);
    assert.equal(details?.categories[0].limitCents, 50000);
  } finally { sqlite.close(); }
});

test("failed budget editing rolls back both configuration and category limits", async () => {
  const { sqlite, db } = await createTestDatabase();
  try {
    const id = await createBudget(db, input);
    sqlite.exec("CREATE TRIGGER fail_budget_limit BEFORE INSERT ON budget_categories BEGIN SELECT RAISE(ABORT, 'limit failed'); END;");
    await assert.rejects(updateBudget(db, id, { ...input, name: "Alterado", categoryLimits: [{ categoryId: "lazer", limitCents: null }] }), /limit failed/);
    const stored = await getBudgetConfiguration(db, id);
    assert.equal(stored?.name, input.name);
    assert.deepEqual(stored?.categoryLimits, input.categoryLimits);
  } finally { sqlite.close(); }
});
