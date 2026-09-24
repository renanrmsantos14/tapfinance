import type { SQLiteDatabase } from "expo-sqlite";
import { createId } from "../database/ids";
import type { Account, AccountType, Budget, BudgetCycle, Goal, Loan, Schedule } from "../types/finance";
import { budgetPeriod } from "../utils/budgetPeriods";

export async function listAccounts(db: SQLiteDatabase): Promise<Account[]> {
  const rows = await db.getAllAsync<{
    id: string; name: string; type: AccountType; currency: string; color: string;
    opening_balance_cents: number; balance_cents: number; position: number;
    is_primary: number; is_archived: number;
  }>(`
    SELECT a.id, a.name, a.type, a.currency, a.color, a.opening_balance_cents, a.position,
      a.is_primary, a.is_archived,
      a.opening_balance_cents + COALESCE(SUM(CASE
        WHEN t.status != 'paid' THEN 0
        WHEN t.kind = 'transfer' AND t.type = 'income' THEN t.amount_cents
        WHEN t.kind = 'transfer' AND t.type = 'expense' THEN -t.amount_cents
        WHEN t.kind = 'standard' AND t.type = 'income' THEN t.amount_cents
        WHEN t.kind = 'standard' AND t.type = 'expense' THEN -t.amount_cents
        ELSE 0 END), 0) AS balance_cents
    FROM accounts a LEFT JOIN transactions t ON t.account_id = a.id
    WHERE a.is_archived = 0 GROUP BY a.id ORDER BY a.is_primary DESC, a.position, a.created_at
  `);
  return rows.map((row) => ({
    id: row.id, name: row.name, type: row.type, currency: row.currency, color: row.color,
    openingBalanceCents: row.opening_balance_cents, balanceCents: row.balance_cents,
    position: row.position, isPrimary: row.is_primary === 1, isArchived: row.is_archived === 1,
  }));
}

export async function createAccount(db: SQLiteDatabase, input: { name: string; type: AccountType; currency?: string; color: string; openingBalanceCents?: number }): Promise<string> {
  if (!input.name.trim()) throw new Error("Informe o nome da conta.");
  const id = createId(); const now = Date.now();
  const count = await db.getFirstAsync<{ count: number }>("SELECT COUNT(*) AS count FROM accounts WHERE is_archived = 0");
  await db.runAsync(
    `INSERT INTO accounts (id, name, type, currency, color, opening_balance_cents, position, is_primary, is_archived, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)`,
    id, input.name.trim(), input.type, input.currency ?? "BRL", input.color,
    input.openingBalanceCents ?? 0, count?.count ?? 0, (count?.count ?? 0) === 0 ? 1 : 0, now, now,
  );
  return id;
}

export async function updateAccount(db: SQLiteDatabase, id: string, input: { name: string; type: AccountType; color: string; openingBalanceCents: number }): Promise<void> {
  if (!input.name.trim()) throw new Error("Informe o nome da conta.");
  const result = await db.runAsync(
    "UPDATE accounts SET name = ?, type = ?, color = ?, opening_balance_cents = ?, updated_at = ? WHERE id = ? AND is_archived = 0",
    input.name.trim(), input.type, input.color, input.openingBalanceCents, Date.now(), id,
  );
  if (!result.changes) throw new Error("Conta não encontrada ou arquivada.");
}

export async function moveAccount(db: SQLiteDatabase, id: string, direction: -1 | 1): Promise<void> {
  const accounts = (await listAccounts(db)).filter((item) => !item.isPrimary);
  const index = accounts.findIndex((item) => item.id === id);
  const target = accounts[index + direction];
  if (index < 0 || !target) return;
  await db.withTransactionAsync(async () => {
    await db.runAsync("UPDATE accounts SET position = ?, updated_at = ? WHERE id = ?", target.position, Date.now(), id);
    await db.runAsync("UPDATE accounts SET position = ?, updated_at = ? WHERE id = ?", accounts[index].position, Date.now(), target.id);
  });
}

