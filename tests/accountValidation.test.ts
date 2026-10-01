import assert from "node:assert/strict";
import test from "node:test";
import { createAccount, listAccounts, updateAccount } from "../src/repositories/financeRepository";
import { createTestDatabase } from "./helpers/sqlite";

test("account creation rejects unsafe or fractional opening balances without writing", async () => {
  const { sqlite, db } = await createTestDatabase();
  try {
    const before = await listAccounts(db, true);
    for (const openingBalanceCents of [0.5, -0.5, NaN, Infinity, -Infinity, Number.MAX_SAFE_INTEGER + 1]) {
      await assert.rejects(createAccount(db, { name: "Inválida", type: "checking", color: "#69C5C8", openingBalanceCents }), /saldo/i);
    }
    assert.deepEqual(await listAccounts(db, true), before);
  } finally { sqlite.close(); }
});

test("account editing rejects unsafe balances and preserves the original record", async () => {
  const { sqlite, db } = await createTestDatabase();
  try {
    const id = await createAccount(db, { name: "Original", type: "cash", color: "#69C5C8", openingBalanceCents: -100 });
    const before = (await listAccounts(db)).find((account) => account.id === id);
    for (const openingBalanceCents of [1.5, NaN, Infinity, Number.MIN_SAFE_INTEGER - 1]) {
      await assert.rejects(updateAccount(db, id, { name: "Alterada", type: "checking", color: "#B9A0E8", openingBalanceCents }), /saldo/i);
    }
    assert.deepEqual((await listAccounts(db)).find((account) => account.id === id), before);
    await updateAccount(db, id, { name: "Válida", type: "cash", color: "#69C5C8", openingBalanceCents: 0 });
    assert.equal((await listAccounts(db)).find((account) => account.id === id)?.openingBalanceCents, 0);
  } finally { sqlite.close(); }
});

test("account creation preserves signed safe cent values and defaults an omitted balance to zero", async () => {
  const { sqlite, db } = await createTestDatabase();
  try {
    for (const openingBalanceCents of [0, -100, Number.MAX_SAFE_INTEGER, Number.MIN_SAFE_INTEGER]) {
      const id = await createAccount(db, { name: "Válida", type: "cash", color: "#69C5C8", openingBalanceCents });
      assert.equal((await listAccounts(db)).find((account) => account.id === id)?.openingBalanceCents, openingBalanceCents);
    }
    const id = await createAccount(db, { name: "Sem saldo", type: "checking", color: "#69C5C8" });
    assert.equal((await listAccounts(db)).find((account) => account.id === id)?.openingBalanceCents, 0);
  } finally { sqlite.close(); }
});
