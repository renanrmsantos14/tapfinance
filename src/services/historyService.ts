import type { SQLiteDatabase } from "expo-sqlite";
import { listTransactions } from "../repositories/transactionRepository";
import { listAccounts, materializeScheduledTransactions } from "../repositories/financeRepository";
import { listCategories } from "../repositories/categoryRepository";

export async function loadHistorySnapshot(db: SQLiteDatabase) {
  await materializeScheduledTransactions(db);
  const [items, accounts, expenses, incomes] = await Promise.all([
    listTransactions(db), listAccounts(db, true), listCategories(db, "expense", true), listCategories(db, "income", true),
  ]);
  return { items, accounts, categories: [...expenses, ...incomes] };
}
