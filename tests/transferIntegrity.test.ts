import assert from "node:assert/strict";
import test from "node:test";
import { createAccount, createTransfer, listAccounts } from "../src/repositories/financeRepository";
import { deleteTransaction, updateTransaction } from "../src/repositories/transactionRepository";
import { createTestDatabase } from "./helpers/sqlite";
import { resolveTransferSelection } from "../src/utils/accountSelection";

const input = { fromAccountId: "principal", toAccountId: "", amountCents: 5000, occurredAt: 1_800_000_000_000 };

test("transfer selection uses distinct active accounts of the same currency and keeps valid choices", async () => {
  const { sqlite, db } = await createTestDatabase();
  try {
    const reserve = await createAccount(db, { name: "Reserva", type: "savings", color: "#69C5C8" });
    const dollar = await createAccount(db, { name: "Dólares", type: "checking", color: "#69C5C8", currency: "USD" });
    const accounts = await listAccounts(db);
    assert.deepEqual(resolveTransferSelection(accounts, { fromId: null, toId: null }), { fromId: "principal", toId: reserve });
    assert.deepEqual(resolveTransferSelection(accounts, { fromId: reserve, toId: "principal" }), { fromId: reserve, toId: "principal" });
    assert.deepEqual(resolveTransferSelection(accounts, { fromId: "principal", toId: "principal" }), { fromId: "principal", toId: reserve });
    assert.deepEqual(resolveTransferSelection(accounts, { fromId: dollar, toId: reserve }), { fromId: dollar, toId: null });
    const archived = accounts.map((account) => ({ ...account, isArchived: account.id === reserve }));
    assert.deepEqual(resolveTransferSelection(archived, { fromId: "principal", toId: reserve }), { fromId: "principal", toId: null });
    assert.deepEqual(resolveTransferSelection([], { fromId: "principal", toId: reserve }), { fromId: null, toId: null });
  } finally { sqlite.close(); }
});

for (const [name, change] of [
  ["fractional cents", { amountCents: 1.5 }],
  ["unsafe cents", { amountCents: Number.MAX_SAFE_INTEGER + 1 }],
  ["NaN cents", { amountCents: Number.NaN }],
  ["invalid date", { occurredAt: 9_000_000_000_000_000 }],
  ["fractional timestamp", { occurredAt: 1.5 }],
] as const) {
  test(`transfer rejects ${name} without changing balances or audit`, async () => {
    const { sqlite, db } = await createTestDatabase();
    try {
      const toAccountId = await createAccount(db, { name: "Reserva", type: "savings", color: "#69C5C8" });
      const accounts = await listAccounts(db);
      const audit = sqlite.prepare("SELECT * FROM activity_log").all();
      await assert.rejects(createTransfer(db, { ...input, toAccountId, ...change }));
      assert.deepEqual(await listAccounts(db), accounts);
      assert.equal(sqlite.prepare("SELECT COUNT(*) AS count FROM transactions").get()?.count, 0);
      assert.deepEqual(sqlite.prepare("SELECT * FROM activity_log").all(), audit);
    } finally { sqlite.close(); }
  });
}

test("transfer creates a balanced pair and deleting either side preserves unrelated movements", async () => {
  const { sqlite, db } = await createTestDatabase();
  try {
    const toAccountId = await createAccount(db, { name: "Reserva", type: "savings", color: "#69C5C8", openingBalanceCents: 10000 });
    const group = await createTransfer(db, { ...input, toAccountId });
    const unrelated = await createTransfer(db, { ...input, toAccountId, amountCents: 1000 });
    const pair = sqlite.prepare("SELECT id, type, amount_cents, status FROM transactions WHERE transfer_group_id = ?").all(group);
    assert.equal(pair.length, 2);
    assert.equal(pair.reduce((total, row) => total + (row.type === "income" ? Number(row.amount_cents) : -Number(row.amount_cents)), 0), 0);
    assert.ok(pair.every((row) => row.status === "paid"));
    const accounts = await listAccounts(db);
    assert.equal(accounts.find((a) => a.id === "principal")?.balanceCents, -6000);
    assert.equal(accounts.find((a) => a.id === toAccountId)?.balanceCents, 16000);
    await deleteTransaction(db, String(pair.find((row) => row.type === "income")?.id));
    assert.equal(sqlite.prepare("SELECT COUNT(*) AS count FROM transactions WHERE transfer_group_id = ?").get(group)?.count, 0);
    assert.equal(sqlite.prepare("SELECT COUNT(*) AS count FROM transactions WHERE transfer_group_id = ?").get(unrelated)?.count, 2);
  } finally { sqlite.close(); }
});

test("editing a transfer as a normal expense is rejected without changing either side", async () => {
  const { sqlite, db } = await createTestDatabase();
  try {
    const toAccountId = await createAccount(db, { name: "Reserva", type: "savings", color: "#69C5C8" });
    const group = await createTransfer(db, { ...input, toAccountId });
    const before = sqlite.prepare("SELECT * FROM transactions").all();
    const expense = before.find((row) => row.transfer_group_id === group && row.type === "expense");
    await assert.rejects(updateTransaction(db, String(expense?.id), { type: "expense", amountCents: 1000, categoryId: "casa", occurredAt: input.occurredAt }), /não podem ser editadas/);
    assert.deepEqual(sqlite.prepare("SELECT * FROM transactions").all(), before);
  } finally { sqlite.close(); }
});

test("failure inserting the second transfer side rolls back the first side", async () => {
  const { sqlite, db } = await createTestDatabase();
  try {
    const toAccountId = await createAccount(db, { name: "Reserva", type: "savings", color: "#69C5C8" });
    sqlite.exec("CREATE TRIGGER reject_transfer_income BEFORE INSERT ON transactions WHEN NEW.kind = 'transfer' AND NEW.type = 'income' BEGIN SELECT RAISE(ABORT, 'failed second side'); END");
    await assert.rejects(createTransfer(db, { ...input, toAccountId }), /failed second side/);
    assert.equal(sqlite.prepare("SELECT COUNT(*) AS count FROM transactions").get()?.count, 0);
    assert.ok((await listAccounts(db)).every((account) => account.balanceCents === 0));
  } finally { sqlite.close(); }
});

test("transfer rejects identical, missing, archived and different-currency accounts without writes", async () => {
  const { sqlite, db } = await createTestDatabase();
  try {
    const archived = await createAccount(db, { name: "Encerrada", type: "checking", color: "#69C5C8" });
    const dollar = await createAccount(db, { name: "USD", type: "checking", color: "#69C5C8", currency: "USD" });
    sqlite.prepare("UPDATE accounts SET is_archived = 1 WHERE id = ?").run(archived);
    const before = await listAccounts(db, true);
    for (const toAccountId of ["principal", "missing", archived, dollar]) {
      await assert.rejects(createTransfer(db, { ...input, toAccountId }));
      assert.equal(sqlite.prepare("SELECT COUNT(*) AS count FROM transactions").get()?.count, 0);
      assert.deepEqual(await listAccounts(db, true), before);
    }
  } finally { sqlite.close(); }
});
