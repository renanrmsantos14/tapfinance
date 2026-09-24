import type { TransactionType } from "../types/category";
import { parseDateInput } from "./dates";

export type CsvTransaction = {
  id: string | null; occurredAt: number; type: TransactionType; categoryName: string; description: string;
  amountCents: number; accountName: string; title: string; notes: string;
  status: "paid" | "pending"; kind: "standard" | "transfer" | "correction"; transferGroupId: string | null;
};

export type CsvPreview = { rows: CsvTransaction[]; sourceHash: string };

function parseCsv(text: string): string[][] {
  const rows: string[][] = []; let row: string[] = []; let cell = ""; let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (quoted) {
      if (char === '"' && text[index + 1] === '"') { cell += '"'; index += 1; }
      else if (char === '"') quoted = false;
      else cell += char;
    } else if (char === '"' && !cell) quoted = true;
    else if (char === ",") { row.push(cell); cell = ""; }
    else if (char === "\n" || char === "\r") {
      if (char === "\r" && text[index + 1] === "\n") index += 1;
      row.push(cell); cell = "";
      if (row.some((value) => value.trim())) rows.push(row);
      row = [];
    } else cell += char;
  }
  if (quoted) throw new Error("CSV inválido: aspas sem fechamento.");
  row.push(cell);
  if (row.some((value) => value.trim())) rows.push(row);
  return rows;
}

export function normalized(value: string): string {
  return value.trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR");
}

function parseAmount(value: string): number | null {
  const clean = value.trim().replace(/^R\$\s*/i, "").replace(/\s/g, "");
  if (!clean || clean.startsWith("-")) return null;
  const decimal = /[.,]\d{2}$/.test(clean);
  const digits = clean.replace(/\D/g, "");
  if (!digits) return null;
  const cents = BigInt(digits) * (decimal ? 1n : 100n);
  return cents > 0n && cents <= 9_999_999_999n ? Number(cents) : null;
}

function hashText(value: string): string {
  let hash = 14695981039346656037n;
  for (let index = 0; index < value.length; index += 1) hash = BigInt.asUintN(64, (hash ^ BigInt(value.charCodeAt(index))) * 1099511628211n);
  return hash.toString(16).padStart(16, "0");
}

export function parseCsvPreview(text: string): CsvPreview {
  const content = text.replace(/^\uFEFF/, "");
  if (content.length === 0 || content.length > 10 * 1024 * 1024) throw new Error("CSV vazio ou maior que 10 MB.");
  const [header, ...data] = parseCsv(content);
  if (!header) throw new Error("CSV vazio.");
  const columns = header.map(normalized);
  for (const required of ["data", "tipo", "categoria", "descricao", "valor"]) {
    if (!columns.includes(required)) throw new Error(`Coluna obrigatória ausente: ${required}.`);
  }
  if (data.length > 25_000) throw new Error("O CSV excede 25 mil lançamentos.");
  const get = (row: string[], column: string) => row[columns.indexOf(column)]?.trim() ?? "";
  const rows = data.map((row, index): CsvTransaction => {
    if (row.length !== columns.length) throw new Error(`Linha ${index + 2}: número de colunas diferente do cabeçalho.`);
    const occurredAt = parseDateInput(get(row, "data"));
    const rawType = normalized(get(row, "tipo"));
    const type = rawType === "receita" || rawType === "income" ? "income" : rawType === "despesa" || rawType === "expense" ? "expense" : null;
    const amountCents = parseAmount(get(row, "valor"));
    if (occurredAt === null || !type || amountCents === null) throw new Error(`Linha ${index + 2}: data, tipo ou valor inválido.`);
    const status = get(row, "status") || "paid";
    const kind = get(row, "natureza") || "standard";
    if (status !== "paid" && status !== "pending") throw new Error(`Linha ${index + 2}: status inválido.`);
    if (kind !== "standard" && kind !== "transfer" && kind !== "correction") throw new Error(`Linha ${index + 2}: natureza inválida.`);
    return {
      id: get(row, "id") || null, occurredAt, type, categoryName: get(row, "categoria") || "Outros",
      description: get(row, "descricao"), amountCents, accountName: get(row, "conta"),
      title: get(row, "titulo"), notes: get(row, "notas"), status, kind,
      transferGroupId: get(row, "grupo_transferencia") || null,
    };
  });
  const groups = new Map<string, CsvTransaction[]>();
  for (const row of rows) {
    if (row.kind !== "transfer") continue;
    if (!row.transferGroupId) throw new Error("Transferência sem grupo no CSV. Use o backup completo para preservar estes dados.");
    groups.set(row.transferGroupId, [...(groups.get(row.transferGroupId) ?? []), row]);
  }
  for (const pair of groups.values()) {
    if (pair.length !== 2 || pair[0].type === pair[1].type || pair[0].amountCents !== pair[1].amountCents) {
      throw new Error("Transferência incompleta no CSV. Use o backup completo para preservar estes dados.");
    }
    if (!pair[0].accountName || !pair[1].accountName || normalized(pair[0].accountName) === normalized(pair[1].accountName) || pair[0].occurredAt !== pair[1].occurredAt || pair[0].status !== pair[1].status) {
      throw new Error("Transferência com contas, datas ou status incompatíveis no CSV.");
    }
  }
  return { rows, sourceHash: hashText(content) };
}
