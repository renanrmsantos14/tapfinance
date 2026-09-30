import assert from "node:assert/strict";
import test from "node:test";
import { createTestDatabase } from "./helpers/sqlite";
import { initializeDatabase } from "../src/database/database";
import { createLoan, listLoans, setLoanInitialTransaction, updateLoan } from "../src/repositories/financeRepository";
import { createTransaction, deleteTransaction, getTransaction, updateTransaction } from "../src/repositories/transactionRepository";
import { replaceDateKeepingTime } from "../src/utils/dates";

const input = { name: "Empréstimo", direction: "borrowed" as const, principalCents: 50000, color: "#69C5C8", dueAt: null };

test("deleting explicitly linked initial disbursement never erases remaining loan debt", async () => {
  const { sqlite, db } = await createTestDatabase();
  try {
    for (const direction of ["lent", "borrowed"] as const) {
      const id = await createLoan(db, { ...input, direction });
      const initial = String(sqlite.prepare("SELECT id FROM transactions WHERE loan_id = ?").get(id)?.id);
      await createTransaction(db, { type: direction === "lent" ? "income" : "expense", categoryId: direction === "lent" ? "outros-receita" : "outros-despesa", amountCents: 10000, occurredAt: Date.now(), loanId: id });
      await deleteTransaction(db, initial);
      assert.equal((await listLoans(db)).find((item) => item.id === id)?.remainingCents, 40000);
      assert.equal((await listLoans(db)).find((item) => item.id === id)?.initialTransactionId, initial);
    }
  } finally { sqlite.close(); }
});

test("editing initial amount adjusts reference by delta while preserving manual reference adjustments and payments", async () => {
  const { sqlite, db } = await createTestDatabase();
  try {
    const id = await createLoan(db, input);
    const initial = String(sqlite.prepare("SELECT id FROM transactions WHERE loan_id = ?").get(id)?.id);
    await updateLoan(db, id, { ...input, principalCents: 60000 });
    await updateTransaction(db, initial, { type: "income", categoryId: "outros-receita", amountCents: 70000, occurredAt: Date.now(), loanId: id });
    const current = (await listLoans(db))[0];
    assert.equal(current.principalCents, 80000); assert.equal(current.remainingCents, 80000);
    await assert.rejects(updateTransaction(db, initial, { type: "expense", categoryId: "outros-despesa", amountCents: 70000, occurredAt: Date.now(), loanId: id }), /desembolso/i);
    await assert.rejects(updateTransaction(db, initial, { type: "income", categoryId: "outros-receita", amountCents: 70000, occurredAt: Date.now(), loanId: null }), /desembolso/i);
    await assert.rejects(updateTransaction(db, initial, { type: "income", categoryId: "outros-receita", amountCents: 70000, occurredAt: Date.now(), loanId: id, status: "pending" }), /desembolso/i);
  } finally { sqlite.close(); }
});

test("v4 migration never guesses legacy initial transaction and preserves its balance", async () => {
  const { sqlite, db } = await createTestDatabase();
  try {
    const id = await createLoan(db, input);
    const before = sqlite.prepare("SELECT * FROM transactions").all();
    sqlite.exec("ALTER TABLE loans DROP COLUMN initial_transaction_id; DELETE FROM schema_migrations WHERE version >= 5");
    await initializeDatabase(db); await initializeDatabase(db);
    assert.equal((await listLoans(db))[0].initialTransactionId, null);
    assert.equal((await listLoans(db))[0].remainingCents, 50000);
    assert.deepEqual(sqlite.prepare("SELECT * FROM transactions").all(), before);
    const initial = String(sqlite.prepare("SELECT id FROM transactions WHERE loan_id = ?").get(id)?.id);
    await setLoanInitialTransaction(db, id, initial);
    assert.equal((await listLoans(db))[0].remainingCents, 50000);
    await deleteTransaction(db, initial);
    assert.equal((await listLoans(db))[0].remainingCents, 50000);
  } finally { sqlite.close(); }
});

test("manual legacy linking validates paid direction and rolls back if its audit entry fails", async () => {
  const { sqlite, db } = await createTestDatabase();
  try {
    const id = await createLoan(db, input);
    const initial = String(sqlite.prepare("SELECT id FROM transactions WHERE loan_id = ?").get(id)?.id);
    sqlite.prepare("UPDATE loans SET initial_transaction_id = NULL WHERE id = ?").run(id);
    const payment = await createTransaction(db, { type: "expense", categoryId: "outros-despesa", amountCents: 10000, occurredAt: Date.now(), loanId: id });
    await assert.rejects(setLoanInitialTransaction(db, id, payment), /desembolso/i);
    await assert.rejects(setLoanInitialTransaction(db, id, "missing"), /desembolso/i);
    sqlite.exec("CREATE TRIGGER fail_link BEFORE INSERT ON activity_log WHEN NEW.entity_type = 'loan' BEGIN SELECT RAISE(ABORT, 'test failure'); END;");
    await assert.rejects(setLoanInitialTransaction(db, id, initial), /test failure/);
    assert.equal((await listLoans(db))[0].initialTransactionId, null);
    assert.equal((await listLoans(db))[0].remainingCents, 40000);
  } finally { sqlite.close(); }
});

