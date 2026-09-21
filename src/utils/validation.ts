import type { TransactionDraft } from "../types/transaction";

export function validateTransactionDraft(draft: TransactionDraft): string | null {
  if (!Number.isInteger(draft.amountCents) || draft.amountCents <= 0) {
    return "Informe um valor maior que zero.";
  }
  if (!draft.categoryId) return "Escolha uma categoria.";
  if (!Number.isFinite(draft.occurredAt)) return "Escolha uma data válida.";
  return null;
}
