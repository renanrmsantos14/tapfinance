import assert from "node:assert/strict";
import test from "node:test";
import { createTransaction, getTransaction, updateTransaction } from "../src/repositories/transactionRepository";
import { createTestDatabase } from "./helpers/sqlite";

const base = { type: "expense" as const, amountCents: 1200, categoryId: "casa", occurredAt: 1_800_000_000_000 };
test("transaction metadata persists independently and tags are normalized without duplicates", async () => {
  const { sqlite, db } = await createTestDatabase();
  try {
    const draft = { ...base, description: "Detalhe", title: "Título próprio", notes: "Comprovante", tags: [" Trabalho ", "trabalho", "São Paulo", "", "São Paulo"] };
    const id = await createTransaction(db, draft);
    const item = await getTransaction(db, id);
    assert.equal(item?.title, "Título próprio"); assert.equal(item?.notes, "Comprovante");
    assert.deepEqual(item?.tags, ["Trabalho", "São Paulo"]);
    await updateTransaction(db, id, { ...base, description: "Detalhe alterado" });
    const updated = await getTransaction(db, id);
    assert.equal(updated?.title, "Título próprio"); assert.equal(updated?.notes, "Comprovante");
    assert.deepEqual(updated?.tags, ["Trabalho", "São Paulo"]);
    await updateTransaction(db, id, { ...base, title: null, notes: null, tags: [] });
    const cleared = await getTransaction(db, id);
    assert.equal(cleared?.title, null); assert.equal(cleared?.notes, null); assert.deepEqual(cleared?.tags, []);
  } finally { sqlite.close(); }
});

test("explicit null title on creation does not copy description", async () => {
  const { sqlite, db } = await createTestDatabase();
  try {
    const id = await createTransaction(db, { ...base, description: "Só descrição", title: null });
    assert.equal((await getTransaction(db, id))?.title, null);
  } finally { sqlite.close(); }
});

test("invalid stored tags do not break reading and remain intact when omitted from an edit", async () => {
  const { sqlite, db } = await createTestDatabase();
  try {
    const id = await createTransaction(db, base);
    sqlite.prepare("UPDATE transactions SET tags_json = ? WHERE id = ?").run("legacy-invalid", id);
    assert.deepEqual((await getTransaction(db, id))?.tags, []);
    await updateTransaction(db, id, { ...base, amountCents: 1400 });
    assert.equal(sqlite.prepare("SELECT tags_json FROM transactions WHERE id = ?").get(id)?.tags_json, "legacy-invalid");
  } finally { sqlite.close(); }
});

test("invalid tag changes are rejected without modifying movement or audit history", async () => {
  const { sqlite, db } = await createTestDatabase();
  try {
    const id = await createTransaction(db, base);
    const before = sqlite.prepare("SELECT * FROM transactions").all();
    const audit = sqlite.prepare("SELECT * FROM activity_log").all();
    for (const tags of [["x".repeat(51)], Array.from({ length: 21 }, (_, index) => `Tag ${index}`), [12]]) {
      await assert.rejects(updateTransaction(db, id, { ...base, tags } as unknown as Parameters<typeof updateTransaction>[2]));
      assert.deepEqual(sqlite.prepare("SELECT * FROM transactions").all(), before);
      assert.deepEqual(sqlite.prepare("SELECT * FROM activity_log").all(), audit);
    }
  } finally { sqlite.close(); }
});