export async function archiveAccount(db: SQLiteDatabase, id: string): Promise<void> {
  const result = await db.runAsync("UPDATE accounts SET is_archived = 1, updated_at = ? WHERE id = ? AND is_archived = 0 AND is_primary = 0", Date.now(), id);
  if (!result.changes) throw new Error("A conta principal não pode ser arquivada.");
}

export async function setPrimaryAccount(db: SQLiteDatabase, accountId: string): Promise<void> {
  await db.withTransactionAsync(async () => {
    const account = await db.getFirstAsync<{ id: string }>("SELECT id FROM accounts WHERE id = ? AND is_archived = 0", accountId);
    if (!account) throw new Error("Conta não encontrada ou arquivada.");
    await db.runAsync("UPDATE accounts SET is_primary = 0, updated_at = ?", Date.now());
    await db.runAsync("UPDATE accounts SET is_primary = 1, updated_at = ? WHERE id = ? AND is_archived = 0", Date.now(), accountId);
  });
}

export async function createTransfer(db: SQLiteDatabase, input: { fromAccountId: string; toAccountId: string; amountCents: number; occurredAt: number; title?: string }): Promise<string> {
  if (input.fromAccountId === input.toAccountId) throw new Error("Escolha contas diferentes.");
  if (input.amountCents <= 0) throw new Error("Informe um valor maior que zero.");
  const groupId = createId(); const now = Date.now(); const title = input.title?.trim() || "Transferência";
  await db.withExclusiveTransactionAsync(async (tx) => {
    const accounts = await tx.getAllAsync<{ id: string; currency: string }>(
      "SELECT id, currency FROM accounts WHERE is_archived = 0 AND id IN (?, ?)",
      input.fromAccountId, input.toAccountId,
    );
    if (accounts.length !== 2) throw new Error("Selecione duas contas ativas.");
    if (accounts[0].currency !== accounts[1].currency) throw new Error("Transferências entre moedas diferentes ainda não são suportadas.");
    await tx.runAsync(
      `INSERT INTO transactions (id, type, amount_cents, category_id, description, occurred_at, created_at, updated_at, account_id, title, status, kind, transfer_group_id)
       VALUES (?, 'expense', ?, 'outros-despesa', ?, ?, ?, ?, ?, ?, 'paid', 'transfer', ?)`,
      createId(), input.amountCents, title, input.occurredAt, now, now, input.fromAccountId, title, groupId,
    );
    await tx.runAsync(
      `INSERT INTO transactions (id, type, amount_cents, category_id, description, occurred_at, created_at, updated_at, account_id, title, status, kind, transfer_group_id)
       VALUES (?, 'income', ?, 'outros-receita', ?, ?, ?, ?, ?, ?, 'paid', 'transfer', ?)`,
      createId(), input.amountCents, title, input.occurredAt, now, now, input.toAccountId, title, groupId,
    );
  });
  return groupId;
}

export async function listBudgets(db: SQLiteDatabase): Promise<Budget[]> {
  const rows = await db.getAllAsync<{ id: string; name: string; amount_cents: number; color: string; cycle: BudgetCycle; start_at: number; end_at: number | null; is_archived: number }>(
    "SELECT id, name, amount_cents, color, cycle, start_at, end_at, is_archived FROM budgets WHERE is_archived = 0 ORDER BY created_at",
  );
  return Promise.all(rows.map(async (row) => {
    const period = budgetPeriod(row.cycle, row.start_at, row.end_at);
    const total = await db.getFirstAsync<{ spent: number }>(
      `SELECT COALESCE(SUM(t.amount_cents), 0) AS spent FROM transactions t
       WHERE t.type = 'expense' AND t.kind = 'standard' AND t.status = 'paid'
       AND t.occurred_at >= ? AND t.occurred_at < ?
       AND (NOT EXISTS (SELECT 1 FROM budget_categories bc WHERE bc.budget_id = ?)
         OR EXISTS (SELECT 1 FROM budget_categories bc WHERE bc.budget_id = ? AND bc.category_id = t.category_id))`,
      period.start, period.end, row.id, row.id,
    );
    return { id: row.id, name: row.name, amountCents: row.amount_cents, spentCents: total?.spent ?? 0, color: row.color, cycle: row.cycle, startAt: period.start, endAt: period.end, isArchived: row.is_archived === 1 };
  }));
}

