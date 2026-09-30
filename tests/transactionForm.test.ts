import assert from "node:assert/strict";
import test from "node:test";
import { createTestDatabase } from "./helpers/sqlite";
import { createAccount, createLoan, listAccounts } from "../src/repositories/financeRepository";
import { createTransaction, getTransaction } from "../src/repositories/transactionRepository";
import { getTrackerFormPrefill, loadTransactionFormReferences, resolveTransactionFormSelection } from "../src/services/transactionFormService";

test("editing references include only the original archived account and category", async () => {
  const { sqlite, db } = await createTestDatabase();
  try {
    const originalAccount = await createAccount(db, { name: "Conta antiga", type: "checking", color: "#69C5C8" });
    const otherArchived = await createAccount(db, { name: "Outra conta encerrada", type: "cash", color: "#69C5C8" });
    const id = await createTransaction(db, { type: "expense", amountCents: 10000, categoryId: "casa", accountId: originalAccount, occurredAt: Date.now() });
    sqlite.prepare("UPDATE accounts SET is_archived = 1 WHERE id IN (?, ?)").run(originalAccount, otherArchived);
    sqlite.exec("UPDATE categories SET is_active = 0 WHERE id IN ('casa', 'lazer')");
    const transaction = await getTransaction(db, id);
    assert.ok(transaction);
    const refs = await loadTransactionFormReferences(db, "expense", transaction);
    const selection = resolveTransactionFormSelection(refs, "casa", originalAccount);
    assert.deepEqual(selection, { categoryId: "casa", accountId: originalAccount });
    assert.equal(refs.categories.find((category) => category.id === "casa")?.isActive, false);
    assert.equal(refs.accounts.find((account) => account.id === originalAccount)?.isArchived, true);
    assert.equal(refs.categories.some((category) => category.id === "lazer"), false);
    assert.equal(refs.accounts.some((account) => account.id === otherArchived), false);
    assert.equal((await listAccounts(db)).some((account) => account.id === originalAccount), false);
  } finally { sqlite.close(); }
});

test("new forms do not offer archived references and type changes cannot retain incompatible category", async () => {
  const { sqlite, db } = await createTestDatabase();
  try {
    sqlite.exec("UPDATE categories SET is_active = 0 WHERE id = 'casa'");
    const refs = await loadTransactionFormReferences(db, "income", { categoryId: "casa", accountId: "principal" });
    assert.equal(refs.categories.some((category) => category.id === "casa"), false);
    const selection = resolveTransactionFormSelection(refs, "casa", "principal");
    assert.ok(selection.categoryId);
    assert.equal(refs.categories.find((category) => category.id === selection.categoryId)?.type, "income");
    assert.equal(selection.accountId, "principal");
    sqlite.exec("UPDATE accounts SET is_archived = 1 WHERE id = 'principal'");
    assert.equal((await loadTransactionFormReferences(db, "income")).accounts.length, 0);
  } finally { sqlite.close(); }
});

test("reference failure is not an empty result and retry preserves valid selections", async () => {
  const { sqlite, db } = await createTestDatabase();
  try {
    const account = await createAccount(db, { name: "Carteira", type: "cash", color: "#69C5C8" });
    sqlite.exec("ALTER TABLE categories RENAME TO categories_unavailable");
    await assert.rejects(loadTransactionFormReferences(db, "expense"));
    sqlite.exec("ALTER TABLE categories_unavailable RENAME TO categories");
    const refs = await loadTransactionFormReferences(db, "expense");
    assert.deepEqual(resolveTransactionFormSelection(refs, "casa", account), { categoryId: "casa", accountId: account });
  } finally { sqlite.close(); }
});

test("empty reference lists remain empty instead of selecting fabricated IDs", () => {
  assert.deepEqual(resolveTransactionFormSelection({ categories: [], accounts: [], goals: [], loans: [] }, "missing", "missing"), { categoryId: null, accountId: null });
});

test("late tracker prefill preserves fields already edited while loading", async () => {
  const { sqlite, db } = await createTestDatabase();
  try {
    const loanId = await createLoan(db, { name: "Notebook", direction: "lent", principalCents: 50000, color: "#69C5C8" });
    const refs = await loadTransactionFormReferences(db, "expense");
    const result = getTrackerFormPrefill(refs, { loanId }, { type: "expense", amountCents: 12000, description: "Pagamento parcial escolhido" }, { type: true, amount: true, description: true });
    assert.deepEqual(result, { type: "expense", amountCents: 12000, description: "Pagamento parcial escolhido", linkedId: `loan:${loanId}` });
    const untouched = getTrackerFormPrefill(refs, { loanId }, { type: "expense", amountCents: 0, description: "" }, { type: false, amount: false, description: false });
    assert.deepEqual(untouched, { type: "income", amountCents: 50000, description: "Pagamento de Notebook", linkedId: `loan:${loanId}` });
    assert.equal(getTrackerFormPrefill(refs, { loanId: "missing" }, { type: "expense", amountCents: 100, description: "" }, { type: false, amount: false, description: false }), null);
  } finally { sqlite.close(); }
});
