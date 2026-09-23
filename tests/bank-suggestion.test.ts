import assert from "node:assert/strict";
import test from "node:test";
import { createTransaction } from "../src/repositories/transactionRepository";
import type { SQLiteDatabase } from "expo-sqlite";

test("bank suggestion uses one stable source id for repeated saves", async () => {
  const inserted: string[] = [];
  const db = {
    runAsync: async (_sql: string, _id: string, ...values: unknown[]) => {
      const source = values.at(-1) as string;
      if (inserted.includes(source)) return { changes: 0 };
      inserted.push(source);
      return { changes: 1 };
    },
    getFirstAsync: async () => ({ id: "first-transaction" }),
  } as unknown as SQLiteDatabase;
  const draft = { type: "expense" as const, amountCents: 1000, categoryId: "outros-despesa", occurredAt: 1_800_000_000_000 };

  await createTransaction(db, draft, "bank-suggestion-1");
  const repeated = await createTransaction(db, draft, "bank-suggestion-1");

  assert.equal(inserted.length, 1);
  assert.equal(repeated, "first-transaction");
});
