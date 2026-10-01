import assert from "node:assert/strict";
import test from "node:test";
import { createTransaction, getMonthSummary, getTransaction, updateTransaction } from "../src/repositories/transactionRepository";
import { listAccounts } from "../src/repositories/financeRepository";
import { createTestDatabase } from "./helpers/sqlite";

for (const type of ["income", "expense"] as const) {
  test(`${type} pending entry preserves balance until paid and can return to pending`, async () => {
    const { sqlite, db } = await createTestDatabase();
    try {
      const originalBalance = (await listAccounts(db)).find((item) => item.id === "principal")!.balanceCents;
      const draft = { type, categoryId: type === "income" ? "salario" : "casa", accountId: "principal", amountCents: 2500, occurredAt: Date.now(), status: "pending" as const, title: "Pagamento futuro", notes: "Ainda não liquidado", tags: ["Planejamento"] };
      const id = await createTransaction(db, draft);
      assert.equal((await getTransaction(db, id))?.status, "pending");
      assert.equal((await listAccounts(db)).find((item) => item.id === "principal")?.balanceCents, originalBalance);
      assert.equal((await getMonthSummary(db, draft.occurredAt - 1, draft.occurredAt + 1))?.[type], 0);
      await updateTransaction(db, id, { ...draft, status: "paid" });
      assert.equal((await listAccounts(db)).find((item) => item.id === "principal")?.balanceCents, originalBalance + (type === "income" ? 2500 : -2500));
      assert.equal((await getMonthSummary(db, draft.occurredAt - 1, draft.occurredAt + 1))?.[type], 2500);
      await updateTransaction(db, id, draft);
      assert.equal((await listAccounts(db)).find((item) => item.id === "principal")?.balanceCents, originalBalance);
      assert.deepEqual((await getTransaction(db, id))?.tags, ["Planejamento"]);
      assert.equal(sqlite.prepare("SELECT COUNT(*) AS count FROM transactions WHERE id = ?").get(id)?.count, 1);
    } finally { sqlite.close(); }
  });
}
