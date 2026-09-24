import type { SQLiteDatabase } from "expo-sqlite";
import { createId } from "../database/ids";
import type { TransactionType } from "../types/category";
import type { Transaction, TransactionDraft } from "../types/transaction";

type TransactionRow = {
  id: string;
  type: TransactionType;
  amount_cents: number;
  category_id: string;
  category_name: string;
  category_icon: string;
  description: string | null;
  occurred_at: number;
  created_at: number;
  updated_at: number;
  account_id: string;
  account_name: string;
  title: string | null;
  notes: string | null;
  status: "paid" | "pending";
  kind: "standard" | "transfer" | "correction";
  transfer_group_id: string | null;
  goal_id: string | null;
  loan_id: string | null;
  schedule_id: string | null;
};

function mapTransaction(row: TransactionRow): Transaction {
  return {
    id: row.id,
    type: row.type,
    amountCents: row.amount_cents,
    categoryId: row.category_id,
    categoryName: row.category_name,
    categoryIcon: row.category_icon,
    description: row.description,
    occurredAt: row.occurred_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    accountId: row.account_id,
    accountName: row.account_name,
    title: row.title,
    notes: row.notes,
    status: row.status,
    kind: row.kind,
    transferGroupId: row.transfer_group_id,
    goalId: row.goal_id,
    loanId: row.loan_id,
    scheduleId: row.schedule_id,
  };
}

const selectBase = `
  SELECT t.id, t.type, t.amount_cents, t.category_id, c.name AS category_name,
    c.icon AS category_icon, t.description, t.occurred_at, t.created_at, t.updated_at,
    t.account_id, a.name AS account_name, t.title, t.notes, t.status, t.kind, t.transfer_group_id, t.goal_id, t.loan_id, t.schedule_id
  FROM transactions t JOIN categories c ON c.id = t.category_id
  JOIN accounts a ON a.id = t.account_id
`;

export async function listTransactions(db: SQLiteDatabase, type?: TransactionType): Promise<Transaction[]> {
  const rows = type
    ? await db.getAllAsync<TransactionRow>(`${selectBase} WHERE t.type = ? ORDER BY t.occurred_at DESC, t.created_at DESC`, type)
    : await db.getAllAsync<TransactionRow>(`${selectBase} ORDER BY t.occurred_at DESC, t.created_at DESC`);
  return rows.map(mapTransaction);
}

export async function getTransaction(db: SQLiteDatabase, id: string): Promise<Transaction | null> {
  const row = await db.getFirstAsync<TransactionRow>(`${selectBase} WHERE t.id = ?`, id);
  return row ? mapTransaction(row) : null;
}

export async function listLoanTransactions(db: SQLiteDatabase, loanId: string): Promise<Transaction[]> {
  const rows = await db.getAllAsync<TransactionRow>(`${selectBase} WHERE t.loan_id = ? ORDER BY t.occurred_at DESC, t.created_at DESC`, loanId);
  return rows.map(mapTransaction);
}

export async function listGoalTransactions(db: SQLiteDatabase, goalId: string): Promise<Transaction[]> {
  const rows = await db.getAllAsync<TransactionRow>(`${selectBase} WHERE t.goal_id = ? ORDER BY t.occurred_at DESC, t.created_at DESC`, goalId);
  return rows.map(mapTransaction);
}

export async function suggestCategoryFromHistory(db: SQLiteDatabase, type: TransactionType, description: string): Promise<string | null> {
  const normalized = description.trim();
  if (!normalized) return null;
  const matches = await db.getAllAsync<{ category_id: string; uses: number }>(
    `SELECT t.category_id, COUNT(*) AS uses
     FROM transactions t JOIN categories c ON c.id = t.category_id
     WHERE t.type = ? AND c.type = ? AND c.is_active = 1
       AND LOWER(TRIM(t.description)) = LOWER(?)
       AND t.category_id NOT IN ('outros-despesa', 'outros-receita')
     GROUP BY t.category_id ORDER BY uses DESC LIMIT 2`,
    type, type, normalized,
  );
  const requiredUses = normalized.toLocaleLowerCase("pt-BR").startsWith("pix de ") ? 1 : 2;
  return matches[0]?.uses >= requiredUses && matches[0].uses > (matches[1]?.uses ?? 0) ? matches[0].category_id : null;
}

