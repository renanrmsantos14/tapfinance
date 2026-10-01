import assert from "node:assert/strict";
import test from "node:test";
import { archiveCategory, createCategory, getCategory, listCategories, restoreCategory } from "../src/repositories/categoryRepository";
import { archiveAccount, createAccount, listAccounts, restoreAccount } from "../src/repositories/financeRepository";
import { createTransaction } from "../src/repositories/transactionRepository";
import { createTestDatabase } from "./helpers/sqlite";

test("category management can list archived entries without making them available to new transactions", async () => {
  const { sqlite, db } = await createTestDatabase();
  try {
    await archiveCategory(db, "casa");
    assert.equal((await listCategories(db, "expense")).some((item) => item.id === "casa"), false);
    assert.equal((await listCategories(db, "expense", true)).find((item) => item.id === "casa")?.isActive, false);
  } finally { sqlite.close(); }
});

test("account recovery preserves balance, movements and the current primary account", async () => {
  const { sqlite, db } = await createTestDatabase();
  try {
    const id = await createAccount(db, { name: "Anterior", type: "checking", color: "#69C5C8", openingBalanceCents: -3000 });
    await createTransaction(db, { type: "income", categoryId: "salario", accountId: id, amountCents: 5000, occurredAt: Date.now(), status: "paid" });
    const movements = sqlite.prepare("SELECT * FROM transactions").all();
    await archiveAccount(db, id);
    assert.equal((await listAccounts(db)).some((item) => item.id === id), false);
    await restoreAccount(db, id); await restoreAccount(db, id);
    const accounts = await listAccounts(db);
    assert.equal(accounts.find((item) => item.id === id)?.balanceCents, 2000);
    assert.equal(accounts.find((item) => item.id === id)?.isPrimary, false);
    assert.equal(accounts.filter((item) => item.isPrimary).length, 1);
    assert.equal(accounts.find((item) => item.isPrimary)?.id, "principal");
    assert.deepEqual(sqlite.prepare("SELECT * FROM transactions").all(), movements);
    await assert.rejects(restoreAccount(db, "missing"), /não encontrada/);
  } finally { sqlite.close(); }
});

test("category recovery keeps surviving valid hierarchy and does not recreate detached children", async () => {
  const { sqlite, db } = await createTestDatabase();
  try {
    const child = await createCategory(db, { name: "Condomínio", type: "expense", icon: "house", color: "#69C5C8", parentId: "casa" });
    await createTransaction(db, { type: "expense", categoryId: child, amountCents: 1000, occurredAt: Date.now(), notes: "Preservar", status: "pending" });
    const movements = sqlite.prepare("SELECT * FROM transactions").all();
    await archiveCategory(db, child); await restoreCategory(db, child);
    assert.equal((await getCategory(db, child))?.parentId, "casa");
    await archiveCategory(db, "casa");
    assert.equal((await getCategory(db, child))?.parentId, null);
    await restoreCategory(db, "casa"); await restoreCategory(db, "casa");
    assert.equal((await getCategory(db, child))?.parentId, null);
    assert.deepEqual(sqlite.prepare("SELECT * FROM transactions").all(), movements);
    await assert.rejects(restoreCategory(db, "missing"), /não encontrada/);
  } finally { sqlite.close(); }
});

test("restoring a category with an archived parent makes it a root without guessing a replacement", async () => {
  const { sqlite, db } = await createTestDatabase();
  try {
    const child = await createCategory(db, { name: "Taxas", type: "expense", icon: "house", color: "#69C5C8", parentId: "casa" });
    await archiveCategory(db, child);
    // Simulate a legacy/imported hierarchy that still references an inactive parent.
    sqlite.exec("UPDATE categories SET is_active = 0 WHERE id = 'casa'");
    await restoreCategory(db, child);
    assert.equal((await getCategory(db, child))?.isActive, true);
    assert.equal((await getCategory(db, child))?.parentId, null);
  } finally { sqlite.close(); }
});

test("failed category archive rolls back child detachment", async () => {
  const { sqlite, db } = await createTestDatabase();
  try {
    const child = await createCategory(db, { name: "Taxas", type: "expense", icon: "house", color: "#69C5C8", parentId: "casa" });
    sqlite.exec("CREATE TRIGGER fail_category_archive BEFORE UPDATE OF is_active ON categories WHEN NEW.id = 'casa' AND NEW.is_active = 0 BEGIN SELECT RAISE(ABORT, 'archive failed'); END");
    await assert.rejects(archiveCategory(db, "casa"), /archive failed/);
    assert.equal((await getCategory(db, child))?.parentId, "casa");
    assert.equal((await getCategory(db, "casa"))?.isActive, true);
    await assert.rejects(archiveCategory(db, "missing"), /não encontrada/);
  } finally { sqlite.close(); }
});
