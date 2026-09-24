import type { BudgetCycle } from "../types/finance";

export type BudgetPeriod = { start: number; end: number };

export function budgetPeriod(cycle: BudgetCycle, startAt: number, endAt: number | null, offset = 0, now = Date.now()): BudgetPeriod {
  if (!Number.isInteger(offset) || offset < 0) throw new Error("Período inválido.");
  if (cycle === "custom") return { start: startAt, end: endAt ?? now };
  const today = new Date(now);
  if (cycle === "weekly") {
    const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    start.setDate(start.getDate() - ((start.getDay() + 6) % 7) - offset * 7);
    const end = new Date(start);
    end.setDate(start.getDate() + 7);
    return { start: start.getTime(), end: end.getTime() };
  }
  return {
    start: new Date(today.getFullYear(), today.getMonth() - offset, 1).getTime(),
    end: new Date(today.getFullYear(), today.getMonth() - offset + 1, 1).getTime(),
  };
}

export function dailyBudgetCents(limitCents: number, spentCents: number, periodEnd: number, now = Date.now()): number {
  const daysLeft = Math.max(1, Math.ceil((periodEnd - now) / 86_400_000));
  return Math.max(0, Math.floor((limitCents - spentCents) / daysLeft));
}
