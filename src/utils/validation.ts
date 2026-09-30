import type { TransactionDraft } from "../types/transaction";

export function validateTransactionDraft(draft: TransactionDraft): string | null {
  if (!Number.isSafeInteger(draft.amountCents) || draft.amountCents <= 0) {
    return "Informe um valor maior que zero.";
  }
  if (!draft.categoryId) return "Escolha uma categoria.";
  if (!Number.isSafeInteger(draft.occurredAt) || !Number.isFinite(new Date(draft.occurredAt).getTime())) return "Escolha uma data válida.";
  if (draft.type !== "income" && draft.type !== "expense") return "Escolha receita ou despesa.";
  if (draft.status !== undefined && draft.status !== "paid" && draft.status !== "pending") return "Escolha uma situação válida.";
  if (draft.kind !== undefined && !["standard", "transfer", "correction"].includes(draft.kind)) return "Tipo de lançamento inválido.";
  return null;
}
