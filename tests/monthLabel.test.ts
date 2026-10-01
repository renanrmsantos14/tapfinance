import assert from "node:assert/strict";
import test from "node:test";
import { formatMonthLabel } from "../src/utils/dates";

test("navigable month labels distinguish the same month in different years", () => {
  assert.equal(formatMonthLabel(new Date(2025, 11, 1).getTime(), true), "DEZEMBRO DE 2025");
  assert.equal(formatMonthLabel(new Date(2026, 11, 1).getTime(), true), "DEZEMBRO DE 2026");
  assert.equal(formatMonthLabel(new Date(2027, 0, 1).getTime(), true), "JANEIRO DE 2027");
  assert.equal(formatMonthLabel(new Date(2026, 8, 1).getTime()), "SETEMBRO");
});
