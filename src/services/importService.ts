import { File } from "expo-file-system";
import type { SQLiteDatabase } from "expo-sqlite";
import { createId } from "../database/ids";
import { createAccount } from "../repositories/financeRepository";
import { createCategory } from "../repositories/categoryRepository";
import type { TransactionType } from "../types/category";
import { normalized, parseCsvPreview, type CsvPreview } from "../utils/csvImport";

export type { CsvPreview } from "../utils/csvImport";

const MAX_CSV_BYTES = 10 * 1024 * 1024;

export async function inspectCsvFile(uri: string): Promise<CsvPreview> {
  const file = new File(uri);
  if (file.size && file.size > MAX_CSV_BYTES) throw new Error("O CSV excede 10 MB.");
  return parseCsvPreview(await file.text());
}

export async function importCsv(database: SQLiteDatabase, preview: CsvPreview): Promise<{ imported: number; skipped: number }> {
  let imported = 0; let skipped = 0;
  await database.withExclusiveTransactionAsync(async (tx) => {
    const accounts = await tx.getAllAsync<{ id: string; name: string }>("SELECT id, name FROM accounts WHERE is_archived = 0 ORDER BY is_primary DESC, position");
    const categories = await tx.getAllAsync<{ id: string; name: string; type: TransactionType }>("SELECT id, name, type FROM categories WHERE is_active = 1");
    const accountIds = new Map(accounts.map((account) => [normalized(account.name), account.id]));
    const categoryIds = new Map(categories.map((category) => [`${category.type}:${normalized(category.name)}`, category.id]));
    const primaryId = accounts[0]?.id;
    if (!primaryId) throw new Error("Crie uma conta antes de importar.");
    const transferRows = new Map<string, { index: number; id: string | null }[]>();
    preview.rows.forEach((row, index) => {
      if (row.kind !== "transfer" || !row.transferGroupId) return;
      transferRows.set(row.transferGroupId, [...(transferRows.get(row.transferGroupId) ?? []), { index, id: row.id }]);
    });
    for (const pair of transferRows.values()) {
      const exists = await Promise.all(pair.map(({ index, id }) => tx.getFirstAsync<{ id: string }>(
        "SELECT id FROM transactions WHERE id = ? OR source_suggestion_id = ?", id ?? "", `csv:${preview.sourceHash}:${index}`,
      )));
      if (exists.some(Boolean) && !exists.every(Boolean)) throw new Error("Uma transferência já existe parcialmente. Use o backup completo para recuperar esse par.");
    }
    for (const [index, row] of preview.rows.entries()) {
      const sourceId = `csv:${preview.sourceHash}:${index}`;
      const exists = await tx.getFirstAsync<{ id: string }>("SELECT id FROM transactions WHERE id = ? OR source_suggestion_id = ?", row.id ?? "", sourceId);
      if (exists) { skipped += 1; continue; }
      let accountId = accountIds.get(normalized(row.accountName)) ?? primaryId;
      if (row.accountName && !accountIds.has(normalized(row.accountName))) {
        accountId = await createAccount(tx, { name: row.accountName, type: "checking", color: "#8DB9EA" });
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
        "INSERT INTO transactions (id, type, amount_cents, category_id, description, occurred_at, created_at, updated_at, source_suggestion_id, account_id, title, notes, status, kind, transfer_group_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        row.id ?? createId(), row.type, row.amountCents, categoryId, row.description || null,
        row.occurredAt, now, now, sourceId, accountId, row.title || row.description || null,
        row.notes || null, row.status, row.kind, row.transferGroupId,
      );
      imported += 1;
    }
  });
  return { imported, skipped };
}
