import assert from "node:assert/strict";
import test from "node:test";
import { formatCentsByCurrency } from "../src/utils/currency";
import { createAccount } from "../src/repositories/financeRepository";
import { createTransaction, getTransaction, listTransactions } from "../src/repositories/transactionRepository";
import { createTestDatabase } from "./helpers/sqlite";

test("individual amounts display the account currency without conversion or BRL relabeling", () => {
  assert.equal(formatCentsByCurrency(12345, "BRL"), "R$ 123,45");
  assert.equal(formatCentsByCurrency(12345, "USD"), "USD 123,45");
  assert.equal(formatCentsByCurrency(-12345, "EUR"), "-EUR 123,45");
  assert.equal(formatCentsByCurrency(0, " usd "), "USD 0,00");
  assert.match(formatCentsByCurrency(12345, "invalid"), /Moeda desconhecida/);
  assert.equal(formatCentsByCurrency(12345, "invalid").includes("R$"), false);
});

test("transaction queries expose original account currency without changing the stored cent value", async () => {
  const { sqlite, db } = await createTestDatabase();
  try {
    const accountId = await createAccount(db, { name: "Dólares", type: "checking", color: "#69C5C8", currency: "USD" });
    const id = await createTransaction(db, { type: "expense", amountCents: 12345, categoryId: "casa", accountId, occurredAt: Date.now() });
    const transaction = await getTransaction(db, id);
    assert.equal(transaction?.accountCurrency, "USD");
    assert.equal(transaction?.amountCents, 12345);
    assert.equal((await listTransactions(db)).find((item) => item.id === id)?.accountCurrency, "USD");
  } finally { sqlite.close(); }
});
