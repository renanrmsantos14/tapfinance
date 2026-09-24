import type { TransactionType } from "../types/category";
import type { Transaction } from "../types/transaction";

export type TransactionFilters = {
  month: Date;
  type: "all" | TransactionType;
  query: string;
  accountId: string | null;
  categoryId: string | null;
  status: "all" | Transaction["status"];
  kind: "all" | Transaction["kind"];
};

export function filterTransactions(items: Transaction[], filters: TransactionFilters): Transaction[] {
  const monthStart = new Date(filters.month.getFullYear(), filters.month.getMonth(), 1).getTime();
  const monthEnd = new Date(filters.month.getFullYear(), filters.month.getMonth() + 1, 1).getTime();
  const query = filters.query.trim().toLocaleLowerCase("pt-BR");
  return items.filter((item) => {
    if (item.occurredAt < monthStart || item.occurredAt >= monthEnd) return false;
    if (filters.type !== "all" && item.type !== filters.type) return false;
    if (filters.accountId && item.accountId !== filters.accountId) return false;
    if (filters.categoryId && item.categoryId !== filters.categoryId) return false;
    if (filters.status !== "all" && item.status !== filters.status) return false;
    if (filters.kind !== "all" && item.kind !== filters.kind) return false;
    return !query || [item.title, item.description, item.notes, item.categoryName, item.accountName]
      .some((value) => value?.toLocaleLowerCase("pt-BR").includes(query));
  });
}

export function transactionDayKey(timestamp: number): string {
  const date = new Date(timestamp);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
