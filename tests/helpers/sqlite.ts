import { DatabaseSync, type SQLInputValue } from "node:sqlite";
import type { SQLiteDatabase } from "expo-sqlite";
import { initializeDatabase } from "../../src/database/database";

export async function createTestDatabase() {
  const sqlite = new DatabaseSync(":memory:");
  let queue = Promise.resolve();
  const db = {
    execAsync: async (sql: string) => { sqlite.exec(sql); },
    runAsync: async (sql: string, ...values: SQLInputValue[]) => sqlite.prepare(sql).run(...values),
    getFirstAsync: async (sql: string, ...values: SQLInputValue[]) => sqlite.prepare(sql).get(...values) ?? null,
    getAllAsync: async (sql: string, ...values: SQLInputValue[]) => sqlite.prepare(sql).all(...values),
    prepareAsync: async (sql: string) => {
      const statement = sqlite.prepare(sql);
      return { executeAsync: async (...values: SQLInputValue[]) => statement.run(...values), finalizeAsync: async () => undefined };
    },
    withTransactionAsync: async (action: () => Promise<unknown>) => {
      sqlite.exec("BEGIN");
      try { await action(); sqlite.exec("COMMIT"); }
      catch (error) { sqlite.exec("ROLLBACK"); throw error; }
    },
    withExclusiveTransactionAsync: async (action: (tx: SQLiteDatabase) => Promise<unknown>) => {
      const result = queue.then(() => db.withTransactionAsync(() => action(db as unknown as SQLiteDatabase)));
      queue = result.catch(() => undefined);
      await result;
    },
  };
  await initializeDatabase(db as unknown as SQLiteDatabase);
  return { sqlite, db: db as unknown as SQLiteDatabase };
}
