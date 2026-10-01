export const MAX_TRANSACTION_TAGS = 20;
export const MAX_TAG_LENGTH = 50;

export function normalizeTransactionTags(value: unknown): string[] {
  if (!Array.isArray(value) || value.some((tag) => typeof tag !== "string")) throw new Error("Informe tags de texto válidas.");
  const tags: string[] = []; const seen = new Set<string>();
  for (const item of value as string[]) {
    const tag = item.normalize("NFC").trim().replace(/\s+/g, " ");
    if (!tag) continue;
    if (tag.length > MAX_TAG_LENGTH) throw new Error(`Cada tag pode ter até ${MAX_TAG_LENGTH} caracteres.`);
    const key = tag.toLocaleLowerCase("pt-BR");
    if (!seen.has(key)) { tags.push(tag); seen.add(key); }
  }
  if (tags.length > MAX_TRANSACTION_TAGS) throw new Error(`Use no máximo ${MAX_TRANSACTION_TAGS} tags por lançamento.`);
  return tags;
}

export function readTransactionTags(raw: string): string[] {
  try { const value: unknown = JSON.parse(raw); return Array.isArray(value) && value.every((tag) => typeof tag === "string") ? value : []; }
  catch { return []; }
}
