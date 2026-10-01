import assert from "node:assert/strict";
import test from "node:test";
import { loadCollectionSnapshot } from "../src/services/collectionService";
import { archiveAccount, createAccount } from "../src/repositories/financeRepository";
import { archiveCategory } from "../src/repositories/categoryRepository";
import { createTestDatabase } from "./helpers/sqlite";

test("account collection loads one complete snapshot with archived items and active selectors", async () => {
  const { sqlite, db } = await createTestDatabase();
  try {
    const archived = await createAccount(db, { name: "Encerrada", type: "cash", color: "#69C5C8" });
    await archiveAccount(db, archived); await archiveCategory(db, "casa");
    const execute = db.getAllAsync.bind(db); let reads = 0;
    db.getAllAsync = async (...args) => { reads += 1; return Reflect.apply(execute, db, args); };
    const snapshot = await loadCollectionSnapshot(db, "accounts");
    assert.equal(snapshot.items.some((item) => item.id === archived), true);
    assert.equal(snapshot.accounts.some((item) => item.id === archived), false);
    assert.equal(snapshot.categories.some((item) => item.id === "casa"), false);
    assert.equal(reads, 3, "reuse account/category queries instead of refetching active entries");
  } finally { sqlite.close(); }
});

test("category collection includes archived items but never exposes them as active choices", async () => {
  const { sqlite, db } = await createTestDatabase();
  try {
    await archiveCategory(db, "casa");
    const snapshot = await loadCollectionSnapshot(db, "categories");
    assert.equal(snapshot.items.some((item) => item.id === "casa"), true);
    assert.equal(snapshot.categories.some((item) => item.id === "casa"), false);
    assert.equal(snapshot.accounts.every((item) => !item.isArchived), true);
  } finally { sqlite.close(); }
});

test("collection load rejects the whole result when a required query fails and can retry", async () => {
  const { sqlite, db } = await createTestDatabase();
  try {
    sqlite.exec("ALTER TABLE categories RENAME TO categories_unavailable");
    await assert.rejects(loadCollectionSnapshot(db, "accounts"), /categories/);
    sqlite.exec("ALTER TABLE categories_unavailable RENAME TO categories");
    assert.ok((await loadCollectionSnapshot(db, "accounts")).items.length > 0);
    for (const kind of ["goals", "loans", "schedules"] as const) {
      const snapshot = await loadCollectionSnapshot(db, kind);
      assert.deepEqual(snapshot.items, []);
      assert.ok(snapshot.accounts.length > 0);
      assert.ok(snapshot.categories.length > 0);
    }
  } finally { sqlite.close(); }
});
