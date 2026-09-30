import assert from "node:assert/strict";
import test from "node:test";
import { createTestDatabase } from "./helpers/sqlite";
import { createAccount, createGoal, createLoan, listGoals, listLoans, setPrimaryAccount } from "../src/repositories/financeRepository";
import { createTransaction, deleteTransaction, updateTransaction } from "../src/repositories/transactionRepository";
import type { TransactionDraft } from "../src/types/transaction";

const goalInput = { name: "Reserva", type: "income" as const, targetCents: 50000, color: "#69C5C8" };
const loanInput = { name: "Empréstimo", direction: "borrowed" as const, principalCents: 50000, color: "#69C5C8" };

test("goals and loans reject blank names, invalid money and impossible due dates", async () => {
  const { sqlite, db } = await createTestDatabase();
  try {
    await assert.rejects(createGoal(db, { ...goalInput, name: "  " }), /nome/i);
    await assert.rejects(createLoan(db, { ...loanInput, name: "  " }), /nome/i);
    for (const amount of [0, -100, 1.5, NaN, Number.MAX_SAFE_INTEGER + 1]) {
      await assert.rejects(createGoal(db, { ...goalInput, targetCents: amount }), /valor/i);
      await assert.rejects(createLoan(db, { ...loanInput, principalCents: amount }), /valor/i);
    }
    await assert.rejects(createGoal(db, { ...goalInput, dueAt: NaN }), /data/i);
    await assert.rejects(createLoan(db, { ...loanInput, dueAt: Infinity }), /data/i);
    assert.equal(sqlite.prepare("SELECT COUNT(*) AS count FROM goals").get()?.count, 0);
    assert.equal(sqlite.prepare("SELECT COUNT(*) AS count FROM loans").get()?.count, 0);
  } finally { sqlite.close(); }
});

test("loan without explicit account uses the current primary account", async () => {
  const { sqlite, db } = await createTestDatabase();
  try {
    const accountId = await createAccount(db, { name: "Banco", type: "checking", color: "#69C5C8", openingBalanceCents: 0 });
    await setPrimaryAccount(db, accountId);
    const loanId = await createLoan(db, loanInput);
    assert.equal(sqlite.prepare("SELECT account_id FROM transactions WHERE loan_id = ?").get(loanId)?.account_id, accountId);
  } finally { sqlite.close(); }
});

test("loan rejects missing or archived accounts without leaving a loan or movement", async () => {
  const { sqlite, db } = await createTestDatabase();
  try {
    await assert.rejects(createLoan(db, { ...loanInput, accountId: "missing" }), /conta/i);
    sqlite.exec("UPDATE accounts SET is_archived = 1");
    await assert.rejects(createLoan(db, { ...loanInput, accountId: "principal" }), /conta/i);
    assert.equal(sqlite.prepare("SELECT COUNT(*) AS count FROM loans").get()?.count, 0);
    assert.equal(sqlite.prepare("SELECT COUNT(*) AS count FROM transactions").get()?.count, 0);
  } finally { sqlite.close(); }
});

test("borrowed and lent loans recalculate partial payments, edits and deletions without counting pending", async () => {
  const { sqlite, db } = await createTestDatabase();
  try {
    for (const direction of ["borrowed", "lent"] as const) {
      const loanId = await createLoan(db, { ...loanInput, direction });
      const type = direction === "borrowed" ? "expense" : "income";
      const draft: TransactionDraft = { type, categoryId: type === "expense" ? "outros-despesa" : "outros-receita", amountCents: 10000, occurredAt: Date.now(), loanId };
      const payment = await createTransaction(db, draft);
      await createTransaction(db, { ...draft, amountCents: 5000, status: "pending" });
      assert.equal((await listLoans(db)).find((loan) => loan.id === loanId)?.remainingCents, 40000);
      await updateTransaction(db, payment, { ...draft, amountCents: 20000 });
      assert.equal((await listLoans(db)).find((loan) => loan.id === loanId)?.remainingCents, 30000);
      await deleteTransaction(db, payment);
      assert.equal((await listLoans(db)).find((loan) => loan.id === loanId)?.remainingCents, 50000);
    }
  } finally { sqlite.close(); }
});

test("transfers and balance corrections do not count as goal contributions or loan payments", async () => {
  const { sqlite, db } = await createTestDatabase();
  try {
    const goalId = await createGoal(db, goalInput);
    const loanId = await createLoan(db, loanInput);
    for (const kind of ["transfer", "correction"] as const) {
      await createTransaction(db, { type: "income", amountCents: 10000, categoryId: "outros-receita", occurredAt: Date.now(), goalId, kind });
      await createTransaction(db, { type: "expense", amountCents: 10000, categoryId: "outros-despesa", occurredAt: Date.now(), loanId, kind });
    }
    assert.equal((await listGoals(db))[0].progressCents, 0);
    assert.equal((await listLoans(db))[0].remainingCents, 50000);
  } finally { sqlite.close(); }
});

test("goal preserves its due date and recalculates only paid contributions of the matching type", async () => {
  const { sqlite, db } = await createTestDatabase();
  try {
    const dueAt = new Date(2027, 0, 31).getTime();
    const goalId = await createGoal(db, { ...goalInput, dueAt });
    const draft: TransactionDraft = { type: "income", amountCents: 10000, categoryId: "outros-receita", occurredAt: Date.now(), goalId };
    const contribution = await createTransaction(db, draft);
    await createTransaction(db, { ...draft, status: "pending" });
    await createTransaction(db, { ...draft, type: "expense", categoryId: "outros-despesa" });
    assert.equal((await listGoals(db))[0].dueAt, dueAt);
    assert.equal((await listGoals(db))[0].progressCents, 10000);
    await updateTransaction(db, contribution, { ...draft, amountCents: 20000 });
    assert.equal((await listGoals(db))[0].progressCents, 20000);
    await deleteTransaction(db, contribution);
    assert.equal((await listGoals(db))[0].progressCents, 0);
  } finally { sqlite.close(); }
});

test("failed loan disbursement rolls back the loan itself, then a retry succeeds", async () => {
  const { sqlite, db } = await createTestDatabase();
  try {
    sqlite.exec("CREATE TRIGGER fail_disbursement BEFORE INSERT ON transactions BEGIN SELECT RAISE(ABORT, 'disbursement failed'); END;");
    await assert.rejects(createLoan(db, loanInput), /disbursement failed/);
    assert.equal(sqlite.prepare("SELECT COUNT(*) AS count FROM loans").get()?.count, 0);
    assert.equal(sqlite.prepare("SELECT COUNT(*) AS count FROM transactions").get()?.count, 0);
    sqlite.exec("DROP TRIGGER fail_disbursement");
    const dueAt = new Date(2027, 1, 28).getTime();
    await createLoan(db, { ...loanInput, dueAt });
    assert.equal((await listLoans(db))[0].dueAt, dueAt);
    assert.equal((await listLoans(db))[0].remainingCents, loanInput.principalCents);
  } finally { sqlite.close(); }
});