export async function createBudget(db: SQLiteDatabase, input: { name: string; amountCents: number; color: string; cycle: BudgetCycle; startAt?: number; endAt?: number | null; categoryIds?: string[]; categoryLimits?: { categoryId: string; limitCents: number | null }[] }): Promise<string> {
  if (!input.name.trim() || !Number.isSafeInteger(input.amountCents) || input.amountCents <= 0) throw new Error("Informe nome e limite válidos.");
  const id = createId(); const now = Date.now();
  await db.withTransactionAsync(async () => {
    await db.runAsync(
      "INSERT INTO budgets (id, name, amount_cents, color, cycle, start_at, end_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
      id, input.name.trim(), input.amountCents, input.color, input.cycle, input.startAt ?? now, input.endAt ?? null, now, now,
    );
    for (const category of input.categoryLimits ?? input.categoryIds?.map((categoryId) => ({ categoryId, limitCents: null })) ?? []) {
      await db.runAsync("INSERT INTO budget_categories (budget_id, category_id, limit_cents) VALUES (?, ?, ?)", id, category.categoryId, category.limitCents);
    }
  });
  return id;
}

export type BudgetConfiguration = {
  id: string; name: string; amountCents: number; color: string; cycle: BudgetCycle;
  startAt: number; endAt: number | null; categoryLimits: { categoryId: string; limitCents: number | null }[];
};

export async function getBudgetConfiguration(db: SQLiteDatabase, id: string): Promise<BudgetConfiguration | null> {
  const row = await db.getFirstAsync<{ id: string; name: string; amount_cents: number; color: string; cycle: BudgetCycle; start_at: number; end_at: number | null }>(
    "SELECT id, name, amount_cents, color, cycle, start_at, end_at FROM budgets WHERE id = ? AND is_archived = 0", id,
  );
  if (!row) return null;
  const categoryLimits = await db.getAllAsync<{ category_id: string; limit_cents: number | null }>(
    "SELECT category_id, limit_cents FROM budget_categories WHERE budget_id = ?", id,
  );
  return {
    id: row.id, name: row.name, amountCents: row.amount_cents, color: row.color, cycle: row.cycle,
    startAt: row.start_at, endAt: row.end_at,
    categoryLimits: categoryLimits.map((item) => ({ categoryId: item.category_id, limitCents: item.limit_cents })),
  };
}

export async function updateBudget(db: SQLiteDatabase, id: string, input: Omit<BudgetConfiguration, "id">): Promise<void> {
  if (!input.name.trim() || !Number.isSafeInteger(input.amountCents) || input.amountCents <= 0) throw new Error("Informe nome e limite válidos.");
  if (input.cycle === "custom" && (!input.endAt || input.endAt <= input.startAt)) throw new Error("Período personalizado inválido.");
  const uniqueCategories = new Set(input.categoryLimits.map((item) => item.categoryId));
  if (uniqueCategories.size !== input.categoryLimits.length) throw new Error("Categoria repetida no orçamento.");
  if (input.categoryLimits.some((item) => item.limitCents !== null && (!Number.isSafeInteger(item.limitCents) || item.limitCents <= 0))) throw new Error("Limite por categoria inválido.");
  await db.withExclusiveTransactionAsync(async (tx) => {
    const existing = await tx.getFirstAsync<{ id: string }>("SELECT id FROM budgets WHERE id = ? AND is_archived = 0", id);
    if (!existing) throw new Error("Orçamento não encontrado.");
    await tx.runAsync("UPDATE budgets SET name = ?, amount_cents = ?, color = ?, cycle = ?, start_at = ?, end_at = ?, updated_at = ? WHERE id = ?",
      input.name.trim(), input.amountCents, input.color, input.cycle, input.startAt, input.endAt, Date.now(), id);
    await tx.runAsync("DELETE FROM budget_categories WHERE budget_id = ?", id);
    for (const item of input.categoryLimits) await tx.runAsync("INSERT INTO budget_categories (budget_id, category_id, limit_cents) VALUES (?, ?, ?)", id, item.categoryId, item.limitCents);
  });
}

