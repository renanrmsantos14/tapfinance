import assert from "node:assert/strict";
import test from "node:test";
import { createTransaction } from "../src/repositories/transactionRepository";
import { createTestDatabase } from "./helpers/sqlite";

test("bank suggestion uses one stable source id for repeated saves", async () => {
  const { sqlite, db } = await createTestDatabase();
  const draft = { type: "expense" as const, amountCents: 1000, categoryId: "outros-despesa", occurredAt: 1_800_000_000_000 };

  try {
  const first = await createTransaction(db, draft, "bank-suggestion-1");
  const repeated = await createTransaction(db, draft, "bank-suggestion-1");

  assert.equal(sqlite.prepare("SELECT COUNT(*) AS count FROM transactions").get()?.count, 1);
  assert.equal(repeated, first);
  } finally { sqlite.close(); }
});
