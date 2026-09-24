import assert from "node:assert/strict";
import test from "node:test";
import { budgetPeriod, dailyBudgetCents } from "../src/utils/budgetPeriods";

test("monthly periods cross year boundaries without drifting", () => {
  const now = new Date(2026, 0, 15, 12).getTime();
  const previous = budgetPeriod("monthly", now, null, 1, now);
  assert.equal(previous.start, new Date(2025, 11, 1).getTime());
  assert.equal(previous.end, new Date(2026, 0, 1).getTime());
});

test("weekly periods start on Monday and remain seven local days", () => {
  const now = new Date(2026, 8, 24, 12).getTime();
  const period = budgetPeriod("weekly", now, null, 1, now);
  assert.equal(period.start, new Date(2026, 8, 14).getTime());
  assert.equal(period.end, new Date(2026, 8, 21).getTime());
});

test("custom periods do not move and daily allowance never becomes negative", () => {
  const start = new Date(2026, 8, 10).getTime();
  const end = new Date(2026, 8, 20).getTime();
  assert.deepEqual(budgetPeriod("custom", start, end, 3), { start, end });
  assert.equal(dailyBudgetCents(10000, 4000, new Date(2026, 8, 13).getTime(), new Date(2026, 8, 10).getTime()), 2000);
  assert.equal(dailyBudgetCents(10000, 12000, end, start), 0);
});
