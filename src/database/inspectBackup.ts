import type { SQLiteDatabase } from "expo-sqlite";
import { CURRENT_SCHEMA_VERSION } from "./database";

const requiredTables = ["schema_migrations", "accounts", "categories", "transactions", "budgets", "budget_categories", "goals", "loans", "schedules"];

export async function inspectBackupDatabase(database: SQLiteDatabase): Promise<{ accounts: number; transactions: number; schemaVersion: number }> {
  const integrity = await database.getFirstAsync<{ integrity_check: string }>("PRAGMA integrity_check");
  if (integrity?.integrity_check !== "ok") throw new Error("O arquivo não passou na verificação de integridade.");
  const tables = await database.getAllAsync<{ name: string }>("SELECT name FROM sqlite_master WHERE type = 'table'");
  const existing = new Set(tables.map((table) => table.name));
  if (requiredTables.some((table) => !existing.has(table))) throw new Error("Este arquivo não é um backup completo do TapFinance.");
  const version = await database.getFirstAsync<{ version: number }>("SELECT COALESCE(MAX(version), 0) AS version FROM schema_migrations");
  if (!version || version.version < 3 || version.version > CURRENT_SCHEMA_VERSION) throw new Error("Versão de backup incompatível com este aplicativo.");
  if (version.version >= 4) {
    const columns = await database.getAllAsync<{ name: string }>("PRAGMA table_info(schedules)");
    if (!existing.has("schedule_instances") || !columns.some((column) => column.name === "anchor_at")) throw new Error("O backup não contém a estrutura de recorrências esperada.");
  }
  if (version.version >= 5) {
    const columns = await database.getAllAsync<{ name: string }>("PRAGMA table_info(loans)");
    if (!columns.some((column) => column.name === "initial_transaction_id")) throw new Error("O backup não contém a estrutura de empréstimos esperada.");
  }
  if (version.version >= 6) {
    const columns = await database.getAllAsync<{ name: string }>("PRAGMA table_info(budgets)");
    if (!columns.some((column) => column.name === "currency")) throw new Error("O backup não contém a estrutura monetária de orçamentos esperada.");
  }
  const accounts = await database.getFirstAsync<{ count: number }>("SELECT COUNT(*) AS count FROM accounts");
  const transactions = await database.getFirstAsync<{ count: number }>("SELECT COUNT(*) AS count FROM transactions");
  return { accounts: accounts?.count ?? 0, transactions: transactions?.count ?? 0, schemaVersion: version.version };
}
