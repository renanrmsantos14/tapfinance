import type { Category, TransactionType } from "./category";

export type Transaction = {
  id: string;
  type: TransactionType;
  amountCents: number;
  categoryId: string;
  categoryName: string;
  categoryIcon: string;
  description: string | null;
  occurredAt: number;
  createdAt: number;
  updatedAt: number;
  accountId: string;
  accountName: string;
  title: string | null;
  notes: string | null;
  status: "paid" | "pending";
  kind: "standard" | "transfer" | "correction";
  transferGroupId: string | null;
  goalId: string | null;
  loanId: string | null;
  scheduleId: string | null;
};

export type TransactionDraft = {
  type: TransactionType;
  amountCents: number;
  categoryId: string;
  description?: string;
  occurredAt: number;
  accountId?: string;
  title?: string;
  notes?: string;
  status?: "paid" | "pending";
  kind?: "standard" | "transfer" | "correction";
  goalId?: string | null;
  loanId?: string | null;
  scheduleId?: string | null;
};
