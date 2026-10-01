import assert from "node:assert/strict";
import test from "node:test";
import { createTestDatabase } from "./helpers/sqlite";
import { createAccount, createBudget, getBudgetCategoryBreakdown, getBudgetConfiguration, listBudgets, updateBudget } from "../src/repositories/financeRepository";
import { createTransaction } from "../src/repositories/transactionRepository";
import { initializeDatabase } from "../src/database/database";
import { inspectBackupDatabase } from "../src/database/inspectBackup";

const startAt = new Date(2026, 8, 1).getTime();
const endAt = new Date(2026, 9, 1).getTime();
const input = { name: "Gastos", amountCents: 10000, color: "#69C5C8", cycle: "custom" as const, startAt, endAt, categoryLimits: [{ categoryId: "casa", limitCents: 5000 }] };

test("budgets and category limits count only their currency and preserve archived account history", async () => {
  const { sqlite, db } = await createTestDatabase();
  try {
    const usd = await createAccount(db, { name: "Dólares", type: "checking", currency: "USD", color: "#69C5C8" });
    const brlBudget = await createBudget(db, input);
    const usdBudget = await createBudget(db, { ...input, currency: " usd " });
    const draft = { type: "expense" as const, categoryId: "casa", occurredAt: startAt, amountCents: 2000 };
    await createTransaction(db, draft);
    await createTransaction(db, { ...draft, accountId: usd, amountCents: 3000 });
    await createTransaction(db, { ...draft, accountId: usd, amountCents: 7000, status: "pending" });
    sqlite.prepare("UPDATE accounts SET is_archived = 1 WHERE id = ?").run(usd);
    const budgets = await listBudgets(db);
    assert.equal(budgets.find((item) => item.id === brlBudget)?.spentCents, 2000);
    assert.equal(budgets.find((item) => item.id === usdBudget)?.spentCents, 3000);
    assert.equal((await getBudgetConfiguration(db, usdBudget))?.currency, "USD");
    const detail = await getBudgetCategoryBreakdown(db, usdBudget);
    assert.equal(detail?.budget.currency, "USD");
    assert.equal(detail?.budget.spentCents, 3000);
    assert.equal(detail?.categories[0].amountCents, 3000);
    assert.equal(detail?.categories[0].count, 1);
    assert.equal(detail?.categories[0].limitCents, 5000);
    await updateBudget(db, usdBudget, { ...input, name: "Renomeado" });
    assert.equal((await getBudgetConfiguration(db, usdBudget))?.currency, "USD");
    await assert.rejects(updateBudget(db, usdBudget, { ...input, currency: "EUR" }), /moeda/i);
    await assert.rejects(createBudget(db, { ...input, currency: "invalid" }), /moeda/i);
  } finally { sqlite.close(); }
});

test("failed budget migration rolls back its column and version, preserving data for retry", async () => {
  const { sqlite, db } = await createTestDatabase();
  try {
    const id = await createBudget(db, input);
    sqlite.exec("ALTER TABLE budgets DROP COLUMN currency; DELETE FROM schema_migrations WHERE version >= 6; CREATE TRIGGER fail_budget_migration BEFORE INSERT ON schema_migrations WHEN NEW.version = 6 BEGIN SELECT RAISE(ABORT, 'migration failed'); END;");
    await assert.rejects(initializeDatabase(db), /migration failed/);
    assert.equal(sqlite.prepare("PRAGMA table_info(budgets)").all().some((column) => column.name === "currency"), false);
    assert.equal(sqlite.prepare("SELECT MAX(version) AS version FROM schema_migrations").get()?.version, 5);
    assert.equal(sqlite.prepare("SELECT amount_cents FROM budgets WHERE id = ?").get(id)?.amount_cents, 10000);
    sqlite.exec("DROP TRIGGER fail_budget_migration");
    await initializeDatabase(db);
    assert.equal((await getBudgetConfiguration(db, id))?.currency, "BRL");
  } finally { sqlite.close(); }
});

test("v5 budget migration preserves limits and movements, defaults historical BRL and validates v6 backups", async () => {
  const { sqlite, db } = await createTestDatabase();
  try {
    const id = await createBudget(db, input);
    await createTransaction(db, { type: "expense", categoryId: "casa", amountCents: 1000, occurredAt: startAt });
    const movements = sqlite.prepare("SELECT * FROM transactions").all();
    const limits = sqlite.prepare("SELECT * FROM budget_categories").all();
    sqlite.exec("ALTER TABLE budgets DROP COLUMN currency; DELETE FROM schema_migrations WHERE version >= 6");
    assert.equal((await inspectBackupDatabase(db)).schemaVersion, 5);
    await initializeDatabase(db); await initializeDatabase(db);
    assert.equal((await getBudgetConfiguration(db, id))?.currency, "BRL");
    assert.deepEqual(sqlite.prepare("SELECT * FROM transactions").all(), movements);
    assert.deepEqual(sqlite.prepare("SELECT * FROM budget_categories").all(), limits);
    assert.equal((await inspectBackupDatabase(db)).schemaVersion, 6);
    sqlite.exec("ALTER TABLE budgets DROP COLUMN currency");
    await assert.rejects(inspectBackupDatabase(db), /orçamentos/i);
  } finally { sqlite.close(); }
});
