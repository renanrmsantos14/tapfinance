import type { SQLiteDatabase } from "expo-sqlite";
import { createId } from "../database/ids";
import type { Account, AccountType, Budget, BudgetCycle, Goal, Loan, Schedule } from "../types/finance";
import { budgetPeriod } from "../utils/budgetPeriods";

const accountChanges = new WeakMap<SQLiteDatabase, Promise<unknown>>();
function queueAccountChange<T>(db: SQLiteDatabase, action: () => Promise<T>): Promise<T> {
  const change = (accountChanges.get(db) ?? Promise.resolve()).catch(() => undefined).then(action);
  accountChanges.set(db, change);
  return change;
}

export async function listAccounts(db: SQLiteDatabase, includeArchived = false): Promise<Account[]> {
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
        WHEN t.kind = 'correction' AND t.type = 'income' THEN t.amount_cents
        WHEN t.kind = 'correction' AND t.type = 'expense' THEN -t.amount_cents
        WHEN t.kind = 'standard' AND t.type = 'income' THEN t.amount_cents
        WHEN t.kind = 'standard' AND t.type = 'expense' THEN -t.amount_cents
        ELSE 0 END), 0) AS balance_cents
    FROM accounts a LEFT JOIN transactions t ON t.account_id = a.id
    WHERE (? = 1 OR a.is_archived = 0) GROUP BY a.id ORDER BY a.is_archived, a.is_primary DESC, a.position, a.created_at
  `, includeArchived ? 1 : 0);
  return rows.map((row) => ({
    id: row.id, name: row.name, type: row.type, currency: row.currency, color: row.color,
    openingBalanceCents: row.opening_balance_cents, balanceCents: row.balance_cents,
    position: row.position, isPrimary: row.is_primary === 1, isArchived: row.is_archived === 1,
  }));
}

type AccountInput = { name: string; type: AccountType; currency?: string; color: string; openingBalanceCents?: number };

export function createAccount(db: SQLiteDatabase, input: AccountInput): Promise<string> {
  return queueAccountChange(db, async () => {
    let id = "";
    await db.withExclusiveTransactionAsync(async (tx) => { id = await createAccountInTransaction(tx, input); });
    return id;
  });
}

// For callers that already own an exclusive transaction, such as CSV import.
export async function createAccountInTransaction(db: SQLiteDatabase, input: AccountInput): Promise<string> {
  if (!input.name.trim()) throw new Error("Informe o nome da conta.");
  if (!Number.isSafeInteger(input.openingBalanceCents ?? 0)) throw new Error("Informe um saldo inicial válido em centavos inteiros, dentro do limite seguro.");
  const id = createId(); const now = Date.now();
  const catalog = await db.getFirstAsync<{ position: number; active_count: number }>("SELECT COALESCE(MAX(position), -1) AS position, COALESCE(SUM(CASE WHEN is_archived = 0 THEN 1 ELSE 0 END), 0) AS active_count FROM accounts");
  const position = (catalog?.position ?? -1) + 1;
  if (!Number.isSafeInteger(position) || position < 0) throw new Error("A ordenação das contas está fora do limite seguro. Revise o cadastro antes de adicionar outra conta.");
  await db.runAsync(
    `INSERT INTO accounts (id, name, type, currency, color, opening_balance_cents, position, is_primary, is_archived, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)`,
    id, input.name.trim(), input.type, input.currency ?? "BRL", input.color,
    input.openingBalanceCents ?? 0, position, (catalog?.active_count ?? 0) === 0 ? 1 : 0, now, now,
  );
  return id;
}

export async function updateAccount(db: SQLiteDatabase, id: string, input: { name: string; type: AccountType; color: string; openingBalanceCents: number }): Promise<void> {
  if (!input.name.trim()) throw new Error("Informe o nome da conta.");
  if (!Number.isSafeInteger(input.openingBalanceCents)) throw new Error("Informe um saldo inicial válido em centavos inteiros, dentro do limite seguro.");
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

export async function restoreAccount(db: SQLiteDatabase, id: string): Promise<void> {
  await db.withExclusiveTransactionAsync(async (tx) => {
    const account = await tx.getFirstAsync<{ is_archived: number }>("SELECT is_archived FROM accounts WHERE id = ?", id);
    if (!account) throw new Error("Conta não encontrada.");
    if (account.is_archived === 0) return;
    await tx.runAsync("UPDATE accounts SET is_archived = 0, is_primary = 0, updated_at = ? WHERE id = ?", Date.now(), id);
  });
}

export async function correctAccountBalance(db: SQLiteDatabase, input: { accountId: string; balanceCents: number; expectedBalanceCents: number; notes?: string }): Promise<string | null> {
  if (!Number.isSafeInteger(input.balanceCents) || !Number.isSafeInteger(input.expectedBalanceCents)) throw new Error("Informe um saldo válido em centavos inteiros.");
  let id: string | null = null;
  await db.withExclusiveTransactionAsync(async (tx) => {
    const account = (await listAccounts(tx)).find((item) => item.id === input.accountId);
    if (!account) throw new Error("Conta não encontrada ou arquivada.");
    if (!Number.isSafeInteger(account.balanceCents)) throw new Error("O saldo atual está fora do limite seguro. Revise as movimentações da conta.");
    if (account.balanceCents === input.balanceCents) return;
    if (account.balanceCents !== input.expectedBalanceCents) throw new Error("O saldo mudou após a consulta. Atualize o saldo atual e confirme novamente; o valor informado foi preservado.");
    const delta = input.balanceCents - account.balanceCents;
    if (!Number.isSafeInteger(delta)) throw new Error("A diferença entre os saldos está fora do limite seguro.");
    const type = delta > 0 ? "income" : "expense";
    const categoryId = type === "income" ? "outros-receita" : "outros-despesa";
    const category = await tx.getFirstAsync<{ type: string }>("SELECT type FROM categories WHERE id = ?", categoryId);
    if (category?.type !== type) throw new Error("Categoria de sistema indisponível para registrar a correção.");
    id = createId(); const now = Date.now();
    await tx.runAsync("INSERT INTO transactions (id, type, amount_cents, category_id, description, occurred_at, created_at, updated_at, account_id, title, notes, status, kind) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'paid', 'correction')", id, type, Math.abs(delta), categoryId, "Ajuste administrativo; não representa receita ou despesa.", now, now, now, account.id, "Correção de saldo", input.notes?.trim() || null);
    await tx.runAsync("INSERT INTO activity_log (entity_type, entity_id, action, occurred_at) VALUES ('account', ?, ?, ?)", account.id, `account_balance_adjusted:${account.balanceCents}:${input.balanceCents}`, now);
  });
  return id;
}

export function setPrimaryAccount(db: SQLiteDatabase, accountId: string): Promise<void> {
  return queueAccountChange(db, () => db.withExclusiveTransactionAsync(async (tx) => {
    const account = await tx.getFirstAsync<{ id: string }>("SELECT id FROM accounts WHERE id = ? AND is_archived = 0", accountId);
    if (!account) throw new Error("Conta não encontrada ou arquivada.");
    const now = Date.now();
    await tx.runAsync("UPDATE accounts SET is_primary = 0, updated_at = ? WHERE is_primary = 1", now);
    await tx.runAsync("UPDATE accounts SET is_primary = 1, updated_at = ? WHERE id = ? AND is_archived = 0", now, accountId);
  }));
}

export async function createTransfer(db: SQLiteDatabase, input: { fromAccountId: string; toAccountId: string; amountCents: number; occurredAt: number; title?: string }): Promise<string> {
  if (input.fromAccountId === input.toAccountId) throw new Error("Escolha contas diferentes.");
  if (!Number.isSafeInteger(input.amountCents) || input.amountCents <= 0) throw new Error("Informe um valor válido maior que zero, em centavos inteiros.");
  if (!Number.isSafeInteger(input.occurredAt) || !Number.isFinite(new Date(input.occurredAt).getTime())) throw new Error("Informe uma data válida para a transferência.");
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
  const rows = await db.getAllAsync<{ id: string; name: string; currency: string; amount_cents: number; color: string; cycle: BudgetCycle; start_at: number; end_at: number | null; is_archived: number }>(
    "SELECT id, name, currency, amount_cents, color, cycle, start_at, end_at, is_archived FROM budgets WHERE is_archived = 0 ORDER BY created_at",
  );
  return Promise.all(rows.map(async (row) => {
    const period = budgetPeriod(row.cycle, row.start_at, row.end_at);
    const total = await db.getFirstAsync<{ spent: number }>(
      `SELECT COALESCE(SUM(t.amount_cents), 0) AS spent FROM transactions t JOIN accounts a ON a.id = t.account_id
       WHERE t.type = 'expense' AND t.kind = 'standard' AND t.status = 'paid'
       AND UPPER(TRIM(a.currency)) = ?
       AND t.occurred_at >= ? AND t.occurred_at < ?
       AND (NOT EXISTS (SELECT 1 FROM budget_categories bc WHERE bc.budget_id = ?)
         OR EXISTS (SELECT 1 FROM budget_categories bc WHERE bc.budget_id = ? AND bc.category_id = t.category_id))`,
      row.currency, period.start, period.end, row.id, row.id,
    );
    if (!Number.isSafeInteger(total?.spent ?? 0)) throw new Error("Total do orçamento fora do limite numérico.");
    return { id: row.id, name: row.name, currency: row.currency, amountCents: row.amount_cents, spentCents: total?.spent ?? 0, color: row.color, cycle: row.cycle, startAt: period.start, endAt: period.end, isArchived: row.is_archived === 1 };
  }));
}

export async function createBudget(db: SQLiteDatabase, input: { name: string; currency?: string; amountCents: number; color: string; cycle: BudgetCycle; startAt?: number; endAt?: number | null; categoryIds?: string[]; categoryLimits?: { categoryId: string; limitCents: number | null }[] }): Promise<string> {
  const id = createId(); const now = Date.now();
  const configuration = { ...input, startAt: input.startAt ?? now, endAt: input.endAt ?? null, categoryLimits: input.categoryLimits ?? input.categoryIds?.map((categoryId) => ({ categoryId, limitCents: null })) ?? [] };
  validateBudgetConfiguration(configuration);
  await db.withExclusiveTransactionAsync(async (tx) => {
    await validateBudgetCategories(tx, configuration.categoryLimits);
    await tx.runAsync(
      "INSERT INTO budgets (id, name, currency, amount_cents, color, cycle, start_at, end_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      id, input.name.trim(), (input.currency ?? "BRL").trim().toUpperCase(), input.amountCents, input.color, input.cycle, configuration.startAt, configuration.endAt, now, now,
    );
    for (const category of configuration.categoryLimits) {
      await tx.runAsync("INSERT INTO budget_categories (budget_id, category_id, limit_cents) VALUES (?, ?, ?)", id, category.categoryId, category.limitCents);
    }
  });
  return id;
}

export type BudgetConfiguration = {
  id: string; name: string; amountCents: number; color: string; cycle: BudgetCycle;
  currency?: string;
  startAt: number; endAt: number | null; categoryLimits: { categoryId: string; limitCents: number | null }[];
};

function validateBudgetConfiguration(input: Omit<BudgetConfiguration, "id">): void {
  if (input.currency !== undefined && !/^[A-Z]{3}$/.test(input.currency.trim().toUpperCase())) throw new Error("Informe um código de moeda com três letras, como BRL ou USD.");
  if (!input.name.trim() || !Number.isSafeInteger(input.amountCents) || input.amountCents <= 0) throw new Error("Informe nome e limite válidos.");
  if (!Number.isSafeInteger(input.startAt) || !Number.isFinite(new Date(input.startAt).getTime())) throw new Error("Data inicial inválida.");
  if (input.endAt !== null && (!Number.isSafeInteger(input.endAt) || !Number.isFinite(new Date(input.endAt).getTime()))) throw new Error("Data final inválida.");
  if (input.cycle === "custom" && (input.endAt === null || input.endAt <= input.startAt)) throw new Error("Período personalizado inválido.");
  if (new Set(input.categoryLimits.map((item) => item.categoryId)).size !== input.categoryLimits.length) throw new Error("Categoria repetida no orçamento.");
  if (input.categoryLimits.some((item) => item.limitCents !== null && (!Number.isSafeInteger(item.limitCents) || item.limitCents <= 0))) throw new Error("Limite por categoria inválido.");
}

async function validateBudgetCategories(db: SQLiteDatabase, limits: BudgetConfiguration["categoryLimits"]): Promise<void> {
  for (const item of limits) {
    const category = await db.getFirstAsync<{ id: string }>("SELECT id FROM categories WHERE id = ? AND type = 'expense'", item.categoryId);
    if (!category) throw new Error("Selecione categorias de despesa existentes para o orçamento.");
  }
}

export async function getBudgetConfiguration(db: SQLiteDatabase, id: string): Promise<BudgetConfiguration | null> {
  const row = await db.getFirstAsync<{ id: string; name: string; currency: string; amount_cents: number; color: string; cycle: BudgetCycle; start_at: number; end_at: number | null }>(
    "SELECT id, name, currency, amount_cents, color, cycle, start_at, end_at FROM budgets WHERE id = ? AND is_archived = 0", id,
  );
  if (!row) return null;
  const categoryLimits = await db.getAllAsync<{ category_id: string; limit_cents: number | null }>(
    "SELECT category_id, limit_cents FROM budget_categories WHERE budget_id = ?", id,
  );
  return {
    id: row.id, name: row.name, currency: row.currency, amountCents: row.amount_cents, color: row.color, cycle: row.cycle,
    startAt: row.start_at, endAt: row.end_at,
    categoryLimits: categoryLimits.map((item) => ({ categoryId: item.category_id, limitCents: item.limit_cents })),
  };
}

export async function updateBudget(db: SQLiteDatabase, id: string, input: Omit<BudgetConfiguration, "id">): Promise<void> {
  validateBudgetConfiguration(input);
  await db.withExclusiveTransactionAsync(async (tx) => {
    const existing = await tx.getFirstAsync<{ id: string; currency: string }>("SELECT id, currency FROM budgets WHERE id = ? AND is_archived = 0", id);
    if (!existing) throw new Error("Orçamento não encontrado.");
    if (input.currency !== undefined && input.currency.trim().toUpperCase() !== existing.currency) throw new Error("A moeda de um orçamento existente não pode mudar. Crie outro orçamento na moeda desejada.");
    await validateBudgetCategories(tx, input.categoryLimits);
    await tx.runAsync("UPDATE budgets SET name = ?, amount_cents = ?, color = ?, cycle = ?, start_at = ?, end_at = ?, updated_at = ? WHERE id = ?",
      input.name.trim(), input.amountCents, input.color, input.cycle, input.startAt, input.endAt, Date.now(), id);
    await tx.runAsync("DELETE FROM budget_categories WHERE budget_id = ?", id);
    for (const item of input.categoryLimits) await tx.runAsync("INSERT INTO budget_categories (budget_id, category_id, limit_cents) VALUES (?, ?, ?)", id, item.categoryId, item.limitCents);
  });
}

export async function archiveBudget(db: SQLiteDatabase, budgetId: string): Promise<void> {
  await db.runAsync("UPDATE budgets SET is_archived = 1, updated_at = ? WHERE id = ?", Date.now(), budgetId);
}

export type BudgetCategoryBreakdown = { id: string; name: string; icon: string; amountCents: number; count: number; limitCents: number | null };

export async function getBudgetCategoryBreakdown(db: SQLiteDatabase, budgetId: string, offset = 0): Promise<{ budget: Budget; categories: BudgetCategoryBreakdown[]; hasPrevious: boolean } | null> {
  const budget = (await listBudgets(db)).find((item) => item.id === budgetId);
  if (!budget) return null;
  const stored = await db.getFirstAsync<{ start_at: number; end_at: number | null }>("SELECT start_at, end_at FROM budgets WHERE id = ?", budgetId);
  if (!stored) return null;
  const period = budgetPeriod(budget.cycle, stored.start_at, stored.end_at, offset);
  const firstPeriod = budgetPeriod(budget.cycle, stored.start_at, stored.end_at, offset + 1);
  const hasPrevious = budget.cycle !== "custom" && firstPeriod.end > stored.start_at;
  const spent = await db.getFirstAsync<{ amountCents: number }>(`
    SELECT COALESCE(SUM(t.amount_cents), 0) AS amountCents FROM transactions t JOIN accounts a ON a.id = t.account_id
    WHERE t.type = 'expense' AND t.kind = 'standard' AND t.status = 'paid'
      AND UPPER(TRIM(a.currency)) = ?
      AND t.occurred_at >= ? AND t.occurred_at < ?
      AND (NOT EXISTS (SELECT 1 FROM budget_categories bc WHERE bc.budget_id = ?)
        OR EXISTS (SELECT 1 FROM budget_categories bc WHERE bc.budget_id = ? AND bc.category_id = t.category_id))`,
    budget.currency, period.start, period.end, budgetId, budgetId);
  const categories = await db.getAllAsync<BudgetCategoryBreakdown>(`
    SELECT c.id, c.name, c.icon, SUM(t.amount_cents) AS amountCents, COUNT(*) AS count, bc.limit_cents AS limitCents
    FROM transactions t JOIN categories c ON c.id = t.category_id JOIN accounts a ON a.id = t.account_id
    LEFT JOIN budget_categories bc ON bc.budget_id = ? AND bc.category_id = c.id
    WHERE t.type = 'expense' AND t.kind = 'standard' AND t.status = 'paid'
      AND UPPER(TRIM(a.currency)) = ?
      AND t.occurred_at >= ? AND t.occurred_at < ?
      AND (NOT EXISTS (SELECT 1 FROM budget_categories bc WHERE bc.budget_id = ?)
        OR EXISTS (SELECT 1 FROM budget_categories bc WHERE bc.budget_id = ? AND bc.category_id = t.category_id))
    GROUP BY c.id ORDER BY amountCents DESC`, budgetId, budget.currency, period.start, period.end, budgetId, budgetId);
  if (!Number.isSafeInteger(spent?.amountCents ?? 0) || categories.some((item) => !Number.isSafeInteger(item.amountCents))) throw new Error("Total do orçamento fora do limite numérico.");
  const configured = await db.getAllAsync<{ id: string; name: string; icon: string; limitCents: number | null }>(
    "SELECT c.id, c.name, c.icon, bc.limit_cents AS limitCents FROM budget_categories bc JOIN categories c ON c.id = bc.category_id WHERE bc.budget_id = ? ORDER BY c.position", budgetId,
  );
  const visible = [...categories];
  for (const category of configured) {
    if (!visible.some((item) => item.id === category.id)) visible.push({ ...category, amountCents: 0, count: 0 });
  }
  return { budget: { ...budget, startAt: period.start, endAt: period.end, spentCents: spent?.amountCents ?? 0 }, categories: visible, hasPrevious };
}

export async function listGoals(db: SQLiteDatabase, includeArchived = false): Promise<Goal[]> {
  const rows = await db.getAllAsync<{ id: string; name: string; type: "income" | "expense"; target_cents: number; color: string; due_at: number | null; is_archived: number; progress_cents: number }>(`
    SELECT g.id, g.name, g.type, g.target_cents, g.color, g.due_at, g.is_archived,
      COALESCE(SUM(CASE WHEN t.type = g.type AND t.status = 'paid' AND t.kind = 'standard' THEN t.amount_cents ELSE 0 END), 0) AS progress_cents
    FROM goals g LEFT JOIN transactions t ON t.goal_id = g.id WHERE (? = 1 OR g.is_archived = 0) GROUP BY g.id ORDER BY g.is_archived, g.created_at
  `, includeArchived ? 1 : 0);
  return rows.map((r) => ({ id: r.id, name: r.name, type: r.type, targetCents: r.target_cents, progressCents: r.progress_cents, color: r.color, dueAt: r.due_at, isArchived: r.is_archived === 1 }));
}

export async function createGoal(db: SQLiteDatabase, input: { name: string; type: Goal["type"]; targetCents: number; color: string; dueAt?: number | null }): Promise<string> {
  if (!input.name.trim()) throw new Error("Informe o nome da meta.");
  if (!Number.isSafeInteger(input.targetCents) || input.targetCents <= 0) throw new Error("Informe um valor válido maior que zero.");
  if (input.dueAt != null && (!Number.isSafeInteger(input.dueAt) || !Number.isFinite(new Date(input.dueAt).getTime()))) throw new Error("Informe uma data válida.");
  const id = createId(); const now = Date.now();
  await db.runAsync("INSERT INTO goals (id, name, type, target_cents, color, due_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)", id, input.name.trim(), input.type, input.targetCents, input.color, input.dueAt ?? null, now, now);
  return id;
}

export async function listLoans(db: SQLiteDatabase, includeArchived = false): Promise<Loan[]> {
  const rows = await db.getAllAsync<{ id: string; name: string; direction: "lent" | "borrowed"; principal_cents: number; offset_cents: number; color: string; due_at: number | null; is_archived: number; initial_transaction_id: string | null; movement_cents: number; movements: number }>(`
    SELECT l.id, l.name, l.direction, l.principal_cents, l.offset_cents, l.color, l.due_at, l.is_archived, l.initial_transaction_id,
      COALESCE(SUM(CASE WHEN t.type = 'income' THEN t.amount_cents ELSE -t.amount_cents END), 0) AS movement_cents,
      COUNT(t.id) AS movements
    FROM loans l LEFT JOIN transactions t ON t.loan_id = l.id AND t.status = 'paid' AND t.kind = 'standard' AND (l.initial_transaction_id IS NULL OR t.id != l.initial_transaction_id) WHERE (? = 1 OR l.is_archived = 0) GROUP BY l.id ORDER BY l.is_archived, l.created_at
  `, includeArchived ? 1 : 0);
  return rows.map((r) => ({ id: r.id, name: r.name, direction: r.direction, principalCents: r.principal_cents, remainingCents: Math.max(0, loanBalanceBase(r) + r.offset_cents), initialTransactionId: r.initial_transaction_id, color: r.color, dueAt: r.due_at, isArchived: r.is_archived === 1 }));
}

function loanBalanceBase(row: { direction: Loan["direction"]; principal_cents: number; initial_transaction_id: string | null; movements: number; movement_cents: number }): number {
  const movement = row.direction === "lent" ? -row.movement_cents : row.movement_cents;
  return row.initial_transaction_id !== null ? row.principal_cents + movement : row.movements === 0 ? row.principal_cents : movement;
}

export async function createLoan(db: SQLiteDatabase, input: { name: string; direction: Loan["direction"]; principalCents: number; color: string; accountId?: string; dueAt?: number | null }): Promise<string> {
  if (!input.name.trim()) throw new Error("Informe o nome do empréstimo.");
  if (!Number.isSafeInteger(input.principalCents) || input.principalCents <= 0) throw new Error("Informe um valor válido maior que zero.");
  if (input.dueAt != null && (!Number.isSafeInteger(input.dueAt) || !Number.isFinite(new Date(input.dueAt).getTime()))) throw new Error("Informe uma data válida.");
  const id = createId(); const now = Date.now(); const transactionId = createId();
  const type = input.direction === "lent" ? "expense" : "income";
  const categoryId = type === "expense" ? "outros-despesa" : "outros-receita";
  await db.withExclusiveTransactionAsync(async (tx) => {
    const account = input.accountId
      ? await tx.getFirstAsync<{ id: string }>("SELECT id FROM accounts WHERE id = ? AND is_archived = 0", input.accountId)
      : await tx.getFirstAsync<{ id: string }>("SELECT id FROM accounts WHERE is_archived = 0 ORDER BY is_primary DESC, position, created_at LIMIT 1");
    if (!account) throw new Error("Selecione uma conta ativa para o empréstimo.");
    await tx.runAsync("INSERT INTO loans (id, name, direction, principal_cents, color, due_at, created_at, updated_at, initial_transaction_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)", id, input.name.trim(), input.direction, input.principalCents, input.color, input.dueAt ?? null, now, now, transactionId);
    await tx.runAsync(
      `INSERT INTO transactions (id, type, amount_cents, category_id, description, occurred_at, created_at, updated_at, account_id, title, status, kind, loan_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'paid', 'standard', ?)`,
      transactionId, type, input.principalCents, categoryId, input.name.trim(), now, now, now, account.id, input.name.trim(), id,
    );
  });
  return id;
}

type TrackerConfiguration = { name: string; color: string; dueAt: number | null };

function validateTrackerConfiguration(input: TrackerConfiguration, amount: number): void {
  if (!input.name.trim()) throw new Error("Informe um nome.");
  if (!Number.isSafeInteger(amount) || amount <= 0) throw new Error("Informe um valor válido maior que zero.");
  if (input.dueAt !== null && (!Number.isSafeInteger(input.dueAt) || !Number.isFinite(new Date(input.dueAt).getTime()))) throw new Error("Informe uma data válida.");
}

export async function updateGoal(db: SQLiteDatabase, id: string, input: TrackerConfiguration & { targetCents: number }): Promise<void> {
  validateTrackerConfiguration(input, input.targetCents);
  const result = await db.runAsync("UPDATE goals SET name = ?, target_cents = ?, color = ?, due_at = ?, updated_at = ? WHERE id = ?", input.name.trim(), input.targetCents, input.color, input.dueAt, Date.now(), id);
  if (!result.changes) throw new Error("Meta não encontrada.");
}

async function getLoanBalance(db: SQLiteDatabase, id: string) {
  const row = await db.getFirstAsync<{ principal_cents: number; offset_cents: number; direction: Loan["direction"]; initial_transaction_id: string | null; movement_cents: number; movements: number }>(`
    SELECT l.principal_cents, l.offset_cents, l.direction, l.initial_transaction_id,
      COALESCE(SUM(CASE WHEN t.type = 'income' THEN t.amount_cents ELSE -t.amount_cents END), 0) AS movement_cents, COUNT(t.id) AS movements
    FROM loans l LEFT JOIN transactions t ON t.loan_id = l.id AND t.status = 'paid' AND t.kind = 'standard' AND (l.initial_transaction_id IS NULL OR t.id != l.initial_transaction_id) WHERE l.id = ? GROUP BY l.id`, id);
  if (!row) throw new Error("Empréstimo não encontrado.");
  const base = loanBalanceBase(row);
  return { ...row, base, remaining: Math.max(0, base + row.offset_cents) };
}

export async function updateLoan(db: SQLiteDatabase, id: string, input: TrackerConfiguration & { principalCents: number }): Promise<void> {
  validateTrackerConfiguration(input, input.principalCents);
  await db.withExclusiveTransactionAsync(async (tx) => {
    const current = await getLoanBalance(tx, id);
    const delta = input.principalCents - current.principal_cents;
    const legacyMovements = current.initial_transaction_id === null && current.movements > 0;
    const offset = current.offset_cents + (legacyMovements ? delta : 0);
    const base = legacyMovements ? current.base : current.base + delta;
    if (!Number.isSafeInteger(offset) || !Number.isSafeInteger(base + offset)) throw new Error("Ajuste excede o limite de saldo suportado.");
    await tx.runAsync("UPDATE loans SET name = ?, principal_cents = ?, offset_cents = ?, color = ?, due_at = ?, updated_at = ? WHERE id = ?", input.name.trim(), input.principalCents, offset, input.color, input.dueAt, Date.now(), id);
    if (delta !== 0) await tx.runAsync("INSERT INTO activity_log (entity_type, entity_id, action, occurred_at) VALUES ('loan', ?, ?, ?)", id, `loan_reference_adjusted:${current.principal_cents}:${input.principalCents}`, Date.now());
  });
}

export async function setLoanRemainingBalance(db: SQLiteDatabase, id: string, remainingCents: number): Promise<void> {
  if (!Number.isSafeInteger(remainingCents) || remainingCents < 0) throw new Error("Informe um saldo válido igual ou maior que zero.");
  await db.withExclusiveTransactionAsync(async (tx) => {
    const current = await getLoanBalance(tx, id);
    const offset = remainingCents - current.base;
    if (!Number.isSafeInteger(offset)) throw new Error("Compensação excede o limite de saldo suportado.");
    await tx.runAsync("UPDATE loans SET offset_cents = ?, updated_at = ? WHERE id = ?", offset, Date.now(), id);
    await tx.runAsync("INSERT INTO activity_log (entity_type, entity_id, action, occurred_at) VALUES ('loan', ?, ?, ?)", id, `loan_balance_adjusted:${current.remaining}:${remainingCents}`, Date.now());
  });
}

export async function setTrackerArchived(db: SQLiteDatabase, kind: "goals" | "loans", id: string, archived: boolean): Promise<void> {
  const result = await db.runAsync(`UPDATE ${kind === "loans" ? "loans" : "goals"} SET is_archived = ?, updated_at = ? WHERE id = ?`, archived ? 1 : 0, Date.now(), id);
  if (!result.changes) throw new Error("Item não encontrado.");
}

export async function setLoanInitialTransaction(db: SQLiteDatabase, id: string, transactionId: string): Promise<void> {
  await db.withExclusiveTransactionAsync(async (tx) => {
    const current = await getLoanBalance(tx, id);
    const movement = await tx.getFirstAsync<{ type: string; status: string; kind: string; loan_id: string | null }>("SELECT type, status, kind, loan_id FROM transactions WHERE id = ?", transactionId);
    if (!movement || movement.loan_id !== id || movement.status !== "paid" || movement.kind !== "standard" || movement.type !== (current.direction === "lent" ? "expense" : "income")) throw new Error("Selecione um desembolso pago e vinculado a este empréstimo, com a direção correta.");
    if (current.initial_transaction_id === transactionId) return;
    await tx.runAsync("UPDATE loans SET initial_transaction_id = ? WHERE id = ?", transactionId, id);
    const updated = await getLoanBalance(tx, id);
    const offset = current.base + current.offset_cents - updated.base;
    if (!Number.isSafeInteger(offset)) throw new Error("Vínculo excede o limite de saldo suportado.");
    await tx.runAsync("UPDATE loans SET offset_cents = ?, updated_at = ? WHERE id = ?", offset, Date.now(), id);
    await tx.runAsync("INSERT INTO activity_log (entity_type, entity_id, action, occurred_at) VALUES ('loan', ?, ?, ?)", id, `loan_disbursement_linked:${current.initial_transaction_id ?? ""}:${transactionId}`, Date.now());
  });
}

export async function listSchedules(db: SQLiteDatabase, includeInactive = false): Promise<Schedule[]> {
  const rows = await db.getAllAsync<{ id: string; title: string; type: "expense" | "income"; amount_cents: number; account_id: string; category_id: string; frequency: Schedule["frequency"]; next_at: number; is_subscription: number; is_active: number }>(
    "SELECT id, title, type, amount_cents, account_id, category_id, frequency, next_at, is_subscription, is_active FROM schedules WHERE (? = 1 OR is_active = 1) ORDER BY is_active DESC, next_at", includeInactive ? 1 : 0,
  );
  return rows.map((r) => ({ id: r.id, title: r.title, type: r.type, amountCents: r.amount_cents, accountId: r.account_id, categoryId: r.category_id, frequency: r.frequency, nextAt: r.next_at, isSubscription: r.is_subscription === 1, isActive: r.is_active === 1 }));
}

type ScheduleInput = Omit<Schedule, "id" | "isActive">;

function validateSchedule(input: ScheduleInput): void {
  if (!input.title.trim()) throw new Error("Informe o nome da recorrência.");
  if (!Number.isSafeInteger(input.amountCents) || input.amountCents <= 0) throw new Error("Informe um valor válido maior que zero.");
  if (!Number.isSafeInteger(input.nextAt) || !Number.isFinite(new Date(input.nextAt).getTime())) throw new Error("Informe uma data válida.");
  if (!["once", "weekly", "monthly", "yearly"].includes(input.frequency)) throw new Error("Frequência inválida.");
}

async function validateScheduleReferences(db: SQLiteDatabase, input: Pick<ScheduleInput, "accountId" | "categoryId" | "type">): Promise<void> {
  const account = await db.getFirstAsync<{ id: string }>("SELECT id FROM accounts WHERE id = ? AND is_archived = 0", input.accountId);
  if (!account) throw new Error("Selecione uma conta ativa.");
  const category = await db.getFirstAsync<{ id: string }>("SELECT id FROM categories WHERE id = ? AND type = ? AND is_active = 1", input.categoryId, input.type);
  if (!category) throw new Error("Selecione uma categoria ativa compatível com o tipo de lançamento.");
}

export async function createSchedule(db: SQLiteDatabase, input: ScheduleInput): Promise<string> {
  validateSchedule(input);
  const id = createId(); const now = Date.now();
  await db.withExclusiveTransactionAsync(async (tx) => {
    await validateScheduleReferences(tx, input);
    await tx.runAsync("INSERT INTO schedules (id, title, type, amount_cents, account_id, category_id, frequency, next_at, is_subscription, created_at, updated_at, anchor_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", id, input.title.trim(), input.type, input.amountCents, input.accountId, input.categoryId, input.frequency, input.nextAt, input.isSubscription ? 1 : 0, now, now, input.nextAt);
  });
  return id;
}

export async function updateSchedule(db: SQLiteDatabase, id: string, input: ScheduleInput, options: { updateFuturePending?: boolean; now?: number } = {}): Promise<void> {
  validateSchedule(input);
  const now = options.now ?? Date.now();
  await db.withExclusiveTransactionAsync(async (tx) => {
    const existing = await tx.getFirstAsync<{ next_at: number; frequency: Schedule["frequency"]; anchor_at: number }>("SELECT next_at, frequency, anchor_at FROM schedules WHERE id = ?", id);
    if (!existing) throw new Error("Recorrência não encontrada.");
    await validateScheduleReferences(tx, input);
    const anchor = existing.next_at !== input.nextAt || existing.frequency !== input.frequency ? input.nextAt : existing.anchor_at;
    await tx.runAsync("UPDATE schedules SET title = ?, type = ?, amount_cents = ?, account_id = ?, category_id = ?, frequency = ?, next_at = ?, is_subscription = ?, anchor_at = ?, updated_at = ? WHERE id = ?",
      input.title.trim(), input.type, input.amountCents, input.accountId, input.categoryId, input.frequency, input.nextAt, input.isSubscription ? 1 : 0, anchor, now, id);
    if (options.updateFuturePending) {
      await tx.runAsync("UPDATE transactions SET title = ?, description = ?, type = ?, amount_cents = ?, account_id = ?, category_id = ?, updated_at = ? WHERE schedule_id = ? AND status = 'pending' AND kind = 'standard' AND occurred_at >= ?",
        input.title.trim(), input.title.trim(), input.type, input.amountCents, input.accountId, input.categoryId, now, id, now);
    }
  });
}

export async function setScheduleActive(db: SQLiteDatabase, id: string, active: boolean): Promise<void> {
  await db.withExclusiveTransactionAsync(async (tx) => {
    const schedule = await tx.getFirstAsync<{ frequency: Schedule["frequency"]; next_at: number; account_id: string; category_id: string; type: Schedule["type"] }>("SELECT frequency, next_at, account_id, category_id, type FROM schedules WHERE id = ?", id);
    if (!schedule) throw new Error("Recorrência não encontrada.");
    if (active) {
      await validateScheduleReferences(tx, { accountId: schedule.account_id, categoryId: schedule.category_id, type: schedule.type });
      if (schedule.frequency === "once" && await tx.getFirstAsync("SELECT transaction_id FROM schedule_instances WHERE schedule_id = ? AND scheduled_for = ?", id, schedule.next_at)) throw new Error("Edite a data antes de reativar uma ocorrência única já gerada.");
    }
    await tx.runAsync("UPDATE schedules SET is_active = ?, updated_at = ? WHERE id = ?", active ? 1 : 0, Date.now(), id);
  });
}

export async function deleteSchedule(db: SQLiteDatabase, id: string): Promise<void> {
  await db.withExclusiveTransactionAsync(async (tx) => {
    await tx.runAsync("UPDATE transactions SET schedule_id = NULL, updated_at = ? WHERE schedule_id = ?", Date.now(), id);
    await tx.runAsync("DELETE FROM schedule_instances WHERE schedule_id = ?", id);
    await tx.runAsync("DELETE FROM schedules WHERE id = ?", id);
  });
}

function addFrequency(timestamp: number, frequency: Schedule["frequency"], anchor: number) {
  const date = new Date(timestamp);
  if (frequency === "weekly") date.setDate(date.getDate() + 7);
  else if (frequency === "monthly" || frequency === "yearly") {
    const original = new Date(anchor);
    const day = original.getDate();
    date.setDate(1);
    if (frequency === "monthly") date.setMonth(date.getMonth() + 1);
    else { date.setFullYear(date.getFullYear() + 1); date.setMonth(original.getMonth()); }
    const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
    date.setDate(Math.min(day, lastDay));
  }
  return date.getTime();
}

const scheduleRefreshes = new WeakMap<SQLiteDatabase, Promise<void>>();

export function materializeScheduledTransactions(db: SQLiteDatabase, now = Date.now()): Promise<void> {
  const refresh = (scheduleRefreshes.get(db) ?? Promise.resolve()).catch(() => undefined).then(() => materializeSchedules(db, now));
  scheduleRefreshes.set(db, refresh);
  return refresh;
}

async function materializeSchedules(db: SQLiteDatabase, now: number): Promise<void> {
  const until = now + 45 * 24 * 60 * 60 * 1000;
  if (!Number.isSafeInteger(now) || !Number.isFinite(new Date(now).getTime()) || !Number.isSafeInteger(until) || !Number.isFinite(new Date(until).getTime())) throw new Error("Data de consulta das recorrências inválida.");
  const schedules = await db.getAllAsync<{ id: string; title: string; type: "expense" | "income"; amount_cents: number; account_id: string; category_id: string; frequency: Schedule["frequency"]; next_at: number }>(
    "SELECT id, title, type, amount_cents, account_id, category_id, frequency, next_at FROM schedules WHERE is_active = 1 AND next_at <= ? ORDER BY next_at",
    until,
  );
  for (const candidate of schedules) {
    await db.withExclusiveTransactionAsync(async (tx) => {
      const schedule = await tx.getFirstAsync<typeof candidate>("SELECT id, title, type, amount_cents, account_id, category_id, frequency, next_at FROM schedules WHERE id = ? AND is_active = 1", candidate.id);
      if (!schedule) return;
      validateSchedule({ title: schedule.title, type: schedule.type, amountCents: schedule.amount_cents, accountId: schedule.account_id, categoryId: schedule.category_id, frequency: schedule.frequency, nextAt: schedule.next_at, isSubscription: false });
      const stored = await tx.getFirstAsync<{ anchor_at: number | null }>("SELECT anchor_at FROM schedules WHERE id = ?", schedule.id);
      const anchor = stored?.anchor_at ?? schedule.next_at;
      if (!Number.isSafeInteger(anchor) || !Number.isFinite(new Date(anchor).getTime())) throw new Error("Data de referência da recorrência inválida.");
      let nextAt = schedule.next_at;
      while (nextAt <= until) {
        const exists = await tx.getFirstAsync<{ transaction_id: string }>("SELECT transaction_id FROM schedule_instances WHERE schedule_id = ? AND scheduled_for = ?", schedule.id, nextAt);
        if (!exists) {
          const transactionId = createId(); const timestamp = Date.now();
          await tx.runAsync(
            `INSERT INTO transactions (id, type, amount_cents, category_id, description, occurred_at, created_at, updated_at, account_id, title, status, kind, schedule_id)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', 'standard', ?)`,
            transactionId, schedule.type, schedule.amount_cents, schedule.category_id, schedule.title, nextAt, timestamp, timestamp, schedule.account_id, schedule.title, schedule.id,
          );
          await tx.runAsync("INSERT INTO schedule_instances (schedule_id, scheduled_for, transaction_id) VALUES (?, ?, ?)", schedule.id, nextAt, transactionId);
        }
        if (schedule.frequency === "once") {
          await tx.runAsync("UPDATE schedules SET is_active = 0, updated_at = ? WHERE id = ?", Date.now(), schedule.id);
          break;
        }
        const following = addFrequency(nextAt, schedule.frequency, anchor);
        if (!Number.isSafeInteger(following) || !Number.isFinite(new Date(following).getTime()) || following <= nextAt) throw new Error("A data da recorrência não pode avançar. Confira sua frequência e referência.");
        nextAt = following;
      }
      if (schedule.frequency !== "once" && nextAt !== schedule.next_at) await tx.runAsync("UPDATE schedules SET next_at = ?, updated_at = ? WHERE id = ?", nextAt, Date.now(), schedule.id);
    });
  }
}
