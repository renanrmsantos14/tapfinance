import type { SQLiteDatabase } from "expo-sqlite";
import { listAccounts, listGoals, listLoans, listSchedules } from "../repositories/financeRepository";
import { listCategories } from "../repositories/categoryRepository";
import type { Account, Goal, Loan, Schedule } from "../types/finance";
import type { Category } from "../types/category";

export type CollectionKind = "accounts" | "goals" | "loans" | "schedules" | "categories";
export type CollectionEntry = Account | Goal | Loan | Schedule | Category;

export async function loadCollectionSnapshot(db: SQLiteDatabase, kind: CollectionKind): Promise<{ items: CollectionEntry[]; accounts: Account[]; categories: Category[] }> {
  const allAccounts = listAccounts(db, true);
  const allCategories = Promise.all([listCategories(db, "expense", true), listCategories(db, "income", true)]).then(([expenses, incomes]) => [...expenses, ...incomes]);
  const entries: Promise<CollectionEntry[]> = kind === "accounts" ? allAccounts : kind === "categories" ? allCategories : kind === "goals" ? listGoals(db, true) : kind === "loans" ? listLoans(db, true) : listSchedules(db, true);
  const [items, accounts, categories] = await Promise.all([entries, allAccounts, allCategories]);
  return { items, accounts: accounts.filter((account) => !account.isArchived), categories: categories.filter((category) => category.isActive) };
}
