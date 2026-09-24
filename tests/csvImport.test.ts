import assert from "node:assert/strict";
import test from "node:test";
import { parseCsvPreview } from "../src/utils/csvImport";

test("CSV import reads quoted Brazilian amounts and multiline descriptions", () => {
  const csv = '"data","tipo","categoria","descrição","valor","conta","status"\n"24/09/2026","despesa","Alimentação","Almoço, equipe\nsem pressa","R$ 32,90","Principal","paid"';
  const preview = parseCsvPreview(csv);
  assert.equal(preview.rows.length, 1);
  assert.equal(preview.rows[0].amountCents, 3290);
  assert.equal(preview.rows[0].description, "Almoço, equipe\nsem pressa");
  assert.equal(preview.rows[0].type, "expense");
  assert.equal(preview.rows[0].accountName, "Principal");
  assert.equal(parseCsvPreview(`\uFEFF${csv}`).sourceHash, preview.sourceHash);
});

test("CSV import rejects malformed rows before writing data", () => {
  assert.throws(() => parseCsvPreview('data,tipo,categoria,descrição,valor\n31/02/2026,despesa,Casa,Luz,"R$ 20,00"'), /Linha 2/);
  assert.throws(() => parseCsvPreview('data,tipo,categoria,descrição,valor\n24/09/2026,despesa,Casa,Luz,"R$ -20,00"'), /Linha 2/);
  assert.throws(() => parseCsvPreview('data,tipo,categoria,descrição,valor\n"24/09/2026,despesa,Casa,Luz,R$ 20,00'), /aspas sem fechamento/);
});

test("CSV import requires both sides of each transfer", () => {
  const header = "data,tipo,categoria,descrição,valor,conta,natureza,grupo_transferencia";
  const expense = '24/09/2026,despesa,Outros,Transferência,"R$ 50,00",Principal,transfer,grupo-1';
  const income = '24/09/2026,receita,Outros,Transferência,"R$ 50,00",Reserva,transfer,grupo-1';
  assert.throws(() => parseCsvPreview(`${header}\n${expense}`), /Transferência incompleta/);
  assert.equal(parseCsvPreview(`${header}\n${expense}\n${income}`).rows.length, 2);
  assert.throws(() => parseCsvPreview(`${header}\n${expense}\n${income.replace("Reserva", "Principal")}`), /contas, datas ou status incompatíveis/);
});
