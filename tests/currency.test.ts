import assert from "node:assert/strict";
import test from "node:test";
import { formatCentsToBRL, parseCurrencyToCents } from "../src/utils/currency";

test("parseCurrencyToCents follows Brazilian digit entry", () => {
  assert.equal(parseCurrencyToCents("1"), 1);
  assert.equal(parseCurrencyToCents("12"), 12);
  assert.equal(parseCurrencyToCents("123"), 123);
  assert.equal(parseCurrencyToCents("1.234"), 1234);
});

test("formatCentsToBRL formats without changing stored integer", () => {
  assert.equal(formatCentsToBRL(3290), "R$ 32,90");
  assert.equal(formatCentsToBRL(123456), "R$ 1.234,56");
  assert.equal(formatCentsToBRL(0), "R$ 0,00");
});

test("currency parser rejects empty and excessive values", () => {
  assert.equal(parseCurrencyToCents(""), null);
  assert.equal(parseCurrencyToCents("999999999999999"), null);
});
