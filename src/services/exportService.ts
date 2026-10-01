import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import type { SQLiteDatabase } from "expo-sqlite";
import { listTransactions } from "../repositories/transactionRepository";
import { serializeTransactionsCsv } from "../utils/csvExport";
import { normalizeTransactionTags } from "../utils/transactionTags";

export async function exportTransactions(db: SQLiteDatabase): Promise<boolean> {
  const storedTags = await db.getAllAsync<{ tags_json: string }>("SELECT tags_json FROM transactions");
  for (const row of storedTags) {
    try { normalizeTransactionTags(JSON.parse(row.tags_json)); }
    catch { throw new Error("Há tags inválidas ou incompatíveis com o CSV. Use o backup completo para preservar os dados e revise os lançamentos antes de exportar."); }
  }
  const items = await listTransactions(db);
  const uri = `${FileSystem.cacheDirectory}tapfinance-export-${Date.now()}.csv`;
  await FileSystem.writeAsStringAsync(uri, serializeTransactionsCsv(items), { encoding: FileSystem.EncodingType.UTF8 });
  if (!(await Sharing.isAvailableAsync())) return false;
  await Sharing.shareAsync(uri, { mimeType: "text/csv", dialogTitle: "Exportar lançamentos" });
  return true;
}
