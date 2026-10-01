import type { Transaction } from "../types/transaction";

export type CurrencySummary = { currency: string; income: number; expense: number; balance: number };
type SummaryEntry = Pick<Transaction, "accountCurrency" | "amountCents" | "type" | "status" | "kind">;

export function summarizeTransactionsByCurrency(items: SummaryEntry[], currencies: string[] = []): CurrencySummary[] {
  const groups = new Map<string, CurrencySummary>();
  const groupFor = (value = "BRL") => {
    const currency = value.trim().toUpperCase();
    let group = groups.get(currency);
    if (!group) {
      group = { currency, income: 0, expense: 0, balance: 0 };
      groups.set(currency, group);
    }
    return group;
  };
  for (const currency of currencies) groupFor(currency);
  for (const item of items) {
    const group = groupFor(item.accountCurrency);
    if (item.status !== "paid" || item.kind !== "standard") continue;
    if (!Number.isSafeInteger(item.amountCents) || item.amountCents < 0) throw new Error("Valor financeiro fora do limite numérico.");
    group[item.type] += item.amountCents;
    if (!Number.isSafeInteger(group[item.type])) throw new Error("Total financeiro fora do limite numérico. Filtre uma conta ou um período menor.");
    group.balance = group.income - group.expense;
  }
  return [...groups.values()].sort((a, b) => a.currency === b.currency ? 0 : a.currency === "BRL" ? -1 : b.currency === "BRL" ? 1 : a.currency.localeCompare(b.currency));
}
