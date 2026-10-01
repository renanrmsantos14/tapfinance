import { formatCentsToBRL } from "./currency";

export function describeActivity(action: string): { label: string; detail: string | null } {
  const labels: Record<string, string> = { created: "Lançamento criado", updated: "Lançamento editado", deleted: "Lançamento excluído", account_balance_adjusted: "Saldo da conta corrigido", loan_balance_adjusted: "Saldo compensado manualmente", loan_reference_adjusted: "Referência do empréstimo alterada", loan_disbursement_linked: "Desembolso inicial identificado" };
  const [kind, before, after] = action.split(":");
  const isAdjustment = kind === "account_balance_adjusted" || kind === "loan_balance_adjusted" || kind === "loan_reference_adjusted";
  const previous = Number(before); const next = Number(after);
  return { label: labels[kind] ?? "Alteração registrada", detail: isAdjustment && before !== undefined && after !== undefined && Number.isSafeInteger(previous) && Number.isSafeInteger(next) ? `${formatCentsToBRL(previous)} → ${formatCentsToBRL(next)}` : null };
}
