import type { SQLiteDatabase } from "expo-sqlite";
import { listAccounts } from "../repositories/financeRepository";
import { listTransactions } from "../repositories/transactionRepository";
import { summarizeTransactionsByCurrency, type CurrencySummary } from "../utils/currencyTotals";

export type CategoryTotal = { id: string; name: string; icon: string; total: number; count: number; percentage: number };
export type InsightsGroup = CurrencySummary & { count: number; categories: CategoryTotal[] };

export async function loadInsightsSnapshot(db: SQLiteDatabase, monthTimestamp = Date.now()) {
  if (!Number.isSafeInteger(monthTimestamp) || !Number.isFinite(new Date(monthTimestamp).getTime())) throw new Error("Período inválido.");
  const month = new Date(monthTimestamp);
  const start = new Date(month.getFullYear(), month.getMonth(), 1).getTime();
  const end = new Date(month.getFullYear(), month.getMonth() + 1, 1).getTime();
  const [items, accounts] = await Promise.all([listTransactions(db), listAccounts(db)]);
  const paid = items.filter((item) => item.occurredAt >= start && item.occurredAt < end && item.status === "paid" && item.kind === "standard");
  const summaries = summarizeTransactionsByCurrency(paid, accounts.map((account) => account.currency));
  const groups: InsightsGroup[] = summaries.map((summary) => {
    const entries = paid.filter((item) => (item.accountCurrency ?? "BRL").trim().toUpperCase() === summary.currency);
    const categories = new Map<string, CategoryTotal>();
    for (const entry of entries) {
      if (entry.type !== "expense") continue;
      const category = categories.get(entry.categoryId) ?? { id: entry.categoryId, name: entry.categoryName, icon: entry.categoryIcon, total: 0, count: 0, percentage: 0 };
      category.total += entry.amountCents;
      category.count += 1;
      categories.set(category.id, category);
    }
    return { ...summary, count: entries.length, categories: [...categories.values()]
      .map((category) => ({ ...category, percentage: summary.expense > 0 ? category.total / summary.expense * 100 : 0 }))
      .sort((a, b) => b.total - a.total || a.name.localeCompare(b.name, "pt-BR") || a.id.localeCompare(b.id)) };
  });
  return { month, start, end, count: paid.length, groups };
}
