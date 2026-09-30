import assert from "node:assert/strict";
import test from "node:test";
import { createTestDatabase } from "./helpers/sqlite";
import { createGoal, createLoan, listGoals, listLoans, setTrackerArchived, setLoanRemainingBalance, updateGoal, updateLoan } from "../src/repositories/financeRepository";
import { createTransaction } from "../src/repositories/transactionRepository";
import { describeActivity } from "../src/utils/activity";

const goal = { name: "Reserva", type: "income" as const, targetCents: 50000, color: "#69C5C8", dueAt: null };
const loan = { name: "Empréstimo", direction: "borrowed" as const, principalCents: 50000, color: "#69C5C8", dueAt: null };

test("goal editing updates its target and deadline without changing contribution history", async () => {
  const { sqlite, db } = await createTestDatabase();
  try {
    const id = await createGoal(db, goal);
    await createTransaction(db, { type: "income", amountCents: 10000, categoryId: "outros-receita", occurredAt: Date.now(), goalId: id });
    const before = sqlite.prepare("SELECT * FROM transactions").all();
    const dueAt = new Date(2027, 0, 20).getTime();
    await updateGoal(db, id, { ...goal, name: "Viagem", targetCents: 80000, dueAt });
    assert.equal((await listGoals(db))[0].progressCents, 10000);
    assert.equal((await listGoals(db))[0].targetCents, 80000);
    assert.equal((await listGoals(db))[0].dueAt, dueAt);
    assert.deepEqual(sqlite.prepare("SELECT * FROM transactions").all(), before);
  } finally { sqlite.close(); }
});

test("loan reference editing adjusts remaining balance by the difference, preserving paid movements", async () => {
  const { sqlite, db } = await createTestDatabase();
  try {
    for (const direction of ["lent", "borrowed"] as const) {
      const id = await createLoan(db, { ...loan, direction });
      await createTransaction(db, { type: direction === "lent" ? "income" : "expense", amountCents: 10000, categoryId: direction === "lent" ? "outros-receita" : "outros-despesa", occurredAt: Date.now(), loanId: id });
      const before = sqlite.prepare("SELECT * FROM transactions WHERE loan_id = ?").all(id);
      await updateLoan(db, id, { name: "Renomeado", principalCents: 60000, color: loan.color, dueAt: null });
      assert.equal((await listLoans(db)).find((item) => item.id === id)?.remainingCents, 50000);
      assert.deepEqual(sqlite.prepare("SELECT * FROM transactions WHERE loan_id = ?").all(id), before);
    }
  } finally { sqlite.close(); }
});

test("manual loan compensation can increase, reduce and settle balance without account movements", async () => {
  const { sqlite, db } = await createTestDatabase();
  try {
    const id = await createLoan(db, loan);
    const before = sqlite.prepare("SELECT * FROM transactions").all();
    for (const remaining of [30000, 70000, 0]) {
      await setLoanRemainingBalance(db, id, remaining);
      assert.equal((await listLoans(db))[0].remainingCents, remaining);
    }
    assert.deepEqual(sqlite.prepare("SELECT * FROM transactions").all(), before);
    assert.equal(sqlite.prepare("SELECT COUNT(*) AS count FROM activity_log WHERE entity_type = 'loan'").get()?.count, 3);
  } finally { sqlite.close(); }
});

test("archiving and restoring trackers preserve history and default active lists", async () => {
  const { sqlite, db } = await createTestDatabase();
  try {
    const goalId = await createGoal(db, goal); const loanId = await createLoan(db, loan);
    await setTrackerArchived(db, "goals", goalId, true); await setTrackerArchived(db, "loans", loanId, true);
    assert.equal((await listGoals(db)).length, 0); assert.equal((await listLoans(db)).length, 0);
    assert.equal((await listGoals(db, true))[0].isArchived, true);
    assert.equal((await listLoans(db, true))[0].remainingCents, 50000);
    await setTrackerArchived(db, "goals", goalId, false); await setTrackerArchived(db, "loans", loanId, false);
    assert.equal((await listGoals(db)).length, 1); assert.equal((await listLoans(db)).length, 1);
    assert.equal(sqlite.prepare("SELECT COUNT(*) AS count FROM transactions").get()?.count, 1);
  } finally { sqlite.close(); }
});