export async function archiveBudget(db: SQLiteDatabase, budgetId: string): Promise<void> {
  await db.runAsync("UPDATE budgets SET is_archived = 1, updated_at = ? WHERE id = ?", Date.now(), budgetId);
}

export type BudgetCategoryBreakdown = { id: string; name: string; amountCents: number; count: number; limitCents: number | null };

export async function getBudgetCategoryBreakdown(db: SQLiteDatabase, budgetId: string, offset = 0): Promise<{ budget: Budget; categories: BudgetCategoryBreakdown[]; hasPrevious: boolean } | null> {
  const budget = (await listBudgets(db)).find((item) => item.id === budgetId);
  if (!budget) return null;
  const stored = await db.getFirstAsync<{ start_at: number; end_at: number | null }>("SELECT start_at, end_at FROM budgets WHERE id = ?", budgetId);
  if (!stored) return null;
  const period = budgetPeriod(budget.cycle, stored.start_at, stored.end_at, offset);
  const firstPeriod = budgetPeriod(budget.cycle, stored.start_at, stored.end_at, offset + 1);
  const hasPrevious = budget.cycle !== "custom" && firstPeriod.end > stored.start_at;
  const spent = await db.getFirstAsync<{ amountCents: number }>(`
    SELECT COALESCE(SUM(t.amount_cents), 0) AS amountCents FROM transactions t
    WHERE t.type = 'expense' AND t.kind = 'standard' AND t.status = 'paid'
      AND t.occurred_at >= ? AND t.occurred_at < ?
      AND (NOT EXISTS (SELECT 1 FROM budget_categories bc WHERE bc.budget_id = ?)
        OR EXISTS (SELECT 1 FROM budget_categories bc WHERE bc.budget_id = ? AND bc.category_id = t.category_id))`,
    period.start, period.end, budgetId, budgetId);
  const categories = await db.getAllAsync<BudgetCategoryBreakdown>(`
    SELECT c.id, c.name, SUM(t.amount_cents) AS amountCents, COUNT(*) AS count, bc.limit_cents AS limitCents
    FROM transactions t JOIN categories c ON c.id = t.category_id
    LEFT JOIN budget_categories bc ON bc.budget_id = ? AND bc.category_id = c.id
    WHERE t.type = 'expense' AND t.kind = 'standard' AND t.status = 'paid'
      AND t.occurred_at >= ? AND t.occurred_at < ?
      AND (NOT EXISTS (SELECT 1 FROM budget_categories bc WHERE bc.budget_id = ?)
        OR EXISTS (SELECT 1 FROM budget_categories bc WHERE bc.budget_id = ? AND bc.category_id = t.category_id))
    GROUP BY c.id ORDER BY amountCents DESC`, budgetId, period.start, period.end, budgetId, budgetId);
  const configured = await db.getAllAsync<{ id: string; name: string; limitCents: number | null }>(
    "SELECT c.id, c.name, bc.limit_cents AS limitCents FROM budget_categories bc JOIN categories c ON c.id = bc.category_id WHERE bc.budget_id = ? ORDER BY c.position", budgetId,
  );
  const visible = [...categories];
  for (const category of configured) {
    if (!visible.some((item) => item.id === category.id)) visible.push({ ...category, amountCents: 0, count: 0 });
  }
  return { budget: { ...budget, startAt: period.start, endAt: period.end, spentCents: spent?.amountCents ?? 0 }, categories: visible, hasPrevious };
}

