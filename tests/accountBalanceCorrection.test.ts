import assert from "node:assert/strict";
import test from "node:test";
import { archiveAccount, correctAccountBalance, createAccount, listAccounts } from "../src/repositories/financeRepository";
import { createTransaction, deleteTransaction, getMonthSummary } from "../src/repositories/transactionRepository";
import { describeActivity } from "../src/utils/activity";
import { createTestDatabase } from "./helpers/sqlite";

test("paid balance corrections affect account balance but not income or expense totals", async () => {
  const { sqlite, db } = await createTestDatabase();
  try {
    const occurredAt = Date.now();
    await createTransaction(db, { type: "income", categoryId: "outros-receita", amountCents: 5000, occurredAt, kind: "correction" });
    await createTransaction(db, { type: "expense", categoryId: "outros-despesa", amountCents: 1200, occurredAt, kind: "correction" });
    await createTransaction(db, { type: "income", categoryId: "outros-receita", amountCents: 9000, occurredAt, kind: "correction", status: "pending" });
    assert.equal((await listAccounts(db))[0].balanceCents, 3800);
    assert.deepEqual({ ...await getMonthSummary(db, occurredAt - 1, occurredAt + 1) }, { income: 0, expense: 0 });
  } finally { sqlite.close(); }
});

test("signed and zero corrections preserve opening balance and previous transactions; deletion reverses the movement", async () => {
  const { sqlite, db } = await createTestDatabase();
  try {
    const accountId = await createAccount(db, { name: "Conta", type: "checking", color: "#69C5C8", openingBalanceCents: 10000 });
    await createTransaction(db, { type: "expense", amountCents: 2000, accountId, categoryId: "casa", occurredAt: Date.now(), status: "paid" });
    const previous = sqlite.prepare("SELECT * FROM transactions").all();
    const id = await correctAccountBalance(db, { accountId, expectedBalanceCents: 8000, balanceCents: -3000, notes: "Conferência" });
    assert.ok(id);
    assert.equal((await listAccounts(db)).find((account) => account.id === accountId)?.balanceCents, -3000);
    const movement = sqlite.prepare("SELECT * FROM transactions WHERE id = ?").get(id);
    assert.equal(movement?.kind, "correction"); assert.equal(movement?.status, "paid"); assert.equal(movement?.type, "expense"); assert.equal(movement?.amount_cents, 11000); assert.equal(movement?.notes, "Conferência");
    assert.deepEqual(sqlite.prepare("SELECT * FROM transactions WHERE id != ?").all(id), previous);
    assert.equal(sqlite.prepare("SELECT opening_balance_cents FROM accounts WHERE id = ?").get(accountId)?.opening_balance_cents, 10000);
    assert.equal(sqlite.prepare("SELECT COUNT(*) AS count FROM activity_log WHERE action = 'account_balance_adjusted:8000:-3000'").get()?.count, 1);
    const zeroId = await correctAccountBalance(db, { accountId, expectedBalanceCents: -3000, balanceCents: 0 });
    assert.ok(zeroId); assert.equal((await listAccounts(db)).find((account) => account.id === accountId)?.balanceCents, 0);
    await deleteTransaction(db, zeroId);
    assert.equal((await listAccounts(db)).find((account) => account.id === accountId)?.balanceCents, -3000);
    assert.deepEqual(describeActivity("account_balance_adjusted:8000:-3000"), { label: "Saldo da conta corrigido", detail: "R$ 80,00 → -R$ 30,00" });
  } finally { sqlite.close(); }
});

test("identical concurrent corrections create only one movement and one account adjustment", async () => {
  const { sqlite, db } = await createTestDatabase();
  try {
    const input = { accountId: "principal", expectedBalanceCents: 0, balanceCents: 5000 };
    const ids = await Promise.all([correctAccountBalance(db, input), correctAccountBalance(db, input)]);
    assert.equal(ids.filter(Boolean).length, 1);
    assert.equal(sqlite.prepare("SELECT COUNT(*) AS count FROM transactions").get()?.count, 1);
    assert.equal(sqlite.prepare("SELECT COUNT(*) AS count FROM activity_log WHERE entity_type = 'account'").get()?.count, 1);
    assert.equal((await listAccounts(db))[0].balanceCents, 5000);
  } finally { sqlite.close(); }
});

test("invalid targets and stale confirmation preserve financial records", async () => {
  const { sqlite, db } = await createTestDatabase();
  try {
    const archived = await createAccount(db, { name: "Encerrada", type: "cash", color: "#69C5C8" });
    await archiveAccount(db, archived);
    const previous = sqlite.prepare("SELECT * FROM transactions").all();
    for (const input of [
      { accountId: "missing", balanceCents: 100, expectedBalanceCents: 0 },
      { accountId: archived, balanceCents: 100, expectedBalanceCents: 0 },
      { accountId: "principal", balanceCents: 1.5, expectedBalanceCents: 0 },
      { accountId: "principal", balanceCents: Number.MAX_SAFE_INTEGER + 1, expectedBalanceCents: 0 },
      { accountId: "principal", balanceCents: 100, expectedBalanceCents: 999 },
    ]) await assert.rejects(correctAccountBalance(db, input));
    assert.deepEqual(sqlite.prepare("SELECT * FROM transactions").all(), previous);
    assert.equal(sqlite.prepare("SELECT COUNT(*) AS count FROM activity_log").get()?.count, 0);
  } finally { sqlite.close(); }
});

test("audit failure rolls back correction and its transaction audit", async () => {
  const { sqlite, db } = await createTestDatabase();
  try {
    sqlite.exec("CREATE TRIGGER fail_balance_audit BEFORE INSERT ON activity_log WHEN NEW.entity_type = 'account' BEGIN SELECT RAISE(ABORT, 'audit failed'); END");
    await assert.rejects(correctAccountBalance(db, { accountId: "principal", expectedBalanceCents: 0, balanceCents: 10000 }), /audit failed/);
    assert.equal((await listAccounts(db))[0].balanceCents, 0);
    assert.equal(sqlite.prepare("SELECT COUNT(*) AS count FROM transactions").get()?.count, 0);
    assert.equal(sqlite.prepare("SELECT COUNT(*) AS count FROM activity_log").get()?.count, 0);
  } finally { sqlite.close(); }
});

test("an unsafe difference between valid signed balances is rejected without losing precision", async () => {
  const { sqlite, db } = await createTestDatabase();
  try {
    const accountId = await createAccount(db, { name: "Limite", type: "checking", color: "#69C5C8", openingBalanceCents: Number.MAX_SAFE_INTEGER });
    await assert.rejects(correctAccountBalance(db, { accountId, expectedBalanceCents: Number.MAX_SAFE_INTEGER, balanceCents: -Number.MAX_SAFE_INTEGER }), /diferença/);
    assert.equal((await listAccounts(db)).find((account) => account.id === accountId)?.balanceCents, Number.MAX_SAFE_INTEGER);
    assert.equal(sqlite.prepare("SELECT COUNT(*) AS count FROM transactions").get()?.count, 0);
  } finally { sqlite.close(); }
});
