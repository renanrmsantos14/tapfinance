import assert from "node:assert/strict";
import test from "node:test";
import { validateTransactionDraft } from "../src/utils/validation";

const valid = { type: "expense" as const, amountCents: 100, categoryId: "alimentacao", occurredAt: Date.now() };

test("valid transaction draft passes", () => assert.equal(validateTransactionDraft(valid), null));
test("zero amount fails", () => assert.equal(validateTransactionDraft({ ...valid, amountCents: 0 }), "Informe um valor maior que zero."));
test("missing category fails", () => assert.equal(validateTransactionDraft({ ...valid, categoryId: "" }), "Escolha uma categoria."));
