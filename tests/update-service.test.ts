import assert from "node:assert/strict";
import test from "node:test";
import { isNewerVersion } from "../src/services/updateService";

test("update comparison respects every numeric version component", () => {
  assert.equal(isNewerVersion("v1.1.5", "1.1.4"), true);
  assert.equal(isNewerVersion("v1.10.0", "1.9.9"), true);
  assert.equal(isNewerVersion("v1.1.4", "1.1.4"), false);
  assert.equal(isNewerVersion("v1.1.3", "1.1.4"), false);
});
