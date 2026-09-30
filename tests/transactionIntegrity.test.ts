import assert from "node:assert/strict";
import test from "node:test";
import { createTestDatabase } from "./helpers/sqlite";
import { createAccount, createGoal, createLoan, createSchedule } from "../src/repositories/financeRepository";
import { createTransaction, getTransaction, updateTransaction } from "../src/repositories/transactionRepository";
import type { TransactionDraft } from "../src/types/transaction";

const draft: TransactionDraft = { type: "expense", categoryId: "casa", amountCents: 10000, occurredAt: 1_800_000_000_000 };

for (const [name, change] of [
  ["zero cents", { amountCents: 0 }],
  ["fractional cents", { amountCents: 1.5 }],
  ["unsafe cents", { amountCents: Number.MAX_SAFE_INTEGER + 1 }],
  ["invalid date range", { occurredAt: 9_000_000_000_000_000 }],
  ["fractional timestamp", { occurredAt: 1.5 }],
  ["incompatible category", { categoryId: "salario" }],
  ["invalid status", { status: "invalid" }],
] as const) {
  test(`transaction creation rejects ${name} without financial or audit writes`, async () => {
    const { sqlite, db } = await createTestDatabase();
    try {
      await assert.rejects(createTransaction(db, { ...draft, ...change } as TransactionDraft));
      assert.equal(sqlite.prepare("SELECT COUNT(*) AS count FROM transactions").get()?.count, 0);
      assert.equal(sqlite.prepare("SELECT COUNT(*) AS count FROM activity_log").get()?.count, 0);
    } finally { sqlite.close(); }
  });
}

test("creation rejects missing and archived references without inserting orphan movements", async () => {
  const { sqlite, db } = await createTestDatabase();
  try {
    const goalId = await createGoal(db, { name: "Reserva", type: "expense", targetCents: 100000, color: "#69C5C8" });
    const loanId = await createLoan(db, { name: "Crédito", direction: "borrowed", principalCents: 100000, color: "#69C5C8" });
    const scheduleId = await createSchedule(db, { title: "Aluguel", type: "expense", amountCents: 10000, accountId: "principal", categoryId: "casa", frequency: "monthly", nextAt: draft.occurredAt, isSubscription: false });
    const accountId = await createAccount(db, { name: "Conta encerrada", type: "checking", color: "#69C5C8" });
    sqlite.prepare("UPDATE accounts SET is_archived = 1 WHERE id = ?").run(accountId);
    sqlite.prepare("UPDATE goals SET is_archived = 1 WHERE id = ?").run(goalId);
    sqlite.prepare("UPDATE loans SET is_archived = 1 WHERE id = ?").run(loanId);
    sqlite.prepare("UPDATE schedules SET is_active = 0 WHERE id = ?").run(scheduleId);
    const before = sqlite.prepare("SELECT * FROM transactions").all();
    for (const change of [{ accountId: "missing" }, { accountId }, { goalId: "missing" }, { goalId }, { loanId: "missing" }, { loanId }, { scheduleId: "missing" }, { scheduleId }]) {
      await assert.rejects(createTransaction(db, { ...draft, ...change }));
      assert.deepEqual(sqlite.prepare("SELECT * FROM transactions").all(), before);
    }
  } finally { sqlite.close(); }
});

test("invalid transaction edits preserve both the movement and audit history", async () => {
  const { sqlite, db } = await createTestDatabase();
  try {
    const id = await createTransaction(db, draft);
    const before = sqlite.prepare("SELECT * FROM transactions").all();
    const activity = sqlite.prepare("SELECT * FROM activity_log").all();
    for (const change of [{ amountCents: 0 }, { categoryId: "salario" }, { accountId: "missing" }, { loanId: "missing" }]) {
      await assert.rejects(updateTransaction(db, id, { ...draft, ...change }));
      assert.deepEqual(sqlite.prepare("SELECT * FROM transactions").all(), before);
      assert.deepEqual(sqlite.prepare("SELECT * FROM activity_log").all(), activity);
    }
  } finally { sqlite.close(); }
});

test("a new transaction without an account uses the current active primary account", async () => {
  const { sqlite, db } = await createTestDatabase();
  try {
    const accountId = await createAccount(db, { name: "Conta principal atual", type: "checking", color: "#69C5C8" });
    sqlite.exec("UPDATE accounts SET is_primary = 0, is_archived = 1 WHERE id = 'principal'");
    sqlite.prepare("UPDATE accounts SET is_primary = 1 WHERE id = ?").run(accountId);
    const id = await createTransaction(db, draft);
    assert.equal((await getTransaction(db, id))?.accountId, accountId);
  } finally { sqlite.close(); }
});

test("editing existing archived references preserves history but assigning them to new movements fails", async () => {
  const { sqlite, db } = await createTestDatabase();
  try {
    const accountId = await createAccount(db, { name: "Conta anterior", type: "checking", color: "#69C5C8" });
    const goalId = await createGoal(db, { name: "Meta anterior", type: "expense", targetCents: 100000, color: "#69C5C8" });
    const id = await createTransaction(db, { ...draft, accountId, goalId, notes: "Comprovante", status: "pending" });
    sqlite.prepare("UPDATE accounts SET is_archived = 1 WHERE id = ?").run(accountId);
    sqlite.prepare("UPDATE goals SET is_archived = 1 WHERE id = ?").run(goalId);
    sqlite.exec("UPDATE categories SET is_active = 0 WHERE id = 'casa'");
    await updateTransaction(db, id, { ...draft, amountCents: 12000 });
    const current = await getTransaction(db, id);
    assert.equal(current?.accountId, accountId); assert.equal(current?.goalId, goalId);
    assert.equal(current?.status, "pending"); assert.equal(current?.notes, "Comprovante"); assert.equal(current?.amountCents, 12000);
    await assert.rejects(createTransaction(db, { ...draft, accountId, goalId }));
  } finally { sqlite.close(); }
});

test("retrying a bank suggestion after archiving its account returns the original transaction", async () => {
  const { sqlite, db } = await createTestDatabase();
  try {
    const id = await createTransaction(db, draft, "suggestion-retry");
    sqlite.exec("UPDATE accounts SET is_archived = 1 WHERE id = 'principal'");
    assert.equal(await createTransaction(db, draft, "suggestion-retry"), id);
    assert.equal(sqlite.prepare("SELECT COUNT(*) AS count FROM transactions").get()?.count, 1);
  } finally { sqlite.close(); }
});