export async function listGoals(db: SQLiteDatabase): Promise<Goal[]> {
  const rows = await db.getAllAsync<{ id: string; name: string; type: "income" | "expense"; target_cents: number; color: string; due_at: number | null; is_archived: number; progress_cents: number }>(`
    SELECT g.id, g.name, g.type, g.target_cents, g.color, g.due_at, g.is_archived,
      COALESCE(SUM(CASE WHEN t.type = g.type AND t.status = 'paid' THEN t.amount_cents ELSE 0 END), 0) AS progress_cents
    FROM goals g LEFT JOIN transactions t ON t.goal_id = g.id WHERE g.is_archived = 0 GROUP BY g.id ORDER BY g.created_at
  `);
  return rows.map((r) => ({ id: r.id, name: r.name, type: r.type, targetCents: r.target_cents, progressCents: r.progress_cents, color: r.color, dueAt: r.due_at, isArchived: r.is_archived === 1 }));
}

export async function createGoal(db: SQLiteDatabase, input: { name: string; type: Goal["type"]; targetCents: number; color: string; dueAt?: number | null }): Promise<string> {
  const id = createId(); const now = Date.now();
  await db.runAsync("INSERT INTO goals (id, name, type, target_cents, color, due_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)", id, input.name.trim(), input.type, input.targetCents, input.color, input.dueAt ?? null, now, now);
  return id;
}

export async function listLoans(db: SQLiteDatabase): Promise<Loan[]> {
  const rows = await db.getAllAsync<{ id: string; name: string; direction: "lent" | "borrowed"; principal_cents: number; offset_cents: number; color: string; due_at: number | null; is_archived: number; movement_cents: number; movements: number }>(`
    SELECT l.id, l.name, l.direction, l.principal_cents, l.offset_cents, l.color, l.due_at, l.is_archived,
      COALESCE(SUM(CASE WHEN t.type = 'income' THEN t.amount_cents ELSE -t.amount_cents END), 0) AS movement_cents,
      COUNT(t.id) AS movements
    FROM loans l LEFT JOIN transactions t ON t.loan_id = l.id AND t.status = 'paid' WHERE l.is_archived = 0 GROUP BY l.id ORDER BY l.created_at
  `);
  return rows.map((r) => ({ id: r.id, name: r.name, direction: r.direction, principalCents: r.principal_cents, remainingCents: Math.max(0, (r.movements === 0 ? r.principal_cents : r.direction === "lent" ? -r.movement_cents : r.movement_cents) + r.offset_cents), color: r.color, dueAt: r.due_at, isArchived: r.is_archived === 1 }));
}

export async function createLoan(db: SQLiteDatabase, input: { name: string; direction: Loan["direction"]; principalCents: number; color: string; accountId?: string; dueAt?: number | null }): Promise<string> {
  const id = createId(); const now = Date.now(); const transactionId = createId();
  const type = input.direction === "lent" ? "expense" : "income";
  const categoryId = type === "expense" ? "outros-despesa" : "outros-receita";
  await db.withTransactionAsync(async () => {
    await db.runAsync("INSERT INTO loans (id, name, direction, principal_cents, color, due_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)", id, input.name.trim(), input.direction, input.principalCents, input.color, input.dueAt ?? null, now, now);
    await db.runAsync(
      `INSERT INTO transactions (id, type, amount_cents, category_id, description, occurred_at, created_at, updated_at, account_id, title, status, kind, loan_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'paid', 'standard', ?)`,
      transactionId, type, input.principalCents, categoryId, input.name.trim(), now, now, now, input.accountId ?? "principal", input.name.trim(), id,
    );
  });
  return id;
}

