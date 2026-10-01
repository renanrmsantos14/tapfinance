import assert from "node:assert/strict";
import test from "node:test";
import { createTransaction, listTransactions } from "../src/repositories/transactionRepository";
import { importCsv } from "../src/services/importService";
import { parseCsvPreview } from "../src/utils/csvImport";
import { serializeTransactionsCsv } from "../src/utils/csvExport";
import { createTestDatabase } from "./helpers/sqlite";
import { createAccount, createTransfer } from "../src/repositories/financeRepository";
import { createCategory } from "../src/repositories/categoryRepository";

test("CSV round trip preserves transaction metadata and reimport is idempotent", async () => {
  const source = await createTestDatabase(); const target = await createTestDatabase();
  try {
    await createTransaction(source.db, { type: "expense", amountCents: 3290, categoryId: "casa", occurredAt: new Date(2026, 8, 24, 14, 30, 25, 678).getTime(), description: "Conta, com aspas \"x\"", title: null, notes: "Primeira linha\nSegunda, linha", tags: ["São Paulo", "Cliente, especial"], status: "pending" });
    const items = await listTransactions(source.db);
    const preview = parseCsvPreview(serializeTransactionsCsv(items));
    assert.deepEqual(await importCsv(target.db, preview), { imported: 1, skipped: 0 });
    const restored = (await listTransactions(target.db))[0];
    const original = items[0];
    for (const key of ["id", "type", "amountCents", "occurredAt", "description", "title", "notes", "status", "kind", "tags"] as const) assert.deepEqual(restored[key], original[key], key);
    assert.deepEqual(await importCsv(target.db, preview), { imported: 0, skipped: 1 });
    assert.equal((await listTransactions(target.db)).length, 1);
  } finally { source.sqlite.close(); target.sqlite.close(); }
});

test("invalid metadata in a later CSV row rolls back movements, accounts, categories and activity", async () => {
  const { sqlite, db } = await createTestDatabase();
  try {
    const preview = parseCsvPreview('data,tipo,categoria,descrição,valor,conta\n24/09/2026,despesa,Nova categoria,Um,"R$ 10,00",Nova conta\n24/09/2026,despesa,Nova categoria,Dois,"R$ 20,00",Nova conta');
    preview.rows[1].tags = ["x".repeat(51)];
    const beforeAccounts = sqlite.prepare("SELECT * FROM accounts").all();
    const beforeCategories = sqlite.prepare("SELECT * FROM categories").all();
    await assert.rejects(importCsv(db, preview), /tag/);
    assert.equal(sqlite.prepare("SELECT COUNT(*) AS count FROM transactions").get()?.count, 0);
    assert.equal(sqlite.prepare("SELECT COUNT(*) AS count FROM activity_log").get()?.count, 0);
    assert.deepEqual(sqlite.prepare("SELECT * FROM accounts").all(), beforeAccounts);
    assert.deepEqual(sqlite.prepare("SELECT * FROM categories").all(), beforeCategories);
  } finally { sqlite.close(); }
});

test("CSV import never guesses among equivalent active account or category names", async () => {
  const { sqlite, db } = await createTestDatabase();
  try {
    const csv = 'data,tipo,categoria,descrição,valor,conta\n24/09/2026,despesa,Casa,Um,"R$ 10,00",Principal';
    const duplicate = await createAccount(db, { name: "PRINCIPAL", type: "checking", color: "#69C5C8" });
    await assert.rejects(importCsv(db, parseCsvPreview(csv)), /contas com nomes equivalentes/);
    sqlite.prepare("UPDATE accounts SET is_archived = 1 WHERE id = ?").run(duplicate);
    await createCategory(db, { name: "CASA", type: "expense", color: "#69C5C8", icon: "house", parentId: null });
    await assert.rejects(importCsv(db, parseCsvPreview(csv)), /categorias com nomes equivalentes/);
    assert.equal(sqlite.prepare("SELECT COUNT(*) AS count FROM transactions").get()?.count, 0);
    assert.equal(sqlite.prepare("SELECT COUNT(*) AS count FROM activity_log").get()?.count, 0);
  } finally { sqlite.close(); }
});

test("CSV transfer group cannot merge into an unrelated existing pair", async () => {
  const { sqlite, db } = await createTestDatabase();
  try {
    const reserve = await createAccount(db, { name: "Reserva", type: "savings", color: "#69C5C8" });
    const group = await createTransfer(db, { fromAccountId: "principal", toAccountId: reserve, amountCents: 1000, occurredAt: Date.now() });
    const before = sqlite.prepare("SELECT * FROM transactions").all();
    const preview = parseCsvPreview(`data,tipo,categoria,descrição,valor,conta,natureza,grupo_transferencia\n24/09/2026,despesa,Outros,Nova,"R$ 20,00",Principal,transfer,${group}\n24/09/2026,receita,Outros,Nova,"R$ 20,00",Reserva,transfer,${group}`);
    await assert.rejects(importCsv(db, preview), /grupo.*transferência/i);
    assert.deepEqual(sqlite.prepare("SELECT * FROM transactions").all(), before);
  } finally { sqlite.close(); }
});
