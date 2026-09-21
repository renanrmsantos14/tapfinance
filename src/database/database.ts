import type { SQLiteDatabase } from "expo-sqlite";

const expenseCategories = [
  ["alimentacao", "Alimentação", "utensils"],
  ["transporte", "Transporte", "car"],
  ["combustivel", "Combustível", "fuel"],
  ["casa", "Casa", "house"],
  ["compras", "Compras", "shopping-bag"],
  ["saude", "Saúde", "heart-pulse"],
  ["lazer", "Lazer", "gamepad-2"],
  ["assinaturas", "Assinaturas", "receipt-text"],
  ["outros-despesa", "Outros", "ellipsis"],
] as const;

const incomeCategories = [
  ["salario", "Salário", "briefcase-business"],
  ["reembolso", "Reembolso", "refresh-ccw"],
  ["venda", "Venda", "tag"],
] as const;

export async function initializeDatabase(db: SQLiteDatabase): Promise<void> {
  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version INTEGER PRIMARY KEY NOT NULL,
      applied_at INTEGER NOT NULL
    );
  `);

  const current = await db.getFirstAsync<{ version: number }>("SELECT COALESCE(MAX(version), 0) AS version FROM schema_migrations");
  const version = current?.version ?? 0;

  if (version < 1) {
    await db.execAsync(`
    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      icon TEXT NOT NULL,
      type TEXT NOT NULL CHECK (type IN ('expense', 'income')),
      position INTEGER NOT NULL,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS transactions (
      id TEXT PRIMARY KEY NOT NULL,
      type TEXT NOT NULL CHECK (type IN ('expense', 'income')),
      amount_cents INTEGER NOT NULL,
      category_id TEXT NOT NULL,
      description TEXT,
      occurred_at INTEGER NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      FOREIGN KEY (category_id) REFERENCES categories(id)
    );
    CREATE INDEX IF NOT EXISTS idx_transactions_occurred_at ON transactions(occurred_at DESC);
    `);
    await db.runAsync("INSERT INTO schema_migrations (version, applied_at) VALUES (?, ?)", 1, Date.now());
  }

  const row = await db.getFirstAsync<{ count: number }>("SELECT COUNT(*) as count FROM categories");
  if ((row?.count ?? 0) > 0) return;

  const now = Date.now();
  const statement = await db.prepareAsync(
    "INSERT INTO categories (id, name, icon, type, position, is_active, created_at) VALUES (?, ?, ?, ?, ?, 1, ?)",
  );
  try {
    let position = 0;
    for (const [id, name, icon] of expenseCategories) {
      await statement.executeAsync(id, name, icon, "expense", position++, now);
    }
    position = 0;
    for (const [id, name, icon] of incomeCategories) {
      await statement.executeAsync(id, name, icon, "income", position++, now);
    }
  } finally {
    await statement.finalizeAsync();
  }
}
