import assert from "node:assert/strict";
import test from "node:test";
import { validateTransactionDraft } from "../src/utils/validation";
import { parseDateInput } from "../src/utils/dates";

const valid = { type: "expense" as const, amountCents: 100, categoryId: "alimentacao", occurredAt: Date.now() };

test("valid transaction draft passes", () => assert.equal(validateTransactionDraft(valid), null));
test("zero amount fails", () => assert.equal(validateTransactionDraft({ ...valid, amountCents: 0 }), "Informe um valor maior que zero."));
test("missing category fails", () => assert.equal(validateTransactionDraft({ ...valid, categoryId: "" }), "Escolha uma categoria."));
test("date input accepts valid Brazilian dates and rejects impossible dates", () => {
  assert.equal(new Date(parseDateInput("21/09/2026") ?? 0).getFullYear(), 2026);
  assert.equal(parseDateInput("31/02/2026"), null);
});
