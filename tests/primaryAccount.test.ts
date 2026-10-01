import assert from "node:assert/strict";
import test from "node:test";
import { createAccount, listAccounts, setPrimaryAccount } from "../src/repositories/financeRepository";
import { createTestDatabase } from "./helpers/sqlite";

test("concurrent primary account changes serialize and leave exactly one active primary", async () => {
  const { sqlite, db } = await createTestDatabase();
  try {
    const execute = db.withExclusiveTransactionAsync.bind(db);
    let active = 0; let maximumActive = 0;
    db.withExclusiveTransactionAsync = async (action) => {
      active += 1; maximumActive = Math.max(maximumActive, active);
      try { await execute(action); } finally { active -= 1; }
    };
    const first = await createAccount(db, { name: "Primeira", type: "cash", color: "#69C5C8", openingBalanceCents: -100 });
    const second = await createAccount(db, { name: "Segunda", type: "checking", color: "#69C5C8", openingBalanceCents: 200 });
    const before = await listAccounts(db);
    await Promise.all([setPrimaryAccount(db, first), setPrimaryAccount(db, second)]);
    assert.equal(maximumActive, 1, "repository must serialize before entering the native transaction API");
    const after = await listAccounts(db);
    assert.deepEqual(after.filter((account) => account.isPrimary).map((account) => account.id), [second]);
    for (const account of before) {
      assert.equal(after.find((entry) => entry.id === account.id)?.balanceCents, account.balanceCents);
    }
  } finally { sqlite.close(); }
});

test("failed primary assignment restores the previous primary and invalid targets do not change it", async () => {
  const { sqlite, db } = await createTestDatabase();
  try {
    const id = await createAccount(db, { name: "Destino", type: "cash", color: "#69C5C8" });
    const before = await listAccounts(db, true);
    sqlite.exec("CREATE TRIGGER reject_primary BEFORE UPDATE OF is_primary ON accounts WHEN NEW.id != 'principal' AND NEW.is_primary = 1 BEGIN SELECT RAISE(ABORT, 'forced assignment failure'); END;");
    await assert.rejects(setPrimaryAccount(db, id), /forced assignment failure/);
    assert.deepEqual(await listAccounts(db, true), before);
    await assert.rejects(setPrimaryAccount(db, "missing"), /não encontrada/i);
    assert.deepEqual(await listAccounts(db, true), before);
    sqlite.exec("DROP TRIGGER reject_primary");
    await setPrimaryAccount(db, id);
    assert.deepEqual((await listAccounts(db)).filter((account) => account.isPrimary).map((account) => account.id), [id]);
  } finally { sqlite.close(); }
});
