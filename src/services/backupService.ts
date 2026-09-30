import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
import * as SQLite from "expo-sqlite";
import type { SQLiteDatabase } from "expo-sqlite";
import { initializeDatabase } from "../database/database";
import { inspectBackupDatabase as inspectDatabase } from "../database/inspectBackup";

const MAX_BACKUP_BYTES = 50 * 1024 * 1024;

export type BackupPreview = { bytes: Uint8Array; accounts: number; transactions: number; schemaVersion: number };

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
    // Upgrade the isolated imported database before touching the live database.
    await initializeDatabase(imported);
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