export async function listSchedules(db: SQLiteDatabase): Promise<Schedule[]> {
  const rows = await db.getAllAsync<{ id: string; title: string; type: "expense" | "income"; amount_cents: number; account_id: string; category_id: string; frequency: Schedule["frequency"]; next_at: number; is_subscription: number; is_active: number }>(
    "SELECT id, title, type, amount_cents, account_id, category_id, frequency, next_at, is_subscription, is_active FROM schedules WHERE is_active = 1 ORDER BY next_at",
  );
  return rows.map((r) => ({ id: r.id, title: r.title, type: r.type, amountCents: r.amount_cents, accountId: r.account_id, categoryId: r.category_id, frequency: r.frequency, nextAt: r.next_at, isSubscription: r.is_subscription === 1, isActive: r.is_active === 1 }));
}

export async function createSchedule(db: SQLiteDatabase, input: Omit<Schedule, "id" | "isActive">): Promise<string> {
  const id = createId(); const now = Date.now();
  await db.runAsync("INSERT INTO schedules (id, title, type, amount_cents, account_id, category_id, frequency, next_at, is_subscription, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", id, input.title.trim(), input.type, input.amountCents, input.accountId, input.categoryId, input.frequency, input.nextAt, input.isSubscription ? 1 : 0, now, now);
  return id;
}

function addFrequency(timestamp: number, frequency: Schedule["frequency"]) {
  const date = new Date(timestamp);
  if (frequency === "weekly") date.setDate(date.getDate() + 7);
  else if (frequency === "monthly" || frequency === "yearly") {
    const day = date.getDate();
    date.setDate(1);
    if (frequency === "monthly") date.setMonth(date.getMonth() + 1);
    else date.setFullYear(date.getFullYear() + 1);
    const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
    date.setDate(Math.min(day, lastDay));
  }
  return date.getTime();
}

export async function materializeScheduledTransactions(db: SQLiteDatabase, now = Date.now()): Promise<void> {
  const until = now + 45 * 24 * 60 * 60 * 1000;
  const schedules = await db.getAllAsync<{ id: string; title: string; type: "expense" | "income"; amount_cents: number; account_id: string; category_id: string; frequency: Schedule["frequency"]; next_at: number }>(
    "SELECT id, title, type, amount_cents, account_id, category_id, frequency, next_at FROM schedules WHERE is_active = 1 AND next_at <= ? ORDER BY next_at",
    until,
  );
  for (const schedule of schedules) {
    let nextAt = schedule.next_at; let created = 0;
    while (nextAt <= until && created < 12) {
      await db.withTransactionAsync(async () => {
        const exists = await db.getFirstAsync<{ transaction_id: string }>("SELECT transaction_id FROM schedule_instances WHERE schedule_id = ? AND scheduled_for = ?", schedule.id, nextAt);
        if (!exists) {
          const transactionId = createId(); const timestamp = Date.now();
          await db.runAsync(
            `INSERT INTO transactions (id, type, amount_cents, category_id, description, occurred_at, created_at, updated_at, account_id, title, status, kind, schedule_id)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', 'standard', ?)`,
            transactionId, schedule.type, schedule.amount_cents, schedule.category_id, schedule.title, nextAt, timestamp, timestamp, schedule.account_id, schedule.title, schedule.id,
          );
          await db.runAsync("INSERT INTO schedule_instances (schedule_id, scheduled_for, transaction_id) VALUES (?, ?, ?)", schedule.id, nextAt, transactionId);
        }
        if (schedule.frequency === "once") await db.runAsync("UPDATE schedules SET is_active = 0, updated_at = ? WHERE id = ?", Date.now(), schedule.id);
        else await db.runAsync("UPDATE schedules SET next_at = ?, updated_at = ? WHERE id = ?", addFrequency(nextAt, schedule.frequency), Date.now(), schedule.id);
      });
      created += 1;
      if (schedule.frequency === "once") break;
      nextAt = addFrequency(nextAt, schedule.frequency);
    }
  }
}
