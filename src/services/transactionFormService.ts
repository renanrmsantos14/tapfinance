import type { SQLiteDatabase } from "expo-sqlite";
import { getCategory, listCategories } from "../repositories/categoryRepository";
import { listAccounts, listGoals, listLoans } from "../repositories/financeRepository";
import type { Category, TransactionType } from "../types/category";
import type { Account, Goal, Loan } from "../types/finance";
import type { Transaction, TransactionDraft } from "../types/transaction";

export type TransactionFormReferences = { categories: Category[]; accounts: Account[]; goals: Goal[]; loans: Loan[] };
export type HistoricalTransactionReferences = { categoryId: string; accountId: string };

export function buildTransactionCopyDraft(source: Transaction, occurredAt = Date.now()): TransactionDraft {
  if (source.kind !== "standard") throw new Error("Use o fluxo específico de transferência ou correção; esta cópia é somente para lançamentos comuns.");
  if (!Number.isSafeInteger(occurredAt) || !Number.isFinite(new Date(occurredAt).getTime())) throw new Error("Escolha uma data válida para a cópia.");
  return {
    type: source.type, amountCents: source.amountCents, categoryId: source.categoryId, accountId: source.accountId,
    description: source.description ?? "", title: source.title, notes: source.notes, tags: [...source.tags],
    status: source.status, kind: "standard", occurredAt,
    goalId: source.goalId, loanId: source.initialLoanId ? null : source.loanId, scheduleId: null,
  };
}

export async function loadTransactionFormReferences(db: SQLiteDatabase, type: TransactionType, historical?: HistoricalTransactionReferences): Promise<TransactionFormReferences> {
  const [categories, accounts, goals, loans, originalCategory] = await Promise.all([
    listCategories(db, type), listAccounts(db, !!historical), listGoals(db), listLoans(db),
    historical ? getCategory(db, historical.categoryId) : Promise.resolve(null),
  ]);
  if (originalCategory?.type === type && !categories.some((category) => category.id === originalCategory.id)) categories.push(originalCategory);
  return { categories, accounts: accounts.filter((account) => !account.isArchived || account.id === historical?.accountId), goals, loans };
}

export function resolveTransactionFormSelection(refs: TransactionFormReferences, categoryId: string | null, accountId: string | null) {
  return {
    categoryId: refs.categories.some((category) => category.id === categoryId) ? categoryId : refs.categories[0]?.id ?? null,
    accountId: refs.accounts.some((account) => account.id === accountId) ? accountId : refs.accounts.find((account) => account.isPrimary)?.id ?? refs.accounts[0]?.id ?? null,
  };
}

type TrackerDraft = { type: TransactionType; amountCents: number; description: string };
export function getTrackerFormPrefill(refs: TransactionFormReferences, target: { loanId?: string; goalId?: string }, current: TrackerDraft, edited: { type: boolean; amount: boolean; description: boolean }) {
  const loan = target.loanId ? refs.loans.find((item) => item.id === target.loanId && !item.isArchived) : null;
  const goal = !target.loanId && target.goalId ? refs.goals.find((item) => item.id === target.goalId && !item.isArchived) : null;
  if (!loan && !goal) return null;
  return {
    ...current,
    linkedId: loan ? `loan:${loan.id}` : `goal:${goal!.id}`,
    type: edited.type ? current.type : loan ? loan.direction === "lent" ? "income" as const : "expense" as const : goal!.type,
    amountCents: edited.amount ? current.amountCents : loan ? loan.remainingCents : Math.max(0, goal!.targetCents - goal!.progressCents),
    description: edited.description ? current.description : loan ? `Pagamento de ${loan.name}` : goal!.name,
  };
}
