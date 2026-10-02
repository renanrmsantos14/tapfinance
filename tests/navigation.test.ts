import assert from "node:assert/strict";
import test from "node:test";
import { navigationSection } from "../src/utils/navigation";

test("navigation keeps parent sections selected on detail screens", () => {
  for (const path of ["/", "/quick-entry", "/balance-correction"]) assert.equal(navigationSection(path), "/");
  for (const path of ["/transactions", "/transaction/123"]) assert.equal(navigationSection(path), "/transactions");
  assert.equal(navigationSection("/categories"), "/categories");
  for (const path of ["/budgets", "/budget/123"]) assert.equal(navigationSection(path), "/budgets");
  for (const path of ["/more", "/settings", "/calendar", "/insights", "/activity", "/transfer", "/collection/accounts", "/collection/categories", "/collection/goals", "/collection/loans", "/collection/schedules", "/tracker/goals/123"]) assert.equal(navigationSection(path), "/more");
});
