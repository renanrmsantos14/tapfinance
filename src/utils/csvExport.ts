import type { Transaction } from "../types/transaction";
import { formatCentsToBRL } from "./currency";
import { formatDate } from "./dates";

function csvCell(value: string): string { return `"${value.replace(/"/g, '""')}"`; }

export function serializeTransactionsCsv(items: Transaction[]): string {
  const header = ["data", "tipo", "categoria", "descrição", "valor", "id", "conta", "título", "notas", "status", "natureza", "grupo_transferencia", "tags", "ocorrido_em"].map(csvCell).join(",");
  const rows = items.map((item) => [formatDate(item.occurredAt), item.type === "income" ? "receita" : "despesa", item.categoryName, item.description ?? "", formatCentsToBRL(item.amountCents), item.id, item.accountName, item.title ?? "", item.notes ?? "", item.status, item.kind, item.transferGroupId ?? "", JSON.stringify(item.tags), String(item.occurredAt)].map(csvCell).join(","));
  return [header, ...rows].join("\n");
}
