import assert from "node:assert/strict";
import test from "node:test";
import { archiveAccount, createAccount, listAccounts } from "../src/repositories/financeRepository";
import { createTestDatabase } from "./helpers/sqlite";

test("concurrent creation on an empty active catalog chooses exactly one primary and distinct positions", async () => {
  const { sqlite, db } = await createTestDatabase();
  try {
    const execute = db.withExclusiveTransactionAsync.bind(db);
    let active = 0; let maximumActive = 0;
    db.withExclusiveTransactionAsync = async (action) => {
      active += 1; maximumActive = Math.max(maximumActive, active);
      try { await execute(action); } finally { active -= 1; }
    };
    sqlite.exec("UPDATE accounts SET is_archived = 1, is_primary = 0");
    await Promise.all([createAccount(db, { name: "Uma", type: "cash", color: "#69C5C8" }), createAccount(db, { name: "Outra", type: "checking", color: "#69C5C8" })]);
    const accounts = await listAccounts(db);
    assert.equal(accounts.length, 2);
    assert.equal(accounts.filter((account) => account.isPrimary).length, 1);
    assert.equal(new Set(accounts.map((account) => account.position)).size, 2);
    assert.equal(maximumActive, 1, "queue must serialize before entering the native transaction API");
  } finally { sqlite.close(); }
});

test("failed account creation leaves the catalog unchanged and does not block the next queued creation", async () => {
  const { sqlite, db } = await createTestDatabase();
  try {
    const before = await listAccounts(db, true);
    sqlite.exec("CREATE TRIGGER reject_account BEFORE INSERT ON accounts WHEN NEW.name = 'Falha' BEGIN SELECT RAISE(ABORT, 'forced creation failure'); END;");
    const results = await Promise.allSettled([createAccount(db, { name: "Falha", type: "cash", color: "#69C5C8" }), createAccount(db, { name: "Válida", type: "checking", color: "#69C5C8" })]);
    assert.equal(results[0].status, "rejected"); assert.equal(results[1].status, "fulfilled");
    const after = await listAccounts(db, true);
    assert.equal(after.length, before.length + 1);
    assert.equal(after.some((account) => account.name === "Falha"), false);
    for (const account of before) assert.deepEqual(after.find((entry) => entry.id === account.id), account);
  } finally { sqlite.close(); }
});

test("creating after archive appends beyond stored positions without changing existing records", async () => {
  const { sqlite, db } = await createTestDatabase();
  try {
    const first = await createAccount(db, { name: "Primeira", type: "cash", color: "#69C5C8" });
    await createAccount(db, { name: "Segunda", type: "checking", color: "#69C5C8" });
    await archiveAccount(db, first);
    const before = await listAccounts(db, true);
    const id = await createAccount(db, { name: "Última", type: "savings", color: "#69C5C8" });
    const after = await listAccounts(db, true);
    assert.equal(after.find((account) => account.id === id)?.position, Math.max(...before.map((account) => account.position)) + 1);
    for (const account of before) assert.deepEqual(after.find((entry) => entry.id === account.id), account);
  } finally { sqlite.close(); }
});
