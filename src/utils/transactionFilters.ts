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
  tag?: string | null;
  /** Exact period; when present it replaces the calendar month. */
  range?: { start: number; end: number } | null;
};

function tagKey(value: string): string {
  return value.normalize("NFC").trim().replace(/\s+/g, " ").toLocaleLowerCase("pt-BR");
}

export function getTransactionTagOptions(items: Transaction[], selectedTag: string | null = null): string[] {
  const options = new Map<string, string>();
  for (const tag of [...items.flatMap((item) => item.tags), ...(selectedTag ? [selectedTag] : [])]) {
    const key = tagKey(tag);
    if (key && !options.has(key)) options.set(key, tag.normalize("NFC").trim().replace(/\s+/g, " "));
  }
  if (selectedTag && tagKey(selectedTag)) options.set(tagKey(selectedTag), selectedTag);
  return [...options.values()].sort((a, b) => a.localeCompare(b, "pt-BR"));
}

export function filterTransactions(items: Transaction[], filters: TransactionFilters): Transaction[] {
  const monthStart = filters.range ? filters.range.start : new Date(filters.month.getFullYear(), filters.month.getMonth(), 1).getTime();
  const monthEnd = filters.range ? filters.range.end : new Date(filters.month.getFullYear(), filters.month.getMonth() + 1, 1).getTime();
  const query = filters.query.trim().toLocaleLowerCase("pt-BR");
  return items.filter((item) => {
    if (item.occurredAt < monthStart || item.occurredAt >= monthEnd) return false;
    if (filters.type !== "all" && item.type !== filters.type) return false;
    if (filters.accountId && item.accountId !== filters.accountId) return false;
    if (filters.categoryId && item.categoryId !== filters.categoryId) return false;
    if (filters.status !== "all" && item.status !== filters.status) return false;
    if (filters.kind !== "all" && item.kind !== filters.kind) return false;
    if (filters.tag !== undefined && filters.tag !== null) {
      const selected = tagKey(filters.tag);
      const tags = item.tags.map(tagKey).filter(Boolean);
      if (selected ? !tags.includes(selected) : tags.length > 0) return false;
    }
    return !query || [item.title, item.description, item.notes, item.categoryName, item.accountName, ...item.tags]
      .some((value) => value?.toLocaleLowerCase("pt-BR").includes(query));
  });
}

export function transactionDayKey(timestamp: number): string {
  const date = new Date(timestamp);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