export async function createTransaction(db: SQLiteDatabase, draft: TransactionDraft, sourceSuggestionId?: string): Promise<string> {
  const now = Date.now();
  const id = createId();
  const result = await db.runAsync(
    "INSERT INTO transactions (id, type, amount_cents, category_id, description, occurred_at, created_at, updated_at, source_suggestion_id, account_id, title, notes, status, kind, goal_id, loan_id, schedule_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(source_suggestion_id) DO NOTHING",
    id,
    draft.type,
    draft.amountCents,
    draft.categoryId,
    draft.description?.trim() || null,
    draft.occurredAt,
    now,
    now,
    sourceSuggestionId ?? null,
    draft.accountId ?? "principal",
    draft.title?.trim() || draft.description?.trim() || null,
    draft.notes?.trim() || null,
    draft.status ?? "paid",
    draft.kind ?? "standard",
    draft.goalId ?? null,
    draft.loanId ?? null,
    draft.scheduleId ?? null,
  );
  if (result.changes === 0 && sourceSuggestionId) {
    const existing = await db.getFirstAsync<{ id: string }>("SELECT id FROM transactions WHERE source_suggestion_id = ?", sourceSuggestionId);
    if (existing) return existing.id;
    throw new Error("Lançamento da sugestão não encontrado após conflito.");
  }
  return id;
}

export async function updateTransaction(db: SQLiteDatabase, id: string, draft: TransactionDraft): Promise<void> {
  const existing = await db.getFirstAsync<{ kind: Transaction["kind"] }>("SELECT kind FROM transactions WHERE id = ?", id);
  if (!existing) throw new Error("Lançamento não encontrado.");
  if (existing.kind !== "standard" || (draft.kind && draft.kind !== "standard")) throw new Error("Transferências e correções não podem ser editadas como lançamentos comuns.");
  await db.runAsync(
    "UPDATE transactions SET type = ?, amount_cents = ?, category_id = ?, description = ?, occurred_at = ?, account_id = ?, title = ?, notes = ?, status = ?, kind = ?, goal_id = ?, loan_id = ?, schedule_id = ?, updated_at = ? WHERE id = ?",
    draft.type,
    draft.amountCents,
    draft.categoryId,
    draft.description?.trim() || null,
    draft.occurredAt,
    draft.accountId ?? "principal",
    draft.title?.trim() || draft.description?.trim() || null,
    draft.notes?.trim() || null,
    draft.status ?? "paid",
    draft.kind ?? "standard",
    draft.goalId ?? null,
    draft.loanId ?? null,
    draft.scheduleId ?? null,
    Date.now(),
    id,
  );
}

export async function deleteTransaction(db: SQLiteDatabase, id: string): Promise<void> {
  await db.withExclusiveTransactionAsync(async (tx) => {
    const existing = await tx.getFirstAsync<{ kind: Transaction["kind"]; transfer_group_id: string | null }>(
      "SELECT kind, transfer_group_id FROM transactions WHERE id = ?", id,
    );
    if (!existing) throw new Error("Lançamento não encontrado.");
    if (existing.kind === "transfer") {
      if (!existing.transfer_group_id) throw new Error("Transferência sem vínculo. Corrija os dados antes de excluir.");
      await tx.runAsync("DELETE FROM transactions WHERE kind = 'transfer' AND transfer_group_id = ?", existing.transfer_group_id);
    } else await tx.runAsync("DELETE FROM transactions WHERE id = ?", id);
  });
}

export async function getMonthSummary(db: SQLiteDatabase, start: number, end: number) {
  return db.getFirstAsync<{ income: number; expense: number }>(
    `SELECT COALESCE(SUM(CASE WHEN type = 'income' THEN amount_cents ELSE 0 END), 0) AS income,
      COALESCE(SUM(CASE WHEN type = 'expense' THEN amount_cents ELSE 0 END), 0) AS expense
     FROM transactions WHERE occurred_at >= ? AND occurred_at < ? AND status = 'paid' AND kind = 'standard'`,
    start,
    end,
  );
}
