import type { SQLiteDatabase } from "expo-sqlite";
import { listTransactions } from "../repositories/transactionRepository";
import { listAccounts, materializeScheduledTransactions } from "../repositories/financeRepository";
import { summarizeTransactionsByCurrency } from "../utils/currencyTotals";

export function calendarMonthDays(month: Date): Array<number | null> {
  if (!Number.isFinite(month.getTime())) throw new Error("Período inválido.");
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const offset = (first.getDay() + 6) % 7;
  const count = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const days: Array<number | null> = [...Array(offset).fill(null), ...Array.from({ length: count }, (_, index) => index + 1)];
  while (days.length % 7 !== 0) days.push(null);
  return days;
}

export async function loadCalendarSnapshot(db: SQLiteDatabase, monthTimestamp = Date.now()) {
  if (!Number.isSafeInteger(monthTimestamp) || !Number.isFinite(new Date(monthTimestamp).getTime())) throw new Error("Período inválido.");
  const month = new Date(monthTimestamp);
  const start = new Date(month.getFullYear(), month.getMonth(), 1).getTime();
  const end = new Date(month.getFullYear(), month.getMonth() + 1, 1).getTime();
  await materializeScheduledTransactions(db);
  const [all, accounts] = await Promise.all([listTransactions(db), listAccounts(db)]);
  const items = all.filter((item) => item.occurredAt >= start && item.occurredAt < end);
  const dayCounts: Record<number, number> = {};
  for (const item of items) {
    const day = new Date(item.occurredAt).getDate();
    dayCounts[day] = (dayCounts[day] ?? 0) + 1;
  }
  return { month, start, end, items, dayCounts, summaries: summarizeTransactionsByCurrency(items, accounts.map((account) => account.currency)) };
}

export function getCalendarDayTransactions(snapshot: Awaited<ReturnType<typeof loadCalendarSnapshot>>, day: number | null) {
  if (day === null) return snapshot.items;
  const max = new Date(snapshot.month.getFullYear(), snapshot.month.getMonth() + 1, 0).getDate();
  if (!Number.isInteger(day) || day < 1 || day > max) throw new Error("Dia inválido para este mês.");
  return snapshot.items.filter((item) => new Date(item.occurredAt).getDate() === day);
}
