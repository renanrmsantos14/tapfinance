import assert from "node:assert/strict";
import test from "node:test";
import { createTransaction, getTransaction } from "../src/repositories/transactionRepository";
import { createGoal, createLoan } from "../src/repositories/financeRepository";
import { buildTransactionCopyDraft } from "../src/services/transactionFormService";
import { createTestDatabase } from "./helpers/sqlite";

test("copy preview preserves editable fields without writing; confirmation creates independent identity", async () => {
  const { sqlite, db } = await createTestDatabase();
  try {
    const goalId = await createGoal(db, { name: "Reserva", type: "expense", targetCents: 100000, color: "#69C5C8" });
    const id = await createTransaction(db, { type: "expense", amountCents: 1000, categoryId: "casa", occurredAt: 1_800_000_000_000, title: "Conta", description: "Parcela", notes: "Comprovante", tags: ["Trabalho"], status: "pending", goalId }, "bank-original");
    const source = await getTransaction(db, id); assert.ok(source);
    const before = sqlite.prepare("SELECT * FROM transactions").all();
    const draft = buildTransactionCopyDraft(source, 1_800_100_000_000);
    assert.deepEqual(sqlite.prepare("SELECT * FROM transactions").all(), before);
    assert.equal(draft.occurredAt, 1_800_100_000_000); assert.equal(draft.title, "Conta"); assert.equal(draft.notes, "Comprovante"); assert.equal(draft.status, "pending"); assert.equal(draft.goalId, goalId); assert.deepEqual(draft.tags, ["Trabalho"]);
    assert.equal("id" in draft, false); assert.equal("sourceSuggestionId" in draft, false);
    assert.notEqual(draft.tags, source.tags);
    const copiedId = await createTransaction(db, draft);
    assert.notEqual(copiedId, id);
    assert.equal(sqlite.prepare("SELECT source_suggestion_id FROM transactions WHERE id = ?").get(copiedId)?.source_suggestion_id, null);
    assert.deepEqual(sqlite.prepare("SELECT * FROM transactions WHERE id = ?").get(id), before[0]);
  } finally { sqlite.close(); }
});

test("initial loan disbursement copy does not inherit loan ownership or recurrence", async () => {
  const { sqlite, db } = await createTestDatabase();
  try {
    const loanId = await createLoan(db, { name: "Notebook", direction: "lent", principalCents: 10000, accountId: "principal", color: "#69C5C8" });
    const loan = sqlite.prepare("SELECT initial_transaction_id FROM loans WHERE id = ?").get(loanId);
    const source = await getTransaction(db, String(loan?.initial_transaction_id)); assert.ok(source);
    const draft = buildTransactionCopyDraft({ ...source, scheduleId: "original-rule" }, Date.now());
    assert.equal(draft.loanId, null); assert.equal(draft.scheduleId, null);
    assert.equal("initialLoanId" in draft, false);
  } finally { sqlite.close(); }
});

test("copy preview rejects partial transfer and administrative correction", async () => {
  const { sqlite, db } = await createTestDatabase();
  try {
    const id = await createTransaction(db, { type: "expense", amountCents: 1000, categoryId: "casa", occurredAt: Date.now() });
    const source = await getTransaction(db, id); assert.ok(source);
    assert.throws(() => buildTransactionCopyDraft({ ...source, kind: "transfer" }, Date.now()), /fluxo específico/);
    assert.throws(() => buildTransactionCopyDraft({ ...source, kind: "correction" }, Date.now()), /fluxo específico/);
  } finally { sqlite.close(); }
});