test("initial transaction update and reference changes roll back together", async () => {
  const { sqlite, db } = await createTestDatabase();
  try {
    const id = await createLoan(db, input);
    const initial = String(sqlite.prepare("SELECT id FROM transactions WHERE loan_id = ?").get(id)?.id);
    sqlite.exec("CREATE TRIGGER fail_initial_update BEFORE UPDATE ON transactions BEGIN SELECT RAISE(ABORT, 'test failure'); END;");
    await assert.rejects(updateTransaction(db, initial, { type: "income", categoryId: "outros-receita", amountCents: 60000, occurredAt: Date.now(), loanId: id }), /test failure/);
    assert.equal((await listLoans(db))[0].principalCents, 50000);
    assert.equal(sqlite.prepare("SELECT amount_cents FROM transactions WHERE id = ?").get(initial)?.amount_cents, 50000);
  } finally { sqlite.close(); }
});

test("manual linking preserves compensation and every movement", async () => {
  const { sqlite, db } = await createTestDatabase();
  try {
    const id = await createLoan(db, input);
    const initial = String(sqlite.prepare("SELECT id FROM transactions WHERE loan_id = ?").get(id)?.id);
    sqlite.prepare("UPDATE loans SET initial_transaction_id = NULL, offset_cents = 7000 WHERE id = ?").run(id);
    await createTransaction(db, { type: "expense", categoryId: "outros-despesa", amountCents: 10000, occurredAt: Date.now(), loanId: id });
    const before = sqlite.prepare("SELECT * FROM transactions").all();
    const remaining = (await listLoans(db))[0].remainingCents;
    await setLoanInitialTransaction(db, id, initial);
    assert.equal((await listLoans(db))[0].remainingCents, remaining);
    assert.deepEqual(sqlite.prepare("SELECT * FROM transactions").all(), before);
    assert.equal((await getTransaction(db, initial))?.initialLoanId, id);
  } finally { sqlite.close(); }
});

test("ordinary transaction edits preserve omitted notes, title, account and pending status", async () => {
  const { sqlite, db } = await createTestDatabase();
  try {
    const id = await createTransaction(db, { type: "expense", categoryId: "casa", amountCents: 10000, occurredAt: Date.now(), title: "Título próprio", notes: "Nota pessoal", status: "pending" });
    await updateTransaction(db, id, { type: "expense", categoryId: "casa", amountCents: 20000, occurredAt: Date.now() });
    const row = await getTransaction(db, id);
    assert.equal(row?.title, "Título próprio"); assert.equal(row?.notes, "Nota pessoal"); assert.equal(row?.status, "pending"); assert.equal(row?.accountId, "principal");
    await updateTransaction(db, id, { type: "expense", categoryId: "casa", amountCents: 20000, occurredAt: Date.now(), title: null, notes: null });
    assert.equal((await getTransaction(db, id))?.notes, null); assert.equal((await getTransaction(db, id))?.title, null);
  } finally { sqlite.close(); }
});

test("date-only transaction edits retain the original local time and reject invalid dates", () => {
  const original = new Date(2026, 0, 31, 10, 12, 30, 123).getTime();
  assert.equal(replaceDateKeepingTime(original, "31/01/2026"), original);
  assert.equal(replaceDateKeepingTime(original, "28/02/2026"), new Date(2026, 1, 28, 10, 12, 30, 123).getTime());
  assert.equal(replaceDateKeepingTime(original, "31/02/2026"), null);
});

test("manual linking retains raw credit after overpayment", async () => {
  const { sqlite, db } = await createTestDatabase();
  try {
    const id = await createLoan(db, input);
    const initial = String(sqlite.prepare("SELECT id FROM transactions WHERE loan_id = ?").get(id)?.id);
    sqlite.prepare("UPDATE loans SET initial_transaction_id = NULL, offset_cents = 7000 WHERE id = ?").run(id);
    await createTransaction(db, { type: "expense", categoryId: "outros-despesa", amountCents: 10000, occurredAt: Date.now(), loanId: id });
    const extra = await createTransaction(db, { type: "expense", categoryId: "outros-despesa", amountCents: 60000, occurredAt: Date.now(), loanId: id });
    assert.equal((await listLoans(db))[0].remainingCents, 0);
    await setLoanInitialTransaction(db, id, initial);
    assert.equal((await listLoans(db))[0].remainingCents, 0);
    await deleteTransaction(db, extra);
    assert.equal((await listLoans(db))[0].remainingCents, 47000);
  } finally { sqlite.close(); }
});
