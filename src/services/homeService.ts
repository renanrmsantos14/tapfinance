import type { SQLiteDatabase } from "expo-sqlite";
import { listTransactions } from "../repositories/transactionRepository";
import { listAccounts, listBudgets, listGoals, listLoans, materializeScheduledTransactions } from "../repositories/financeRepository";
import { summarizeTransactionsByCurrency } from "../utils/currencyTotals";

export async function loadHomeSnapshot(db: SQLiteDatabase, timestamp = Date.now()) {
  if (!Number.isSafeInteger(timestamp) || !Number.isFinite(new Date(timestamp).getTime())) throw new Error("Período inválido.");
  const now = new Date(timestamp);
  const period = { now, start: new Date(now.getFullYear(), now.getMonth(), 1).getTime(), end: new Date(now.getFullYear(), now.getMonth() + 1, 1).getTime() };
  await materializeScheduledTransactions(db, timestamp);
  const [items, accounts, budgets, goals, loans] = await Promise.all([
    listTransactions(db), listAccounts(db), listBudgets(db), listGoals(db), listLoans(db),
  ]);
  return {
    period, summaries: summarizeTransactionsByCurrency(items.filter((item) => item.occurredAt >= period.start && item.occurredAt < period.end), accounts.map((account) => account.currency)), accounts, budgets, goals, loans,
    transactions: items.filter((item) => item.occurredAt <= timestamp).slice(0, 8),
    upcoming: items.filter((item) => item.status === "pending" && item.kind === "standard" && item.occurredAt > timestamp).sort((a, b) => a.occurredAt - b.occurredAt || a.createdAt - b.createdAt).slice(0, 3),
  };
}
