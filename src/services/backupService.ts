import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
import * as SQLite from "expo-sqlite";
import type { SQLiteDatabase } from "expo-sqlite";

const MAX_BACKUP_BYTES = 50 * 1024 * 1024;
const REQUIRED_TABLES = ["schema_migrations", "accounts", "categories", "transactions", "budgets", "budget_categories", "goals", "loans", "schedules"];

export type BackupPreview = { bytes: Uint8Array; accounts: number; transactions: number; schemaVersion: number };

async function inspectDatabase(database: SQLiteDatabase): Promise<Omit<BackupPreview, "bytes">> {
  const integrity = await database.getFirstAsync<{ integrity_check: string }>("PRAGMA integrity_check");
  if (integrity?.integrity_check !== "ok") throw new Error("O arquivo não passou na verificação de integridade.");
  const tables = await database.getAllAsync<{ name: string }>("SELECT name FROM sqlite_master WHERE type = 'table'");
  const existing = new Set(tables.map((table) => table.name));
  if (REQUIRED_TABLES.some((table) => !existing.has(table))) throw new Error("Este arquivo não é um backup completo do TapFinance.");
  const version = await database.getFirstAsync<{ version: number }>("SELECT COALESCE(MAX(version), 0) AS version FROM schema_migrations");
  if (version?.version !== 3) throw new Error("Versão de backup incompatível com este aplicativo.");
  const accounts = await database.getFirstAsync<{ count: number }>("SELECT COUNT(*) AS count FROM accounts");
  const transactions = await database.getFirstAsync<{ count: number }>("SELECT COUNT(*) AS count FROM transactions");
  return { accounts: accounts?.count ?? 0, transactions: transactions?.count ?? 0, schemaVersion: version.version };
}

export async function exportFullBackup(database: SQLiteDatabase): Promise<boolean> {
  if (!(await Sharing.isAvailableAsync())) return false;
  const file = new File(Paths.cache, `tapfinance-backup-${Date.now()}.db`);
  file.write(await database.serializeAsync());
  await Sharing.shareAsync(file.uri, { mimeType: "application/vnd.sqlite3", dialogTitle: "Backup completo do TapFinance" });
  return true;
}

export async function shareRecoveryBackup(name: string): Promise<boolean> {
  if (!(await Sharing.isAvailableAsync())) return false;
  const file = new File(Paths.document, name);
  if (!file.exists) throw new Error("Cópia de recuperação não encontrada.");
  await Sharing.shareAsync(file.uri, { mimeType: "application/vnd.sqlite3", dialogTitle: "Salvar cópia anterior do TapFinance" });
  return true;
}

export async function inspectBackupFile(uri: string): Promise<BackupPreview> {
  const file = new File(uri);
  if (file.size && file.size > MAX_BACKUP_BYTES) throw new Error("O backup excede 50 MB.");
  const bytes = await file.bytes();
  if (bytes.length === 0 || bytes.length > MAX_BACKUP_BYTES) throw new Error("Arquivo vazio ou maior que 50 MB.");
  const imported = await SQLite.deserializeDatabaseAsync(bytes);
  try { return { bytes, ...await inspectDatabase(imported) }; }
  finally { await imported.closeAsync(); }
}

export async function restoreFullBackup(database: SQLiteDatabase, preview: BackupPreview): Promise<string> {
  const imported = await SQLite.deserializeDatabaseAsync(preview.bytes);
  try {
    await inspectDatabase(imported);
    const original = await database.serializeAsync();
    const recoveryName = `tapfinance-before-restore-${Date.now()}.db`;
    new File(Paths.document, recoveryName).write(original);
    try {
      await SQLite.backupDatabaseAsync({ sourceDatabase: imported, destDatabase: database });
    } catch (error) {
      const recovery = await SQLite.deserializeDatabaseAsync(original);
      try { await SQLite.backupDatabaseAsync({ sourceDatabase: recovery, destDatabase: database }); }
      catch { throw new Error(`Falha ao restaurar e ao recuperar o banco anterior. Cópia local: ${recoveryName}`); }
      finally { await recovery.closeAsync(); }
      throw error;
    }
    return recoveryName;
  } finally { await imported.closeAsync(); }
}
