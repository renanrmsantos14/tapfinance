import assert from "node:assert/strict";
import test from "node:test";
import { isNewerVersion } from "../src/services/updateService";

test("update comparison respects every numeric version component", () => {
  assert.equal(isNewerVersion("v1.1.5", "1.1.4"), true);
  assert.equal(isNewerVersion("v1.10.0", "1.9.9"), true);
  assert.equal(isNewerVersion("v1.1.4", "1.1.4"), false);
  assert.equal(isNewerVersion("v1.1.3", "1.1.4"), false);
});

test("update comparison accepts beta installations without downgrading to an older stable release", () => {
  assert.equal(isNewerVersion("v1.1.8", "1.2.0-beta.5"), false);
  assert.equal(isNewerVersion("v1.2.0", "1.2.0-beta.5"), true);
  assert.equal(isNewerVersion("v1.2.0-beta.5", "1.2.0-beta.4"), true);
  assert.equal(isNewerVersion("v1.2.0-beta.10", "1.2.0-beta.9"), true);
  assert.equal(isNewerVersion("v1.2.0-beta.5", "1.2.0"), false);
});

test("semantic prerelease ordering ignores build metadata and rejects malformed versions", () => {
  const versions = ["1.2.0-alpha", "1.2.0-alpha.1", "1.2.0-alpha.beta", "1.2.0-beta", "1.2.0-beta.2", "1.2.0-beta.11", "1.2.0-rc.1", "1.2.0"];
  for (let i = 1; i < versions.length; i += 1) {
    assert.equal(isNewerVersion(versions[i], versions[i - 1]), true);
    assert.equal(isNewerVersion(versions[i - 1], versions[i]), false);
  }
  assert.equal(isNewerVersion("1.2.0-beta.5+build.2", "1.2.0-beta.5+build.1"), false);
  for (const invalid of ["1.2", "1.2.0-beta..5", "1.2.0-beta.05", "01.2.0", "garbage"]) assert.throws(() => isNewerVersion(invalid, "1.2.0"), /versão inválido/);
});
