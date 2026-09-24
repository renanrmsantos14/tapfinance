import type { SQLiteDatabase } from "expo-sqlite";
import { createId } from "../database/ids";
import type { Category, TransactionType } from "../types/category";

type CategoryRow = {
  id: string;
  name: string;
  icon: string;
  type: TransactionType;
  position: number;
  parent_id: string | null;
  color: string;
  is_active: number;
};

function mapCategory(row: CategoryRow): Category {
  return { id: row.id, name: row.name, icon: row.icon, type: row.type, position: row.position, parentId: row.parent_id, color: row.color, isActive: row.is_active === 1 };
}

export async function listCategories(db: SQLiteDatabase, type: TransactionType): Promise<Category[]> {
  const rows = await db.getAllAsync<CategoryRow>(
    "SELECT id, name, icon, type, position, parent_id, color, is_active FROM categories WHERE type = ? AND is_active = 1 ORDER BY position",
    type,
  );
  return rows.map(mapCategory);
}

export async function getCategory(db: SQLiteDatabase, id: string): Promise<Category | null> {
  const row = await db.getFirstAsync<CategoryRow>(
    "SELECT id, name, icon, type, position, parent_id, color, is_active FROM categories WHERE id = ?",
    id,
  );
  return row ? mapCategory(row) : null;
}

async function validateParent(db: SQLiteDatabase, type: TransactionType, parentId: string | null, ownId?: string): Promise<void> {
  if (!parentId) return;
  if (parentId === ownId) throw new Error("Uma categoria não pode ser sua própria categoria pai.");
  const parent = await getCategory(db, parentId);
  if (!parent?.isActive || parent.type !== type || parent.parentId) throw new Error("Escolha uma categoria principal do mesmo tipo.");
  if (ownId) {
    const children = await db.getFirstAsync<{ count: number }>("SELECT COUNT(*) AS count FROM categories WHERE parent_id = ? AND is_active = 1", ownId);
    if (children?.count) throw new Error("Mova as subcategorias antes de transformar esta categoria em subcategoria.");
  }
}

export async function createCategory(db: SQLiteDatabase, input: { name: string; type: TransactionType; icon: string; color: string; parentId: string | null }): Promise<string> {
  const name = input.name.trim();
  if (!name) throw new Error("Informe o nome da categoria.");
  await validateParent(db, input.type, input.parentId);
  const position = await db.getFirstAsync<{ next_position: number }>("SELECT COALESCE(MAX(position), -1) + 1 AS next_position FROM categories WHERE type = ?", input.type);
  const id = createId();
  await db.runAsync("INSERT INTO categories (id, name, icon, type, position, is_active, created_at, parent_id, color) VALUES (?, ?, ?, ?, ?, 1, ?, ?, ?)", id, name, input.icon, input.type, position?.next_position ?? 0, Date.now(), input.parentId, input.color);
  return id;
}

export async function updateCategory(db: SQLiteDatabase, id: string, input: { name: string; icon: string; color: string; parentId: string | null }): Promise<void> {
  const current = await getCategory(db, id);
  if (!current?.isActive) throw new Error("Categoria não encontrada.");
  const name = input.name.trim();
  if (!name) throw new Error("Informe o nome da categoria.");
  await validateParent(db, current.type, input.parentId, id);
  await db.runAsync("UPDATE categories SET name = ?, icon = ?, color = ?, parent_id = ? WHERE id = ?", name, input.icon, input.color, input.parentId, id);
}

export async function archiveCategory(db: SQLiteDatabase, id: string): Promise<void> {
  await db.withTransactionAsync(async () => {
    await db.runAsync("UPDATE categories SET parent_id = NULL WHERE parent_id = ?", id);
    await db.runAsync("UPDATE categories SET is_active = 0 WHERE id = ?", id);
  });
}

export async function moveCategory(db: SQLiteDatabase, id: string, direction: -1 | 1): Promise<void> {
  const current = await getCategory(db, id);
  if (!current?.isActive) return;
  const siblings = (await listCategories(db, current.type)).filter((item) => item.parentId === current.parentId);
  const index = siblings.findIndex((item) => item.id === id);
  const target = siblings[index + direction];
  if (!target) return;
  await db.withTransactionAsync(async () => {
    await db.runAsync("UPDATE categories SET position = ? WHERE id = ?", target.position, current.id);
    await db.runAsync("UPDATE categories SET position = ? WHERE id = ?", current.position, target.id);
  });
}
