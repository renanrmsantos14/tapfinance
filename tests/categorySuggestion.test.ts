import assert from "node:assert/strict";
import test from "node:test";
import type { SQLiteDatabase } from "expo-sqlite";
import { suggestCategoryFromHistory } from "../src/repositories/transactionRepository";

function history(rows: { category_id: string; uses: number }[], description = "Compra no cartão") {
  return { getAllAsync: async (_sql: string, ...params: unknown[]) => {
    assert.deepEqual(params, ["expense", "expense", description]);
    return rows;
  } } as unknown as SQLiteDatabase;
}

test("sugere categoria somente com histórico repetido e predominante", async () => {
  assert.equal(await suggestCategoryFromHistory(history([{ category_id: "compras", uses: 2 }]), "expense", "Compra no cartão"), "compras");
  assert.equal(await suggestCategoryFromHistory(history([{ category_id: "compras", uses: 1 }]), "expense", "Compra no cartão"), null);
  assert.equal(await suggestCategoryFromHistory(history([{ category_id: "compras", uses: 2 }, { category_id: "lazer", uses: 2 }]), "expense", "Compra no cartão"), null);
});

test("um Pix de remetente conhecido usa a categoria já confirmada", async () => {
  const description = "Pix de Pessoa Exemplo";
  assert.equal(await suggestCategoryFromHistory(history([{ category_id: "compras", uses: 1 }], description), "expense", description), "compras");
});
