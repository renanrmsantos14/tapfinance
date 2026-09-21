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
};

export type TransactionDraft = {
  type: TransactionType;
  amountCents: number;
  categoryId: string;
  description?: string;
  occurredAt: number;
};
