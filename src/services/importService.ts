import type { SQLiteDatabase } from "expo-sqlite";
import { createId } from "../database/ids";
import { createAccountInTransaction } from "../repositories/financeRepository";
import { createCategory } from "../repositories/categoryRepository";
import type { TransactionType } from "../types/category";
import { normalized, parseCsvPreview, type CsvPreview } from "../utils/csvImport";
import { normalizeTransactionTags } from "../utils/transactionTags";
import { validateTransactionDraft } from "../utils/validation";

export type { CsvPreview } from "../utils/csvImport";

const MAX_CSV_BYTES = 10 * 1024 * 1024;

export async function inspectCsvFile(uri: string): Promise<CsvPreview> {
  // Native file access is isolated from the SQLite import path and its tests.
  const { File } = await import("expo-file-system");
  const file = new File(uri);
  if (file.size && file.size > MAX_CSV_BYTES) throw new Error("O CSV excede 10 MB.");
  return parseCsvPreview(await file.text());
}

export async function importCsv(database: SQLiteDatabase, preview: CsvPreview): Promise<{ imported: number; skipped: number }> {
  let imported = 0; let skipped = 0;
  await database.withExclusiveTransactionAsync(async (tx) => {
    const accounts = await tx.getAllAsync<{ id: string; name: string }>("SELECT id, name FROM accounts WHERE is_archived = 0 ORDER BY is_primary DESC, position");
    const categories = await tx.getAllAsync<{ id: string; name: string; type: TransactionType }>("SELECT id, name, type FROM categories WHERE is_active = 1");
    const usedAccounts = new Set(preview.rows.map((row) => normalized(row.accountName)).filter(Boolean));
    const usedCategories = new Set(preview.rows.map((row) => `${row.type}:${normalized(row.categoryName)}`));
    for (const key of usedAccounts) if (accounts.filter((account) => normalized(account.name) === key).length > 1) throw new Error("Há contas com nomes equivalentes. Renomeie os cadastros para diferenciá-los ou use o backup completo; nenhuma conta será escolhida por suposição.");
    for (const key of usedCategories) if (categories.filter((category) => `${category.type}:${normalized(category.name)}` === key).length > 1) throw new Error("Há categorias com nomes equivalentes do mesmo tipo. Renomeie os cadastros para diferenciá-los ou use o backup completo; nenhuma categoria será escolhida por suposição.");
    const accountIds = new Map(accounts.map((account) => [normalized(account.name), account.id]));
    const categoryIds = new Map(categories.map((category) => [`${category.type}:${normalized(category.name)}`, category.id]));
    const primaryId = accounts[0]?.id;
    if (!primaryId) throw new Error("Crie uma conta antes de importar.");
    const transferRows = new Map<string, { index: number; id: string | null }[]>();
    preview.rows.forEach((row, index) => {
      if (row.kind !== "transfer" || !row.transferGroupId) return;
      transferRows.set(row.transferGroupId, [...(transferRows.get(row.transferGroupId) ?? []), { index, id: row.id }]);
    });
    for (const [groupId, pair] of transferRows) {
      const exists = await Promise.all(pair.map(({ index, id }) => tx.getFirstAsync<{ id: string }>(
        "SELECT id FROM transactions WHERE id = ? OR source_suggestion_id = ?", id ?? "", `csv:${preview.sourceHash}:${index}`,
      )));
      if (exists.some(Boolean) && !exists.every(Boolean)) throw new Error("Uma transferência já existe parcialmente. Use o backup completo para recuperar esse par.");
      const existingGroup = await tx.getFirstAsync<{ count: number }>("SELECT COUNT(*) AS count FROM transactions WHERE kind = 'transfer' AND transfer_group_id = ?", groupId);
      if (existingGroup?.count && !exists.every(Boolean)) throw new Error("O grupo de transferência já pertence a outro par. Nenhuma movimentação foi combinada; use o backup completo ou um grupo exclusivo para este par.");
    }
    for (const [index, row] of preview.rows.entries()) {
      const error = validateTransactionDraft({ ...row, categoryId: "csv-category" });
      if (error) throw new Error(`Linha ${index + 2}: ${error}`);
      const tags = normalizeTransactionTags(row.tags ?? []);
      const sourceId = `csv:${preview.sourceHash}:${index}`;
      const exists = await tx.getFirstAsync<{ id: string }>("SELECT id FROM transactions WHERE id = ? OR source_suggestion_id = ?", row.id ?? "", sourceId);
      if (exists) { skipped += 1; continue; }
      let accountId = accountIds.get(normalized(row.accountName)) ?? primaryId;
      if (row.accountName && !accountIds.has(normalized(row.accountName))) {
        accountId = await createAccountInTransaction(tx, { name: row.accountName, type: "checking", color: "#8DB9EA" });
        accountIds.set(normalized(row.accountName), accountId);
      }
      const categoryKey = `${row.type}:${normalized(row.categoryName)}`;
      let categoryId = categoryIds.get(categoryKey);
      if (!categoryId) {
        categoryId = await createCategory(tx, { name: row.categoryName, type: row.type, icon: "tag", color: "#8DB9EA", parentId: null });
        categoryIds.set(categoryKey, categoryId);
      }
      const now = Date.now();
      await tx.runAsync(
        "INSERT INTO transactions (id, type, amount_cents, category_id, description, occurred_at, created_at, updated_at, source_suggestion_id, account_id, title, notes, status, kind, transfer_group_id, tags_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        row.id ?? createId(), row.type, row.amountCents, categoryId, row.description || null,
        row.occurredAt, now, now, sourceId, accountId, row.title === undefined ? row.description || null : row.title || null,
        row.notes || null, row.status, row.kind, row.transferGroupId, JSON.stringify(tags),
      );
      imported += 1;
    }
  });
  return { imported, skipped };
}
