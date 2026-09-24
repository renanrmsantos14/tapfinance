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
  ["outros-receita", "Outros", "ellipsis"],
] as const;

const categorySeeds = [
  ...expenseCategories.map(([id, name, icon], position) => ({ id, name, icon, type: "expense" as const, position })),
  ...incomeCategories.map(([id, name, icon], position) => ({ id, name, icon, type: "income" as const, position })),
];

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

  if (version < 2) {
    await db.withTransactionAsync(async () => {
      await db.execAsync(`
        ALTER TABLE transactions ADD COLUMN source_suggestion_id TEXT;
        CREATE UNIQUE INDEX idx_transactions_source_suggestion ON transactions(source_suggestion_id);
      `);
      await db.runAsync("INSERT INTO schema_migrations (version, applied_at) VALUES (?, ?)", 2, Date.now());
    });
  }

  if (version < 3) {
    await db.withTransactionAsync(async () => {
      await db.execAsync(`
        CREATE TABLE accounts (
          id TEXT PRIMARY KEY NOT NULL,
          name TEXT NOT NULL,
          type TEXT NOT NULL CHECK (type IN ('checking', 'cash', 'savings', 'credit', 'investment')),
          currency TEXT NOT NULL DEFAULT 'BRL',
          color TEXT NOT NULL,
          opening_balance_cents INTEGER NOT NULL DEFAULT 0,
          position INTEGER NOT NULL DEFAULT 0,
          is_primary INTEGER NOT NULL DEFAULT 0,
          is_archived INTEGER NOT NULL DEFAULT 0,
          created_at INTEGER NOT NULL,
          updated_at INTEGER NOT NULL
        );
        INSERT INTO accounts (id, name, type, currency, color, opening_balance_cents, position, is_primary, is_archived, created_at, updated_at)
        VALUES ('principal', 'Principal', 'checking', 'BRL', '#D49A32', 0, 0, 1, 0, ${Date.now()}, ${Date.now()});

        ALTER TABLE categories ADD COLUMN parent_id TEXT;
        ALTER TABLE categories ADD COLUMN color TEXT NOT NULL DEFAULT '#7FA7C8';
        ALTER TABLE transactions ADD COLUMN account_id TEXT NOT NULL DEFAULT 'principal';
        ALTER TABLE transactions ADD COLUMN title TEXT;
        ALTER TABLE transactions ADD COLUMN notes TEXT;
        ALTER TABLE transactions ADD COLUMN status TEXT NOT NULL DEFAULT 'paid';
        ALTER TABLE transactions ADD COLUMN kind TEXT NOT NULL DEFAULT 'standard';
        ALTER TABLE transactions ADD COLUMN transfer_group_id TEXT;
        ALTER TABLE transactions ADD COLUMN schedule_id TEXT;
        ALTER TABLE transactions ADD COLUMN goal_id TEXT;
        ALTER TABLE transactions ADD COLUMN loan_id TEXT;
        ALTER TABLE transactions ADD COLUMN tags_json TEXT NOT NULL DEFAULT '[]';
        CREATE INDEX idx_transactions_account ON transactions(account_id, occurred_at DESC);
        CREATE INDEX idx_transactions_transfer_group ON transactions(transfer_group_id);

        CREATE TABLE budgets (
          id TEXT PRIMARY KEY NOT NULL,
          name TEXT NOT NULL,
          amount_cents INTEGER NOT NULL,
          color TEXT NOT NULL,
          cycle TEXT NOT NULL CHECK (cycle IN ('weekly', 'monthly', 'custom')),
          start_at INTEGER NOT NULL,
          end_at INTEGER,
          include_income INTEGER NOT NULL DEFAULT 0,
          is_archived INTEGER NOT NULL DEFAULT 0,
          created_at INTEGER NOT NULL,
          updated_at INTEGER NOT NULL
        );
        CREATE TABLE budget_categories (
          budget_id TEXT NOT NULL,
          category_id TEXT NOT NULL,
          limit_cents INTEGER,
          PRIMARY KEY (budget_id, category_id)
        );
        CREATE TABLE goals (
          id TEXT PRIMARY KEY NOT NULL,
          name TEXT NOT NULL,
          type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
          target_cents INTEGER NOT NULL,
          color TEXT NOT NULL,
          due_at INTEGER,
          is_archived INTEGER NOT NULL DEFAULT 0,
          created_at INTEGER NOT NULL,
          updated_at INTEGER NOT NULL
        );
        CREATE TABLE loans (
          id TEXT PRIMARY KEY NOT NULL,
          name TEXT NOT NULL,
          direction TEXT NOT NULL CHECK (direction IN ('lent', 'borrowed')),
          principal_cents INTEGER NOT NULL,
          offset_cents INTEGER NOT NULL DEFAULT 0,
          color TEXT NOT NULL,
          due_at INTEGER,
          is_archived INTEGER NOT NULL DEFAULT 0,
          created_at INTEGER NOT NULL,
          updated_at INTEGER NOT NULL
        );
        CREATE TABLE schedules (
          id TEXT PRIMARY KEY NOT NULL,
          title TEXT NOT NULL,
          type TEXT NOT NULL CHECK (type IN ('expense', 'income')),
          amount_cents INTEGER NOT NULL,
          account_id TEXT NOT NULL,
          category_id TEXT NOT NULL,
          frequency TEXT NOT NULL CHECK (frequency IN ('once', 'weekly', 'monthly', 'yearly')),
          next_at INTEGER NOT NULL,
          is_subscription INTEGER NOT NULL DEFAULT 0,
          is_active INTEGER NOT NULL DEFAULT 1,
          created_at INTEGER NOT NULL,
          updated_at INTEGER NOT NULL
        );
        CREATE TABLE activity_log (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          entity_type TEXT NOT NULL,
          entity_id TEXT NOT NULL,
          action TEXT NOT NULL,
          occurred_at INTEGER NOT NULL
        );
        CREATE TRIGGER activity_transaction_insert AFTER INSERT ON transactions
        BEGIN INSERT INTO activity_log (entity_type, entity_id, action, occurred_at) VALUES ('transaction', NEW.id, 'created', CAST(strftime('%s','now') AS INTEGER) * 1000); END;
        CREATE TRIGGER activity_transaction_update AFTER UPDATE ON transactions
        BEGIN INSERT INTO activity_log (entity_type, entity_id, action, occurred_at) VALUES ('transaction', NEW.id, 'updated', CAST(strftime('%s','now') AS INTEGER) * 1000); END;
        CREATE TRIGGER activity_transaction_delete AFTER DELETE ON transactions
        BEGIN INSERT INTO activity_log (entity_type, entity_id, action, occurred_at) VALUES ('transaction', OLD.id, 'deleted', CAST(strftime('%s','now') AS INTEGER) * 1000); END;
      `);
      await db.runAsync("INSERT INTO schema_migrations (version, applied_at) VALUES (?, ?)", 3, Date.now());
    });
  }

  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS schedule_instances (
      schedule_id TEXT NOT NULL,
      scheduled_for INTEGER NOT NULL,
      transaction_id TEXT NOT NULL UNIQUE,
      PRIMARY KEY (schedule_id, scheduled_for)
    );
    CREATE TRIGGER IF NOT EXISTS activity_transaction_insert AFTER INSERT ON transactions
    BEGIN INSERT INTO activity_log (entity_type, entity_id, action, occurred_at) VALUES ('transaction', NEW.id, 'created', CAST(strftime('%s','now') AS INTEGER) * 1000); END;
    CREATE TRIGGER IF NOT EXISTS activity_transaction_update AFTER UPDATE ON transactions
    BEGIN INSERT INTO activity_log (entity_type, entity_id, action, occurred_at) VALUES ('transaction', NEW.id, 'updated', CAST(strftime('%s','now') AS INTEGER) * 1000); END;
    CREATE TRIGGER IF NOT EXISTS activity_transaction_delete AFTER DELETE ON transactions
    BEGIN INSERT INTO activity_log (entity_type, entity_id, action, occurred_at) VALUES ('transaction', OLD.id, 'deleted', CAST(strftime('%s','now') AS INTEGER) * 1000); END;
  `);

  const now = Date.now();
  const statement = await db.prepareAsync(
    "INSERT OR IGNORE INTO categories (id, name, icon, type, position, is_active, created_at) VALUES (?, ?, ?, ?, ?, 1, ?)",
  );
  try {
    for (const category of categorySeeds) {
      await statement.executeAsync(category.id, category.name, category.icon, category.type, category.position, now);
    }
  } finally {
    await statement.finalizeAsync();
  }
}
