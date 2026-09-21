import type { SQLiteDatabase } from "expo-sqlite";
import type { Category, TransactionType } from "../types/category";

type CategoryRow = {
  id: string;
  name: string;
  icon: string;
  type: TransactionType;
  position: number;
  is_active: number;
};

function mapCategory(row: CategoryRow): Category {
  return { ...row, isActive: row.is_active === 1 } as Category;
}

export async function listCategories(db: SQLiteDatabase, type: TransactionType): Promise<Category[]> {
  const rows = await db.getAllAsync<CategoryRow>(
    "SELECT id, name, icon, type, position, is_active FROM categories WHERE type = ? AND is_active = 1 ORDER BY position",
    type,
  );
  return rows.map(mapCategory);
}

export async function getCategory(db: SQLiteDatabase, id: string): Promise<Category | null> {
  const row = await db.getFirstAsync<CategoryRow>(
    "SELECT id, name, icon, type, position, is_active FROM categories WHERE id = ?",
    id,
  );
  return row ? mapCategory(row) : null;
}
