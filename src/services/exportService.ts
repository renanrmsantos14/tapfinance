import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import type { SQLiteDatabase } from "expo-sqlite";
import { listTransactions } from "../repositories/transactionRepository";
import { formatCentsToBRL } from "../utils/currency";
import { formatDate } from "../utils/dates";

function csvCell(value: string): string { return `"${value.replace(/"/g, '""')}"`; }

export async function exportTransactions(db: SQLiteDatabase): Promise<boolean> {
  const items = await listTransactions(db);
  const header = ["data", "tipo", "categoria", "descrição", "valor", "id", "conta", "título", "notas", "status", "natureza", "grupo_transferencia"].map(csvCell).join(",");
  const rows = items.map((item) => [formatDate(item.occurredAt), item.type === "income" ? "receita" : "despesa", item.categoryName, item.description ?? "", formatCentsToBRL(item.amountCents), item.id, item.accountName, item.title ?? "", item.notes ?? "", item.status, item.kind, item.transferGroupId ?? ""].map(csvCell).join(","));
  const uri = `${FileSystem.cacheDirectory}tapfinance-export-${Date.now()}.csv`;
  await FileSystem.writeAsStringAsync(uri, [header, ...rows].join("\n"), { encoding: FileSystem.EncodingType.UTF8 });
  if (!(await Sharing.isAvailableAsync())) return false;
  await Sharing.shareAsync(uri, { mimeType: "text/csv", dialogTitle: "Exportar lançamentos" });
  return true;
}