test("invalid tracker edits and balances do not persist, and failed compensation logging rolls back", async () => {
  const { sqlite, db } = await createTestDatabase();
  try {
    const goalId = await createGoal(db, goal); const loanId = await createLoan(db, loan);
    await assert.rejects(updateGoal(db, goalId, { ...goal, targetCents: 0 }), /valor/i);
    await assert.rejects(updateLoan(db, loanId, { ...loan, dueAt: NaN }), /data/i);
    for (const amount of [-1, 0.5, NaN, Number.MAX_SAFE_INTEGER + 1]) await assert.rejects(setLoanRemainingBalance(db, loanId, amount), /saldo/i);
    sqlite.exec("CREATE TRIGGER fail_adjustment BEFORE INSERT ON activity_log WHEN NEW.entity_type = 'loan' BEGIN SELECT RAISE(ABORT, 'test failure'); END;");
    await assert.rejects(setLoanRemainingBalance(db, loanId, 0), /test failure/);
    assert.equal((await listLoans(db))[0].remainingCents, 50000);
  } finally { sqlite.close(); }
});

test("reference edits without surviving movements apply the new reference exactly once", async () => {
  const { sqlite, db } = await createTestDatabase();
  try {
    const id = await createLoan(db, loan);
    sqlite.prepare("DELETE FROM transactions WHERE loan_id = ?").run(id);
    await updateLoan(db, id, { ...loan, principalCents: 60000 });
    assert.equal((await listLoans(db))[0].remainingCents, 60000);
    await setLoanRemainingBalance(db, id, 40000);
    await updateLoan(db, id, { ...loan, principalCents: 70000 });
    assert.equal((await listLoans(db))[0].remainingCents, 50000);
  } finally { sqlite.close(); }
});

test("compensation history records old and new values and later payments reduce the adjusted balance", async () => {
  const { sqlite, db } = await createTestDatabase();
  try {
    const id = await createLoan(db, loan);
    await setLoanRemainingBalance(db, id, 30000);
    assert.equal(sqlite.prepare("SELECT action FROM activity_log WHERE entity_type = 'loan'").get()?.action, "loan_balance_adjusted:50000:30000");
    await createTransaction(db, { type: "expense", amountCents: 10000, categoryId: "outros-despesa", occurredAt: Date.now(), loanId: id });
    assert.equal((await listLoans(db))[0].remainingCents, 20000);
    assert.equal(describeActivity("loan_balance_adjusted:50000:30000").label, "Saldo compensado manualmente");
    assert.ok(describeActivity("loan_balance_adjusted:50000:30000").detail?.includes("300,00"));
    assert.equal(describeActivity("loan_balance_adjusted:NaN:30000").detail, null);
  } finally { sqlite.close(); }
});

test("failed reference adjustment logging rolls back name, principal and remaining balance", async () => {
  const { sqlite, db } = await createTestDatabase();
  try {
    const id = await createLoan(db, loan);
    sqlite.exec("CREATE TRIGGER fail_reference BEFORE INSERT ON activity_log WHEN NEW.entity_type = 'loan' BEGIN SELECT RAISE(ABORT, 'test failure'); END;");
    await assert.rejects(updateLoan(db, id, { ...loan, name: "Alterado", principalCents: 60000 }), /test failure/);
    const current = (await listLoans(db))[0];
    assert.equal(current.name, loan.name); assert.equal(current.principalCents, 50000); assert.equal(current.remainingCents, 50000);
    await assert.rejects(updateGoal(db, "missing", { ...goal }), /não encontrada/);
    await assert.rejects(setLoanRemainingBalance(db, "missing", 0), /não encontrado/);
  } finally { sqlite.close(); }
});
