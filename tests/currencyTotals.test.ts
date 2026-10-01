import assert from "node:assert/strict";
import test from "node:test";
import { summarizeTransactionsByCurrency } from "../src/utils/currencyTotals";
import { createAccount } from "../src/repositories/financeRepository";
import { createTransaction, listTransactions } from "../src/repositories/transactionRepository";
import { loadHomeSnapshot } from "../src/services/homeService";
import { createTestDatabase } from "./helpers/sqlite";

test("home keeps BRL, USD and archived account currencies separate in the monthly summary", async () => {
  const { sqlite, db } = await createTestDatabase();
  try {
    const now = new Date(2026, 8, 15, 12).getTime();
    const usd = await createAccount(db, { name: "Dólares", type: "checking", color: "#69C5C8", currency: "USD" });
    const eur = await createAccount(db, { name: "Euros", type: "checking", color: "#69C5C8", currency: "EUR" });
    const base = { occurredAt: now - 1, categoryId: "salario" };
    await createTransaction(db, { ...base, accountId: "principal", type: "income", amountCents: 10000 });
    await createTransaction(db, { ...base, categoryId: "casa", accountId: usd, type: "expense", amountCents: 2000 });
    await createTransaction(db, { ...base, categoryId: "casa", accountId: eur, type: "expense", amountCents: 3000 });
    await createTransaction(db, { ...base, categoryId: "casa", accountId: usd, type: "expense", amountCents: 7000, status: "pending" });
    await createTransaction(db, { ...base, categoryId: "casa", accountId: usd, type: "expense", amountCents: 9000, occurredAt: new Date(2026, 7, 1).getTime() });
    sqlite.prepare("UPDATE accounts SET is_archived = 1 WHERE id = ?").run(eur);
    const snapshot = await loadHomeSnapshot(db, now);
    assert.deepEqual(snapshot.summaries, [
      { currency: "BRL", income: 10000, expense: 0, balance: 10000 },
      { currency: "EUR", income: 0, expense: 3000, balance: -3000 },
      { currency: "USD", income: 0, expense: 2000, balance: -2000 },
    ]);
    assert.equal(snapshot.accounts.some((account) => account.id === eur), false);
    const selected = (await listTransactions(db)).filter((item) => item.accountId === usd && item.occurredAt >= snapshot.period.start);
    assert.deepEqual(summarizeTransactionsByCurrency(selected), [{ currency: "USD", income: 0, expense: 2000, balance: -2000 }]);
  } finally { sqlite.close(); }
});

test("empty and pending-only summaries retain their currency without counting transfers or corrections", () => {
  assert.deepEqual(summarizeTransactionsByCurrency([], [" usd ", "USD", "EUR"]), [
    { currency: "EUR", income: 0, expense: 0, balance: 0 },
    { currency: "USD", income: 0, expense: 0, balance: 0 },
  ]);
  assert.deepEqual(summarizeTransactionsByCurrency([
    { accountCurrency: "USD", amountCents: 1000, type: "expense", status: "pending", kind: "standard" },
    { accountCurrency: "EUR", amountCents: 2000, type: "income", status: "paid", kind: "transfer" },
    { accountCurrency: "USD", amountCents: 3000, type: "income", status: "paid", kind: "correction" },
  ]), [
    { currency: "EUR", income: 0, expense: 0, balance: 0 },
    { currency: "USD", income: 0, expense: 0, balance: 0 },
  ]);
});

test("totals reject unsafe numeric sums rather than displaying rounded financial values", () => {
  const base = { accountCurrency: "BRL", type: "income" as const, status: "paid" as const, kind: "standard" as const };
  assert.throws(() => summarizeTransactionsByCurrency([{ ...base, amountCents: Number.MAX_SAFE_INTEGER }, { ...base, amountCents: 1 }]), /limite/i);
});
